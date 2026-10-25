"""
CipherVault 2.0 - Modern AES-256-GCM Cryptographic Engine.

Implements NIST SP 800-38D AES-GCM authenticated encryption and NIST SP 800-38F
AES Key Wrap (AES-KW) envelope encryption for binary files.
"""

import os
import secrets
from typing import Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.keywrap import aes_key_wrap, aes_key_unwrap, InvalidUnwrap

from .container import VaultContainer, DEFAULT_KDF_ITERATIONS, FORMAT_VERSION


class CryptographicIntegrityError(ValueError):
    """Raised when ciphertext tampering, wrong key, or authentication tag verification fails."""
    pass


class VaultCryptoEngine:
    """
    Production-grade AES-256-GCM file encryption and decryption engine.
    """

    @staticmethod
    def derive_kek(master_password: str, salt: bytes, iterations: int = DEFAULT_KDF_ITERATIONS) -> bytes:
        """
        Derives a 256-bit Key Encryption Key (KEK) from master password and salt
        using PBKDF2-HMAC-SHA256.
        """
        if not isinstance(master_password, str):
            raise TypeError("Master password must be a string.")
        if len(master_password) == 0:
            raise ValueError("Master password cannot be empty.")
        if len(salt) != 16:
            raise ValueError(f"Salt must be exactly 16 bytes, got {len(salt)}.")

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit KEK
            salt=salt,
            iterations=iterations,
        )
        return kdf.derive(master_password.encode("utf-8"))

    @classmethod
    def encrypt_bytes(
        cls,
        data: bytes,
        master_password: str,
        iterations: int = DEFAULT_KDF_ITERATIONS
    ) -> VaultContainer:
        """
        Encrypts arbitrary binary file data into a VaultContainer.

        Workflow:
        1. Generate random 16-byte salt and derive 256-bit KEK via PBKDF2.
        2. Generate ephemeral 256-bit File Encryption Key (FEK).
        3. Wrap FEK with KEK using AES-KW (produces 40-byte wrapped key).
        4. Generate unique 96-bit (12-byte) IV.
        5. Encrypt payload using AES-256-GCM.
        6. Package into VaultContainer.
        """
        if not isinstance(data, (bytes, bytearray)):
            raise TypeError("Data to encrypt must be binary bytes.")

        # 1. Random salt & KEK derivation
        salt = secrets.token_bytes(16)
        kek = cls.derive_kek(master_password, salt, iterations)

        # 2. Ephemeral FEK
        fek = secrets.token_bytes(32)

        # 3. Key Wrapping (AES-KW)
        wrapped_fek = aes_key_wrap(kek, fek)

        # 4. Unique Nonce
        nonce = secrets.token_bytes(12)

        # 5. Additional Authenticated Data (AAD)
        # Binds format version and salt to prevent header alteration
        aad = b"CVLT" + bytes([FORMAT_VERSION]) + salt

        # 6. AES-GCM Encryption
        aesgcm = AESGCM(fek)
        # In cryptography library, AESGCM.encrypt appends 16-byte tag to ciphertext
        gcm_output = aesgcm.encrypt(nonce, bytes(data), aad)
        ciphertext = gcm_output[:-16]
        auth_tag = gcm_output[-16:]

        return VaultContainer(
            version=FORMAT_VERSION,
            salt=salt,
            iterations=iterations,
            wrapped_fek=wrapped_fek,
            nonce=nonce,
            auth_tag=auth_tag,
            ciphertext=ciphertext
        )

    @classmethod
    def decrypt_container(cls, container: VaultContainer, master_password: str) -> bytes:
        """
        Decrypts a VaultContainer back to original binary bytes using master password.
        Guarantees:
        - If password is wrong: raises CryptographicIntegrityError
        - If ciphertext or tag is modified: raises CryptographicIntegrityError
        - Releases zero plaintext bytes on failure.
        """
        # 1. Derive KEK
        try:
            kek = cls.derive_kek(master_password, container.salt, container.iterations)
        except Exception as exc:
            raise CryptographicIntegrityError(f"Key derivation failed: {exc}") from exc

        # 2. Unwrap FEK
        try:
            fek = aes_key_unwrap(kek, container.wrapped_fek)
        except InvalidUnwrap:
            raise CryptographicIntegrityError(
                "Decryption failed: Incorrect master password or corrupted key envelope."
            )
        except Exception as exc:
            raise CryptographicIntegrityError(f"Envelope unwrap failed: {exc}") from exc

        # 3. Reconstruct AAD
        aad = b"CVLT" + bytes([container.version]) + container.salt

        # 4. Authenticated AES-GCM Decryption
        try:
            aesgcm = AESGCM(fek)
            # Reassemble ciphertext + tag for cryptography library
            full_payload = container.ciphertext + container.auth_tag
            decrypted_bytes = aesgcm.decrypt(container.nonce, full_payload, aad)
            return decrypted_bytes
        except Exception:
            raise CryptographicIntegrityError(
                "Decryption failed: Authentication tag verification failed. "
                "The ciphertext has been modified or corrupted."
            )
