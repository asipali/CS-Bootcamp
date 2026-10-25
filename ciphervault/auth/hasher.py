"""
CipherVault 2.0 - Argon2id Password Hashing & Verification.

Follows OWASP Password Storage Guidelines (Argon2id with memory-hard parameters).
Guarantees constant-time verification and zero plaintext password persistence.
"""

from typing import Tuple

try:
    from argon2 import PasswordHasher, Type
    from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
    _ARGON2_AVAILABLE = True
except ImportError:
    _ARGON2_AVAILABLE = False


class Argon2PasswordHasher:
    """
    Standard-compliant Argon2id password hasher.

    Parameters conform to OWASP ASVS Level 2 recommendations:
    - Algorithm: Argon2id
    - Time cost: 2 iterations
    - Memory cost: 65,536 KiB (64 MiB)
    - Parallelism: 4 threads
    - Hash length: 32 bytes (256 bits)
    """

    def __init__(self, time_cost: int = 2, memory_cost: int = 65536, parallelism: int = 4) -> None:
        if not _ARGON2_AVAILABLE:
            raise RuntimeError(
                "CRITICAL SECURITY DEPENDENCY MISSING: 'argon2-cffi' is required for password hashing. "
                "Silent fallback to plaintext or weak hashing is strictly prohibited. "
                "Install with: pip install argon2-cffi"
            )
        self.time_cost = time_cost
        self.memory_cost = memory_cost
        self.parallelism = parallelism
        self._hasher = PasswordHasher(
            time_cost=self.time_cost,
            memory_cost=self.memory_cost,
            parallelism=self.parallelism,
            hash_len=32,
            type=Type.ID
        )

    def hash_password(self, password: str) -> str:
        """
        Hashes password with Argon2id using a fresh CSPRNG salt.
        Never strips whitespace from the password.
        """
        if not isinstance(password, str):
            raise TypeError("Password must be a string.")
        if len(password) == 0:
            raise ValueError("Password cannot be empty.")
        return self._hasher.hash(password)

    def verify_password(self, stored_hash: str, candidate_password: str) -> Tuple[bool, bool]:
        """
        Verifies candidate password against the stored Argon2id hash.
        Returns:
            (is_valid: bool, needs_rehash: bool)
        """
        if not isinstance(candidate_password, str) or not isinstance(stored_hash, str):
            return False, False

        try:
            is_valid = self._hasher.verify(stored_hash, candidate_password)
            needs_rehash = self._hasher.check_needs_rehash(stored_hash)
            return is_valid, needs_rehash
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False, False
        except Exception:
            # Prevent timing or exception leakages
            return False, False

    @staticmethod
    def is_argon2_hash(hash_candidate: str) -> bool:
        """
        Checks whether a string is an Argon2 encoded hash.
        """
        if not isinstance(hash_candidate, str):
            return False
        return hash_candidate.startswith("$argon2id$") or hash_candidate.startswith("$argon2i$")
