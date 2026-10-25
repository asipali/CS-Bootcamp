"""
Automated Cryptographic & Storage Tests for Secure File Vault (Module B).
"""

import os
import pytest
from ciphervault.vault.container import VaultContainer, ContainerFormatError, MAGIC_BYTES, FORMAT_VERSION
from ciphervault.vault.engine import VaultCryptoEngine, CryptographicIntegrityError
from ciphervault.vault.storage import LocalVaultStorage, StorageSecurityError, StorageCapacityError


def test_vault_roundtrip_binary_payload():
    """Verify AES-256-GCM roundtrip for simulated PDF/binary data."""
    # Simulated binary with non-ASCII bytes
    original_bytes = bytes([i % 256 for i in range(1024 * 64)])  # 64 KB binary
    password = "MasterVaultPassword#2026!"

    container = VaultCryptoEngine.encrypt_bytes(original_bytes, password)
    serialized = container.serialize()

    # Re-parse container from raw serialized bytes
    parsed_container = VaultContainer.deserialize(serialized)
    decrypted_bytes = VaultCryptoEngine.decrypt_container(parsed_container, password)

    assert decrypted_bytes == original_bytes


def test_vault_roundtrip_empty_file():
    """Verify encryption and decryption of 0-byte empty file."""
    empty_bytes = b""
    password = "Password123"

    container = VaultCryptoEngine.encrypt_bytes(empty_bytes, password)
    serialized = container.serialize()

    parsed = VaultContainer.deserialize(serialized)
    decrypted = VaultCryptoEngine.decrypt_container(parsed, password)
    assert decrypted == b""


def test_vault_rejects_wrong_password():
    """Incorrect master password fails decryption and releases zero plaintext."""
    data = b"Highly confidential intelligence report."
    correct_password = "CorrectPassword123!"
    wrong_password = "WrongPassword123!"

    container = VaultCryptoEngine.encrypt_bytes(data, correct_password)
    with pytest.raises(CryptographicIntegrityError) as exc_info:
        VaultCryptoEngine.decrypt_container(container, wrong_password)
    assert "Decryption failed" in str(exc_info.value)


def test_vault_rejects_tampered_ciphertext():
    """Modifying even 1 bit in ciphertext causes authentication tag check failure."""
    data = b"Payment authorization: Send $1,000 to Bob."
    password = "SecretPassword"

    container = VaultCryptoEngine.encrypt_bytes(data, password)

    # Flip 1 byte in the ciphertext payload
    tampered_bytes = bytearray(container.ciphertext)
    tampered_bytes[5] ^= 0x01  # Flip single bit

    tampered_container = VaultContainer(
        version=container.version,
        salt=container.salt,
        iterations=container.iterations,
        wrapped_fek=container.wrapped_fek,
        nonce=container.nonce,
        auth_tag=container.auth_tag,
        ciphertext=bytes(tampered_bytes)
    )

    with pytest.raises(CryptographicIntegrityError) as exc_info:
        VaultCryptoEngine.decrypt_container(tampered_container, password)
    assert "Authentication tag verification failed" in str(exc_info.value)


def test_vault_rejects_tampered_auth_tag():
    """Corrupting the 16-byte GCM authentication tag causes immediate failure."""
    data = b"Confidential document."
    password = "SecretPassword"

    container = VaultCryptoEngine.encrypt_bytes(data, password)

    # Alter authentication tag
    bad_tag = bytearray(container.auth_tag)
    bad_tag[0] ^= 0xFF

    tampered_container = VaultContainer(
        version=container.version,
        salt=container.salt,
        iterations=container.iterations,
        wrapped_fek=container.wrapped_fek,
        nonce=container.nonce,
        auth_tag=bytes(bad_tag),
        ciphertext=container.ciphertext
    )

    with pytest.raises(CryptographicIntegrityError):
        VaultCryptoEngine.decrypt_container(tampered_container, password)


def test_vault_rejects_tampered_nonce():
    """Modifying the 12-byte initialization vector fails authenticated decryption."""
    data = b"Data requiring integrity."
    password = "SecretPassword"

    container = VaultCryptoEngine.encrypt_bytes(data, password)

    tampered_nonce = bytearray(container.nonce)
    tampered_nonce[0] ^= 0x01

    tampered_container = VaultContainer(
        version=container.version,
        salt=container.salt,
        iterations=container.iterations,
        wrapped_fek=container.wrapped_fek,
        nonce=bytes(tampered_nonce),
        auth_tag=container.auth_tag,
        ciphertext=container.ciphertext
    )

    with pytest.raises(CryptographicIntegrityError):
        VaultCryptoEngine.decrypt_container(tampered_container, password)


def test_vault_rejects_truncated_container():
    """Containers smaller than 93 bytes are rejected by the deserializer."""
    too_short = b"CVLT\x01SHORT_DATA"
    with pytest.raises(ContainerFormatError) as exc_info:
        VaultContainer.deserialize(too_short)
    assert "truncated" in str(exc_info.value)


def test_vault_rejects_invalid_magic_bytes():
    """Files lacking 'CVLT' header are rejected."""
    bad_magic = b"BAAD" + bytes(90)
    with pytest.raises(ContainerFormatError) as exc_info:
        VaultContainer.deserialize(bad_magic)
    assert "Invalid container magic" in str(exc_info.value)


def test_vault_rejects_unsupported_version():
    """Container with version != 1 is rejected."""
    bad_version = b"CVLT\x02" + bytes(89)
    with pytest.raises(ContainerFormatError) as exc_info:
        VaultContainer.deserialize(bad_version)
    assert "Unsupported container version" in str(exc_info.value)


# --- Storage Tests ---

def test_storage_save_read_delete(tmp_path):
    """Verify local storage saves, reads, and deletes encrypted blobs under UUIDs."""
    storage_dir = tmp_path / "vault_storage"
    storage = LocalVaultStorage(base_dir=str(storage_dir))

    payload = b"Encrypted .cvault container bytes"
    storage_id = storage.save_file(payload)

    # UUID verification
    import uuid
    uuid.UUID(storage_id)

    # Read back
    retrieved = storage.read_file(storage_id)
    assert retrieved == payload

    # Delete
    assert storage.delete_file(storage_id) is True
    assert storage.delete_file(storage_id) is False  # Already deleted

    with pytest.raises(FileNotFoundError):
        storage.read_file(storage_id)


def test_storage_rejects_path_traversal(tmp_path):
    """Storage rejects non-UUID and path traversal attempts."""
    storage = LocalVaultStorage(base_dir=str(tmp_path))

    with pytest.raises(StorageSecurityError):
        storage.read_file("../../etc/passwd")

    with pytest.raises(StorageSecurityError):
        storage.read_file("not-a-uuid")


def test_storage_enforces_size_limit(tmp_path):
    """Storage rejects uploads exceeding max_file_size_bytes."""
    storage = LocalVaultStorage(base_dir=str(tmp_path), max_file_size_bytes=100)

    with pytest.raises(StorageCapacityError):
        storage.save_file(b"A" * 101)
