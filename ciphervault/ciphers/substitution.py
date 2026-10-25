"""
CipherVault 2.0 - Random Monoalphabetic Substitution Cipher.

EDUCATIONAL NOTICE:
Monoalphabetic substitution preserves natural language letter frequency and digram
distributions, making it completely vulnerable to frequency analysis and known-plaintext
cryptanalysis. It is provided strictly for educational laboratory experiments.
"""

from typing import Dict, List, Any
from ..charset import CHARSET, CHARSET_LENGTH, CHARSET_SET, CHAR_TO_INDEX


class InvalidSubstitutionKeyError(ValueError):
    """Raised when a substitution key violates permutation invariants."""
    pass


class SubstitutionCipher:
    """
    Implements monoalphabetic substitution over the 92-character CHARSET.

    A valid substitution key MUST be an exact permutation of the 92-character CHARSET.
    No characters may be omitted, duplicated, or introduced.
    Whitespace (including leading/trailing space) is an integral part of the key.
    """

    def __init__(self, key: str) -> None:
        self.key: str = self.validate_key(key)
        # Build direct mapping tables:
        # Encrypt: CHARSET[i] -> key[i]
        # Decrypt: key[i] -> CHARSET[i]
        self._encrypt_map: Dict[str, str] = {orig: subst for orig, subst in zip(CHARSET, self.key)}
        self._decrypt_map: Dict[str, str] = {subst: orig for orig, subst in zip(CHARSET, self.key)}

    @classmethod
    def validate_key(cls, key: str) -> str:
        """
        Validates that `key` is an exact bijective permutation of CHARSET.

        CRITICAL SECURITY & CORRECTNESS RULE:
        Never call `.strip()` on the key, as space is a valid character at index 0
        or elsewhere in the alphabet.
        """
        if not isinstance(key, str):
            raise InvalidSubstitutionKeyError(
                f"Key must be a string, received type {type(key).__name__}."
            )

        if len(key) != CHARSET_LENGTH:
            raise InvalidSubstitutionKeyError(
                f"Invalid key length: {len(key)}. Must be exactly {CHARSET_LENGTH} characters."
            )

        key_set = set(key)
        if len(key_set) != CHARSET_LENGTH:
            duplicates = len(key) - len(key_set)
            raise InvalidSubstitutionKeyError(
                f"Key contains {duplicates} duplicate character(s). All characters must be unique."
            )

        missing_chars = CHARSET_SET - key_set
        if missing_chars:
            raise InvalidSubstitutionKeyError(
                f"Key is missing {len(missing_chars)} character(s) from CHARSET. "
                "The key must be an exact permutation of the alphabet."
            )

        extra_chars = key_set - CHARSET_SET
        if extra_chars:
            raise InvalidSubstitutionKeyError(
                f"Key contains {len(extra_chars)} character(s) not in CHARSET. "
                "Only valid CHARSET characters are permitted."
            )

        return key

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypts plaintext by substituting each character according to the permutation key.
        Unsupported characters pass through unchanged.
        """
        if not isinstance(plaintext, str):
            raise TypeError("Plaintext must be a string.")

        return "".join(self._encrypt_map.get(char, char) for char in plaintext)

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypts ciphertext by inverting the substitution mapping.
        Unsupported characters pass through unchanged.
        """
        if not isinstance(ciphertext, str):
            raise TypeError("Ciphertext must be a string.")

        return "".join(self._decrypt_map.get(char, char) for char in ciphertext)

    def get_transformation_steps(self, text: str) -> List[Dict[str, Any]]:
        """
        Returns step-by-step substitution mappings for the educational visualizer.
        """
        steps: List[Dict[str, Any]] = []
        for idx, char in enumerate(text):
            if char in self._encrypt_map:
                mapped_char = self._encrypt_map[char]
                steps.append({
                    "index": idx,
                    "input_char": char,
                    "alphabet_index": CHAR_TO_INDEX[char],
                    "output_char": mapped_char,
                    "supported": True
                })
            else:
                steps.append({
                    "index": idx,
                    "input_char": char,
                    "alphabet_index": -1,
                    "output_char": char,
                    "supported": False
                })
        return steps
