"""
CipherVault 2.0 - Secure JSON User Persistence & Legacy Migration.

Provides safe local JSON-based user storage for the reference implementation.
Features:
- Argon2id password hashing on all write operations.
- Atomic file writes (tempfile + atomic replace) preventing database corruption.
- Safe legacy migration: detects unhashed legacy passwords on login and upgrades them to Argon2id.
- Test isolation: storage path is fully configurable (defaults to 'users_db.json').
- Clear separation: password hashes are never exposed in standard user summaries.
"""

import os
import json
import tempfile
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict

from .hasher import Argon2PasswordHasher
from .validator import UserValidator, ValidationError


class StorageError(IOError):
    """Raised when persistent storage fails."""
    pass


class AuthenticationError(Exception):
    """Raised on authentication failures (invalid username or password)."""
    pass


@dataclass
class UserRecord:
    username: str
    email: str
    mobile: str
    password_hash: str
    created_at: float
    updated_at: float
    is_migrated: bool = False

    def to_safe_dict(self) -> Dict[str, Any]:
        """Returns user data without exposing password hash."""
        return {
            "username": self.username,
            "email": self.email,
            "mobile": self.mobile,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class UserStore:
    """
    Thread-safe / process-safe JSON user storage with Argon2id password management.
    """

    def __init__(self, db_path: str = "users_db.json", require_gmail: bool = False) -> None:
        self.db_path: str = db_path
        self.require_gmail: bool = require_gmail
        self._hasher = Argon2PasswordHasher()
        self._ensure_storage_exists()

    def _ensure_storage_exists(self) -> None:
        """Ensures the storage file exists and contains valid JSON structure."""
        if not os.path.exists(self.db_path):
            self._save_raw_data({})
        else:
            # Validate existing file content
            self._load_raw_data()

    def _load_raw_data(self) -> Dict[str, Dict[str, Any]]:
        """Loads and parses the JSON user database."""
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except json.JSONDecodeError as exc:
            raise StorageError(f"Database file '{self.db_path}' contains corrupted JSON.") from exc
        except OSError as exc:
            raise StorageError(f"Failed to read database file '{self.db_path}': {exc}") from exc

    def _save_raw_data(self, data: Dict[str, Dict[str, Any]]) -> None:
        """
        Atomically saves data to disk using temporary file and atomic replace.
        Prevents partial writes and database corruption.
        """
        dir_name = os.path.dirname(os.path.abspath(self.db_path))
        os.makedirs(dir_name, exist_ok=True)

        try:
            with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False, encoding="utf-8") as tf:
                temp_name = tf.name
                json.dump(data, tf, indent=2)
                tf.flush()
                os.fsync(tf.fileno())

            # Atomic replacement
            os.replace(temp_name, self.db_path)
        except OSError as exc:
            if "temp_name" in locals() and os.path.exists(temp_name):
                try:
                    os.remove(temp_name)
                except OSError:
                    pass
            raise StorageError(f"Atomic write to '{self.db_path}' failed: {exc}") from exc

    def register_user(self, username: str, email: str, mobile: str, password: str) -> UserRecord:
        """
        Registers a new user with Argon2id hashed password.
        Rejects duplicates and invalid fields.
        """
        valid_username = UserValidator.validate_username(username)
        valid_email = UserValidator.validate_email(email, require_gmail=self.require_gmail)
        valid_mobile = UserValidator.validate_mobile(mobile)
        valid_password = UserValidator.validate_password(password)

        users = self._load_raw_data()

        # Check unique username
        if valid_username.lower() in [u.lower() for u in users.keys()]:
            raise ValidationError(f"Username '{valid_username}' is already registered.")

        # Check unique email
        for u_data in users.values():
            if u_data.get("email", "").lower() == valid_email.lower():
                raise ValidationError(f"Email '{valid_email}' is already associated with an account.")

        # Hash password before storage
        hashed = self._hasher.hash_password(valid_password)
        now = time.time()

        record = UserRecord(
            username=valid_username,
            email=valid_email,
            mobile=valid_mobile,
            password_hash=hashed,
            created_at=now,
            updated_at=now,
            is_migrated=True
        )

        users[valid_username] = asdict(record)
        self._save_raw_data(users)
        return record

    def authenticate_user(self, username: str, candidate_password: str) -> UserRecord:
        """
        Authenticates a user by username and candidate password.
        Supports safe on-the-fly legacy migration for unhashed passwords.
        """
        if not isinstance(username, str) or not isinstance(candidate_password, str):
            raise AuthenticationError("Invalid login credentials.")

        users = self._load_raw_data()
        clean_user = username.strip()

        # Case-insensitive lookup
        matched_key = None
        for key in users:
            if key.lower() == clean_user.lower():
                matched_key = key
                break

        if not matched_key:
            raise AuthenticationError("Invalid username or password.")

        user_data = users[matched_key]
        stored_hash = user_data.get("password_hash") or user_data.get("password", "")

        # Check if legacy plaintext password
        if not self._hasher.is_argon2_hash(stored_hash):
            # Legacy plaintext check
            if stored_hash == candidate_password:
                # Password verified! Upgrade to Argon2id immediately.
                upgraded_hash = self._hasher.hash_password(candidate_password)
                user_data["password_hash"] = upgraded_hash
                if "password" in user_data:
                    del user_data["password"]  # Erase plaintext
                user_data["updated_at"] = time.time()
                user_data["is_migrated"] = True
                users[matched_key] = user_data
                self._save_raw_data(users)
                return UserRecord(
                    username=user_data["username"],
                    email=user_data["email"],
                    mobile=user_data.get("mobile", ""),
                    password_hash=upgraded_hash,
                    created_at=user_data.get("created_at", time.time()),
                    updated_at=user_data["updated_at"],
                    is_migrated=True
                )
            else:
                raise AuthenticationError("Invalid username or password.")

        # Standard Argon2id verification
        is_valid, needs_rehash = self._hasher.verify_password(stored_hash, candidate_password)
        if not is_valid:
            raise AuthenticationError("Invalid username or password.")

        if needs_rehash:
            new_hash = self._hasher.hash_password(candidate_password)
            user_data["password_hash"] = new_hash
            user_data["updated_at"] = time.time()
            users[matched_key] = user_data
            self._save_raw_data(users)
            stored_hash = new_hash

        return UserRecord(
            username=user_data["username"],
            email=user_data["email"],
            mobile=user_data.get("mobile", ""),
            password_hash=stored_hash,
            created_at=user_data.get("created_at", time.time()),
            updated_at=user_data.get("updated_at", time.time()),
            is_migrated=user_data.get("is_migrated", True)
        )

    def get_user(self, username: str) -> Optional[UserRecord]:
        """Retrieves user record if exists."""
        users = self._load_raw_data()
        for key, data in users.items():
            if key.lower() == username.strip().lower():
                return UserRecord(
                    username=data["username"],
                    email=data["email"],
                    mobile=data.get("mobile", ""),
                    password_hash=data.get("password_hash", ""),
                    created_at=data.get("created_at", 0.0),
                    updated_at=data.get("updated_at", 0.0),
                    is_migrated=data.get("is_migrated", False)
                )
        return None

    def list_users(self) -> List[Dict[str, Any]]:
        """Returns safe list of all registered users without credentials."""
        users = self._load_raw_data()
        return [
            {
                "username": u["username"],
                "email": u["email"],
                "mobile": u.get("mobile", ""),
                "created_at": u.get("created_at", 0.0)
            }
            for u in users.values()
        ]
