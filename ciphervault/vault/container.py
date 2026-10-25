"""
CipherVault 2.0 - Versioned Encrypted Container Format (.cvault v1).

Binary Layout Specification:
Offset  Length  Field          Description
0       4       MAGIC_BYTES    ASCII 'CVLT' (0x43 0x56 0x4C 0x54)
4       1       VERSION        Container format version (0x01)
5       16      KDF_SALT       128-bit salt for PBKDF2 Master Key derivation
21      4       KDF_ITERS      uint32 BE: PBKDF2 iteration count (default 600,000)
25      40      WRAPPED_FEK    NIST SP 800-38F AES-KW wrapped 256-bit FEK (40 bytes)
65      12      NONCE          96-bit (12-byte) AES-GCM Initialization Vector
77      16      AUTH_TAG       128-bit (16-byte) AES-GCM Authentication Tag
93      N       CIPHERTEXT     AES-256-GCM encrypted file payload bytes

Total Header Length: 93 bytes. Minimum valid container size: 93 bytes (0-byte payload).
"""

import struct
from dataclasses import dataclass
from typing import Tuple

MAGIC_BYTES: bytes = b"CVLT"
FORMAT_VERSION: int = 1
MIN_HEADER_SIZE: int = 93
DEFAULT_KDF_ITERATIONS: int = 600_000


class ContainerFormatError(ValueError):
    """Raised when an encrypted container violates binary format specifications."""
    pass


@dataclass(frozen=True)
class VaultContainer:
    version: int
    salt: bytes
    iterations: int
    wrapped_fek: bytes
    nonce: bytes
    auth_tag: bytes
    ciphertext: bytes

    @property
    def header_bytes(self) -> bytes:
        """
        Returns the 93-byte binary header.
        Can be used as Additional Authenticated Data (AAD) to cryptographically
        bind container metadata to the ciphertext.
        """
        return (
            MAGIC_BYTES +
            struct.pack(">B", self.version) +
            self.salt +
            struct.pack(">I", self.iterations) +
            self.wrapped_fek +
            self.nonce +
            self.auth_tag
        )

    def serialize(self) -> bytes:
        """Serializes the container to a single binary byte string."""
        return self.header_bytes + self.ciphertext

    @classmethod
    def deserialize(cls, data: bytes) -> "VaultContainer":
        """
        Parses and validates a binary byte stream into a VaultContainer object.
        Rejects corrupted, truncated, or invalid format files.
        """
        if not isinstance(data, (bytes, bytearray)):
            raise ContainerFormatError(f"Expected binary bytes, got {type(data).__name__}.")

        if len(data) < MIN_HEADER_SIZE:
            raise ContainerFormatError(
                f"Container truncated: length is {len(data)} bytes, expected at least {MIN_HEADER_SIZE} bytes."
            )

        magic = data[0:4]
        if magic != MAGIC_BYTES:
            raise ContainerFormatError(
                f"Invalid container magic: expected {MAGIC_BYTES.decode('ascii')}, got {repr(magic)}."
            )

        version = data[4]
        if version != FORMAT_VERSION:
            raise ContainerFormatError(
                f"Unsupported container version: {version}. This engine supports version {FORMAT_VERSION} only."
            )

        salt = bytes(data[5:21])  # 16 bytes
        iterations = struct.unpack(">I", data[21:25])[0]
        if iterations < 100_000:
            raise ContainerFormatError(f"Insecure or invalid PBKDF2 iteration count: {iterations}.")

        wrapped_fek = bytes(data[25:65])  # 40 bytes
        nonce = bytes(data[65:77])        # 12 bytes
        auth_tag = bytes(data[77:93])     # 16 bytes
        ciphertext = bytes(data[93:])     # Remaining bytes

        return cls(
            version=version,
            salt=salt,
            iterations=iterations,
            wrapped_fek=wrapped_fek,
            nonce=nonce,
            auth_tag=auth_tag,
            ciphertext=ciphertext
        )
