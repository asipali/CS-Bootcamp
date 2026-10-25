"""
CipherVault 2.0 - Modulo-92 Caesar Rotational Cipher.

EDUCATIONAL NOTICE:
The Caesar cipher is an ancient monoalphabetic substitution technique vulnerable
to trivial brute-force cryptanalysis (only 91 non-trivial keys exist) and
statistical frequency analysis. It is implemented strictly for educational
and historical study and must NEVER be used to protect confidential data.
"""

from typing import List, Dict, Any
from ..charset import CHARSET, CHARSET_LENGTH, CHAR_TO_INDEX, INDEX_TO_CHAR


class CaesarCipher:
    """
    Implements rotational shift encryption and decryption over the 92-character CHARSET.
    """

    def __init__(self, shift: int = 3) -> None:
        self.shift: int = int(shift)

    @property
    def normalized_shift(self) -> int:
        """
        Normalizes shift to the canonical range [0, 91].
        """
        return self.shift % CHARSET_LENGTH

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypts plaintext using rotational shift:
        C = (P + shift) mod 92 for characters in CHARSET.
        Unsupported characters pass through unchanged.
        """
        if not isinstance(plaintext, str):
            raise TypeError("Plaintext must be a string.")

        shift_norm = self.normalized_shift
        result: List[str] = []

        for char in plaintext:
            if char in CHAR_TO_INDEX:
                orig_idx = CHAR_TO_INDEX[char]
                new_idx = (orig_idx + shift_norm) % CHARSET_LENGTH
                result.append(INDEX_TO_CHAR[new_idx])
            else:
                # Documented policy: Pass through unsupported characters unchanged
                result.append(char)

        return "".join(result)

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypts ciphertext by inverting rotational shift:
        P = (C - shift) mod 92 for characters in CHARSET.
        Unsupported characters pass through unchanged.
        """
        if not isinstance(ciphertext, str):
            raise TypeError("Ciphertext must be a string.")

        shift_norm = self.normalized_shift
        result: List[str] = []

        for char in ciphertext:
            if char in CHAR_TO_INDEX:
                orig_idx = CHAR_TO_INDEX[char]
                new_idx = (orig_idx - shift_norm) % CHARSET_LENGTH
                result.append(INDEX_TO_CHAR[new_idx])
            else:
                # Documented policy: Pass through unsupported characters unchanged
                result.append(char)

        return "".join(result)

    def get_transformation_steps(self, text: str) -> List[Dict[str, Any]]:
        """
        Returns character-by-character transformation details for visualization.
        """
        shift_norm = self.normalized_shift
        steps: List[Dict[str, Any]] = []

        for idx, char in enumerate(text):
            if char in CHAR_TO_INDEX:
                orig_pos = CHAR_TO_INDEX[char]
                new_pos = (orig_pos + shift_norm) % CHARSET_LENGTH
                trans_char = INDEX_TO_CHAR[new_pos]
                steps.append({
                    "index": idx,
                    "input_char": char,
                    "original_pos": orig_pos,
                    "shift": shift_norm,
                    "new_pos": new_pos,
                    "output_char": trans_char,
                    "supported": True
                })
            else:
                steps.append({
                    "index": idx,
                    "input_char": char,
                    "original_pos": -1,
                    "shift": 0,
                    "new_pos": -1,
                    "output_char": char,
                    "supported": False
                })
        return steps
