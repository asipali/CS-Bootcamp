"""
Phase 3 - Comprehensive End-to-End Integration & Multi-Format Verification Suite.

Tests complete user workflows, multiple real-world file formats (PDF, DOCX, TXT, PNG, BIN),
byte-level integrity preservation, and failure/recovery paths.
"""

import os
import hashlib
import tempfile
import pytest

from ciphervault.auth.user_store import UserStore, AuthenticationError
from ciphervault.vault.container import VaultContainer, ContainerFormatError
from ciphervault.vault.engine import VaultCryptoEngine, CryptographicIntegrityError
from ciphervault.vault.storage import LocalVaultStorage, StorageCapacityError, StorageSecurityError


@pytest.fixture
def e2e_env(tmp_path):
    """Sets up an isolated database and storage directory."""
    db_file = tmp_path / "e2e_users.json"
    storage_dir = tmp_path / "e2e_storage"
    store = UserStore(db_path=str(db_file), require_gmail=True)
    storage = LocalVaultStorage(base_dir=str(storage_dir), max_file_size_bytes=5 * 1024 * 1024) # 5 MB test limit
    return {"store": store, "storage": storage, "tmp_path": tmp_path}


def test_e2e_multi_format_roundtrip_verification(e2e_env):
    """
    Verifies that various file types (TXT, PDF, DOCX, PNG, Binary, Empty)
    can be encrypted, stored, retrieved, and decrypted back to the exact original SHA-256 hash.
    """
    store = e2e_env["store"]
    storage = e2e_env["storage"]
    master_key = "E2E_Secure_Vault_Key_2026!"

    # 1. Register and authenticate user
    user = store.register_user(
        username="integration_user",
        email="integration@gmail.com",
        mobile="9876543210",
        password=master_key
    )
    auth_user = store.authenticate_user("integration_user", master_key)
    assert auth_user.username == "integration_user"

    # Define test payloads representing real-world file formats
    test_files = {
        "document.txt": b"Confidential memo text content for CipherVault 2.0 security test.\nLine 2.",
        "sample.pdf": b"%PDF-1.7\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" + bytes([i % 256 for i in range(4096)] * 4),
        "archive.docx": b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00" + b"[Content_Types].xml" + bytes(2048),
        "graphic.png": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + bytes([0xAA, 0xBB, 0xCC, 0xDD] * 1024),
        "executable.bin": bytes([x % 256 for x in range(32768)]),  # 32 KB arbitrary binary
        "empty_file.dat": b""  # 0-byte edge case
    }

    stored_records = {}

    # Encrypt and persist all files
    for filename, original_bytes in test_files.items():
        original_sha256 = hashlib.sha256(original_bytes).hexdigest()

        # Client-side encryption
        container = VaultCryptoEngine.encrypt_bytes(original_bytes, master_key)
        serialized_blob = container.serialize()

        # Server storage
        storage_id = storage.save_file(serialized_blob)
        stored_records[filename] = {
            "storage_id": storage_id,
            "original_sha256": original_sha256,
            "original_len": len(original_bytes)
        }

    # Retrieve, decrypt, and verify exact byte equality
    for filename, meta in stored_records.items():
        # Retrieve blob from storage
        retrieved_blob = storage.read_file(meta["storage_id"])

        # Unpack container and decrypt
        parsed_container = VaultContainer.deserialize(retrieved_blob)
        decrypted_bytes = VaultCryptoEngine.decrypt_container(parsed_container, master_key)

        # Check lengths and cryptographic hashes
        assert len(decrypted_bytes) == meta["original_len"]
        decrypted_sha256 = hashlib.sha256(decrypted_bytes).hexdigest()
        assert decrypted_sha256 == meta["original_sha256"], f"Byte mismatch for {filename}!"


def test_e2e_tamper_and_wrong_key_isolation(e2e_env):
    """
    Verifies that tampered payloads and unauthorized keys are rejected,
    and deletion removes disk blobs cleanly.
    """
    storage = e2e_env["storage"]
    master_key = "Correct_Key_12345"
    wrong_key = "Attacker_Wrong_Key"

    original_data = b"Sensitive executive compensation data."
    container = VaultCryptoEngine.encrypt_bytes(original_data, master_key)
    serialized = container.serialize()

    storage_id = storage.save_file(serialized)

    # 1. Decrypt with wrong key -> Rejection
    parsed = VaultContainer.deserialize(storage.read_file(storage_id))
    with pytest.raises(CryptographicIntegrityError):
        VaultCryptoEngine.decrypt_container(parsed, wrong_key)

    # 2. Tamper with stored file on disk
    raw_stored = bytearray(storage.read_file(storage_id))
    raw_stored[-1] ^= 0x01  # Alter last byte of ciphertext
    # Re-save tampered data directly
    with open(storage._resolve_safe_path(storage_id), "wb") as f:
        f.write(raw_stored)

    tampered_parsed = VaultContainer.deserialize(storage.read_file(storage_id))
    with pytest.raises(CryptographicIntegrityError) as exc_info:
        VaultCryptoEngine.decrypt_container(tampered_parsed, master_key)
    assert "Authentication tag verification failed" in str(exc_info.value)

    # 3. Clean deletion
    assert storage.delete_file(storage_id) is True
    with pytest.raises(FileNotFoundError):
        storage.read_file(storage_id)


def test_e2e_storage_boundary_failures(e2e_env):
    """Verifies storage rejects oversized uploads and invalid path traversal."""
    storage = e2e_env["storage"]

    # Exceed configured 5 MB limit
    oversized = b"X" * (5 * 1024 * 1024 + 1)
    with pytest.raises(StorageCapacityError):
        storage.save_file(oversized)

    # Path traversal
    with pytest.raises(StorageSecurityError):
        storage.read_file("../../passwords.txt")
