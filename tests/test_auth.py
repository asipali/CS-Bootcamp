"""
Tests for Argon2id Authentication, Input Validation, and JSON Persistence.
"""

import json
import pytest
from ciphervault.auth.hasher import Argon2PasswordHasher
from ciphervault.auth.validator import UserValidator, ValidationError
from ciphervault.auth.user_store import UserStore, AuthenticationError, StorageError


# --- Password Hasher Tests ---

def test_argon2_hashing_and_verification():
    """Verify Argon2id produces valid hash and verifies candidate password."""
    hasher = Argon2PasswordHasher()
    pwd = "CorrectHorseBatteryStaple#2026"
    h = hasher.hash_password(pwd)
    assert h.startswith("$argon2id$")

    # Correct password verifies
    is_valid, _ = hasher.verify_password(h, pwd)
    assert is_valid is True

    # Wrong password fails
    is_invalid, _ = hasher.verify_password(h, "WrongPassword")
    assert is_invalid is False


def test_argon2_whitespace_preservation():
    """Verify passwords with leading/trailing spaces hash and verify accurately."""
    hasher = Argon2PasswordHasher()
    pwd_with_space = "  padded password  "
    h = hasher.hash_password(pwd_with_space)

    # Must verify with exact whitespace
    assert hasher.verify_password(h, pwd_with_space)[0] is True
    # Must fail without whitespace
    assert hasher.verify_password(h, "padded password")[0] is False


def test_argon2_rejects_empty_password():
    """Hasher rejects empty password strings."""
    hasher = Argon2PasswordHasher()
    with pytest.raises(ValueError):
        hasher.hash_password("")


# --- Input Validator Tests ---

def test_validator_username():
    """Test username length and character constraints."""
    assert UserValidator.validate_username("alice_99") == "alice_99"
    with pytest.raises(ValidationError):
        UserValidator.validate_username("ab")  # Too short (< 3)
    with pytest.raises(ValidationError):
        UserValidator.validate_username("a" * 31)  # Too long (> 30)
    with pytest.raises(ValidationError):
        UserValidator.validate_username("alice@home")  # Disallowed characters


def test_validator_email():
    """Test email syntax and Gmail enforcement."""
    assert UserValidator.validate_email("test@gmail.com", require_gmail=True) == "test@gmail.com"
    # Normalizes domain to lowercase
    assert UserValidator.validate_email("user@GMAIL.COM", require_gmail=True) == "user@gmail.com"

    # Rejection of non-gmail when required
    with pytest.raises(ValidationError):
        UserValidator.validate_email("user@yahoo.com", require_gmail=True)

    # Malformed email
    with pytest.raises(ValidationError):
        UserValidator.validate_email("invalid-email", require_gmail=False)


def test_validator_mobile():
    """Test 10-digit mobile number validation."""
    assert UserValidator.validate_mobile("9876543210") == "9876543210"
    with pytest.raises(ValidationError):
        UserValidator.validate_mobile("12345")  # Too short
    with pytest.raises(ValidationError):
        UserValidator.validate_mobile("987654321099")  # Too long
    with pytest.raises(ValidationError):
        UserValidator.validate_mobile("98765abcde")  # Non-numeric


def test_validator_password_length():
    """Test minimum password length enforcement."""
    assert UserValidator.validate_password("12345678") == "12345678"
    with pytest.raises(ValidationError):
        UserValidator.validate_password("1234567")  # 7 chars < 8


# --- User Store & Persistence Tests ---

def test_user_store_registration_and_login(isolated_user_store: UserStore):
    """Test complete registration and login workflow in isolated database."""
    reg = isolated_user_store.register_user(
        username="carol_dev",
        email="carol@gmail.com",
        mobile="9876543210",
        password="MySecretPassword123!"
    )
    assert reg.username == "carol_dev"
    assert reg.password_hash.startswith("$argon2id$")

    # Authenticate successfully
    auth = isolated_user_store.authenticate_user("carol_dev", "MySecretPassword123!")
    assert auth.username == "carol_dev"

    # Authenticate failure on wrong password
    with pytest.raises(AuthenticationError):
        isolated_user_store.authenticate_user("carol_dev", "BadPassword")

    # Authenticate failure on non-existent user
    with pytest.raises(AuthenticationError):
        isolated_user_store.authenticate_user("unknown_user", "MySecretPassword123!")


def test_user_store_duplicate_prevention(isolated_user_store: UserStore):
    """Test rejection of duplicate usernames and duplicate emails."""
    isolated_user_store.register_user(
        username="dave_dev",
        email="dave@gmail.com",
        mobile="1122334455",
        password="password123"
    )

    # Duplicate username (case-insensitive)
    with pytest.raises(ValidationError) as exc:
        isolated_user_store.register_user(
            username="DAVE_DEV",
            email="other@gmail.com",
            mobile="9988776655",
            password="password123"
        )
    assert "already registered" in str(exc.value)

    # Duplicate email (case-insensitive)
    with pytest.raises(ValidationError) as exc:
        isolated_user_store.register_user(
            username="different_name",
            email="DAVE@GMAIL.COM",
            mobile="9988776655",
            password="password123"
        )
    assert "already associated" in str(exc.value)


def test_user_store_legacy_password_migration(tmp_path):
    """
    Test safe on-the-fly migration of legacy plaintext password records.
    Upon successful login:
    1. Legacy plaintext password is confirmed.
    2. Password is rehashed using Argon2id.
    3. Plaintext 'password' key is deleted from disk.
    4. Database file on disk contains only Argon2id hash.
    """
    db_file = tmp_path / "legacy_migration_test.json"
    legacy_payload = {
        "old_user": {
            "username": "old_user",
            "email": "old@gmail.com",
            "mobile": "5555555555",
            "password": "legacy_plaintext_secret",
            "created_at": 1000.0,
            "updated_at": 1000.0
        }
    }
    with open(db_file, "w", encoding="utf-8") as f:
        json.dump(legacy_payload, f)

    store = UserStore(db_path=str(db_file))

    # Authenticate with legacy password
    migrated_user = store.authenticate_user("old_user", "legacy_plaintext_secret")
    assert migrated_user.username == "old_user"
    assert migrated_user.password_hash.startswith("$argon2id$")

    # Read disk JSON directly to verify plaintext was purged
    with open(db_file, "r", encoding="utf-8") as f:
        disk_data = json.load(f)

    record_on_disk = disk_data["old_user"]
    assert "password" not in record_on_disk, "CRITICAL: Plaintext password was not removed from disk!"
    assert record_on_disk["password_hash"].startswith("$argon2id$")
    assert record_on_disk["is_migrated"] is True


def test_user_store_corrupted_json_handling(tmp_path):
    """Corrupted JSON files trigger StorageError rather than unhandled crashes."""
    db_file = tmp_path / "corrupt.json"
    with open(db_file, "w", encoding="utf-8") as f:
        f.write("{ INVALID JSON DATA ---")

    with pytest.raises(StorageError):
        UserStore(db_path=str(db_file))
