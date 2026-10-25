"""
CipherVault 2.0 - Local Object Storage Abstraction.

Implements secure storage management for encrypted .cvault files:
- Server-generated UUID file identifiers (zero user-controlled filesystem paths).
- Path traversal prevention.
- Atomic file writing (tempfile + atomic replace + fsync).
- Strict configurable file size enforcement.
"""

import os
import uuid
import tempfile
from typing import Optional


class StorageSecurityError(PermissionError):
    """Raised on path traversal or unauthorized filesystem access attempts."""
    pass


class StorageCapacityError(ValueError):
    """Raised when an uploaded file exceeds the configured size limit."""
    pass


class LocalVaultStorage:
    """
    Local filesystem blob store implementing the secure storage abstraction.
    """

    DEFAULT_MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB

    def __init__(
        self,
        base_dir: str = "storage/vault",
        max_file_size_bytes: int = DEFAULT_MAX_FILE_SIZE_BYTES
    ) -> None:
        self.base_dir = os.path.abspath(base_dir)
        self.max_file_size_bytes = max_file_size_bytes
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_safe_path(self, storage_id: str) -> str:
        """
        Validates storage_id is a UUID and resolves absolute path strictly within base_dir.
        Prevents directory traversal attacks (e.g. '../', absolute paths).
        """
        try:
            # Validate UUID syntax strictly
            parsed_uuid = uuid.UUID(storage_id)
            canonical_id = str(parsed_uuid)
        except (ValueError, AttributeError):
            raise StorageSecurityError(f"Invalid storage identifier format: '{storage_id}'. Must be a valid UUID.")

        filename = f"{canonical_id}.cvault"
        full_path = os.path.abspath(os.path.join(self.base_dir, filename))

        # Enforce containment within base_dir
        if not full_path.startswith(self.base_dir + os.sep) and full_path != self.base_dir:
            raise StorageSecurityError("Path traversal violation detected.")

        return full_path

    def save_file(self, content_bytes: bytes) -> str:
        """
        Saves encrypted binary content under a newly generated UUIDv4.
        Returns the generated storage UUID string.
        """
        if not isinstance(content_bytes, (bytes, bytearray)):
            raise TypeError("Storage content must be binary bytes.")

        if len(content_bytes) > self.max_file_size_bytes:
            raise StorageCapacityError(
                f"File size {len(content_bytes)} bytes exceeds maximum allowed limit of {self.max_file_size_bytes} bytes."
            )

        storage_id = str(uuid.uuid4())
        target_path = self._resolve_safe_path(storage_id)

        # Atomic file write
        dir_name = os.path.dirname(target_path)
        with tempfile.NamedTemporaryFile("wb", dir=dir_name, delete=False) as tf:
            temp_name = tf.name
            tf.write(content_bytes)
            tf.flush()
            os.fsync(tf.fileno())

        os.replace(temp_name, target_path)
        return storage_id

    def read_file(self, storage_id: str) -> bytes:
        """Reads encrypted binary content for a given storage UUID."""
        target_path = self._resolve_safe_path(storage_id)
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Stored object '{storage_id}' not found.")

        with open(target_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_id: str) -> bool:
        """Safely removes an encrypted file from storage."""
        target_path = self._resolve_safe_path(storage_id)
        if os.path.exists(target_path):
            os.remove(target_path)
            return True
        return False
