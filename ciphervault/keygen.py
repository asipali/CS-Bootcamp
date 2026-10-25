"""
CipherVault 2.0 - Cryptographically Secure Key Generation.

Replaces legacy Python pseudo-random generators (random.shuffle, random.choice)
with standard library `secrets.SystemRandom` (operating-system entropy via CryptGenRandom/getrandom).
"""

import secrets
from typing import List
from .charset import CHARSET, CHARSET_LENGTH


class KeyGenerator:
    """
    Cryptographically secure key generator for classical educational ciphers
    and session/salt tokens.
    """

    def __init__(self) -> None:
        self._rng = secrets.SystemRandom()

    def generate_caesar_shift(self, min_shift: int = 1, max_shift: int = CHARSET_LENGTH - 1) -> int:
        """
        Generates a non-trivial rotational shift in [min_shift, max_shift].
        Defaults to [1, 91] so that shift % 92 != 0 (ensures non-identity cipher).
        """
        if min_shift >= max_shift or min_shift < 1 or max_shift >= CHARSET_LENGTH:
            raise ValueError(f"Invalid shift range: [{min_shift}, {max_shift}]")
        return self._rng.randint(min_shift, max_shift)

    def generate_substitution_key(self) -> str:
        """
        Generates a 92-character random substitution key as a strict bijective
        permutation of CHARSET using CSPRNG Fisher-Yates sampling.

        NOTE: Classical substitution keys are for educational demonstration only
        and do not provide modern cryptographic security.
        """
        char_list: List[str] = list(CHARSET)
        self._rng.shuffle(char_list)
        return "".join(char_list)

    def generate_shuffle_key(self, length: int) -> List[int]:
        """
        Generates a permutation shuffle key for a message of given length.
        Returns a list of unique indices [0 .. length - 1] in pseudo-random order.
        """
        if length <= 0:
            raise ValueError("Message length for shuffle key must be positive.")
        indices: List[int] = list(range(length))
        self._rng.shuffle(indices)
        return indices

    def generate_secure_salt(self, num_bytes: int = 16) -> str:
        """
        Generates a cryptographically secure random hexadecimal salt string.
        Intended for password hashing and key derivation.
        """
        if num_bytes < 16:
            raise ValueError("Salt length must be at least 16 bytes (128 bits).")
        return secrets.token_hex(num_bytes)


# Module-level singleton instance for convenience
keygen = KeyGenerator()
