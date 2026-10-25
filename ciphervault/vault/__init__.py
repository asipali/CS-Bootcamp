"""
CipherVault 2.0 - Secure File Vault Package.

Implements modern authenticated encryption (AES-256-GCM), versioned binary container
format (.cvault), key derivation (PBKDF2-HMAC-SHA256), and safe storage management.
"""

from .container import VaultContainer, ContainerFormatError, MAGIC_BYTES, FORMAT_VERSION
from .engine import VaultCryptoEngine, CryptographicIntegrityError
from .storage import LocalVaultStorage, StorageSecurityError

__all__ = [
    "VaultContainer",
    "ContainerFormatError",
    "MAGIC_BYTES",
    "FORMAT_VERSION",
    "VaultCryptoEngine",
    "CryptographicIntegrityError",
    "LocalVaultStorage",
    "StorageSecurityError",
]
