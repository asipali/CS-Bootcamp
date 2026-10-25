"""
CipherVault 2.0 - Shuffle (Transposition) Cipher.

EDUCATIONAL NOTICE:
Transposition ciphers rearrange the order of characters without altering their identities.
They preserve letter frequencies identically and are susceptible to anagramming,
multiple anagramming, and bigram frequency analysis.
"""

from typing import List, Union, Dict, Any


class InvalidShuffleKeyError(ValueError):
    """Raised when a shuffle key fails permutation or range requirements."""
    pass


class ShuffleCipher:
    """
    Implements a permutation transposition cipher over a message of length N.

    The key is a sequence of integers [k_0, k_1, ..., k_{N-1}] where:
    - Each integer k_i is in range [0, N-1].
    - Every integer from 0 to N-1 appears exactly once.
    
    Encryption:
        ciphertext[i] = plaintext[key[i]]
    Decryption:
        plaintext[key[i]] = ciphertext[i]
    """

    @classmethod
    def parse_key(cls, raw_key: Union[str, List[int]], expected_length: int) -> List[int]:
        """
        Parses and validates a shuffle key for a message of length `expected_length`.

        Supported input formats:
        - List of integers: [2, 0, 1]
        - Comma-separated string: "2,0,1" or "2, 0, 1"
        - Space-separated string: "2 0 1"

        Strict validation rules:
        - Must contain exactly `expected_length` items.
        - Every index must be an integer in [0, expected_length - 1].
        - No duplicate or negative indices.
        - Rejects malformed tokens, trailing empty commas, or non-integer values.
        """
        if expected_length < 0:
            raise InvalidShuffleKeyError(f"Invalid message length: {expected_length}")

        if expected_length == 0:
            if isinstance(raw_key, str) and raw_key.strip() == "":
                return []
            if isinstance(raw_key, list) and len(raw_key) == 0:
                return []
            raise InvalidShuffleKeyError("Empty message requires an empty key.")

        parsed_indices: List[int] = []

        if isinstance(raw_key, list):
            for idx, item in enumerate(raw_key):
                if not isinstance(item, int) or isinstance(item, bool):
                    raise InvalidShuffleKeyError(
                        f"Key element at index {idx} is '{item}' ({type(item).__name__}), expected integer."
                    )
                parsed_indices.append(item)
        elif isinstance(raw_key, str):
            # Clean string tokenization: handle comma or whitespace separation
            cleaned = raw_key.replace(",", " ")
            tokens = cleaned.split()
            if not tokens:
                raise InvalidShuffleKeyError("Shuffle key string cannot be empty for non-empty message.")
            for token in tokens:
                try:
                    val = int(token)
                    parsed_indices.append(val)
                except ValueError:
                    raise InvalidShuffleKeyError(f"Invalid non-integer token '{token}' in shuffle key.")
        else:
            raise InvalidShuffleKeyError(
                f"Shuffle key must be a list of integers or string, got {type(raw_key).__name__}."
            )

        if len(parsed_indices) != expected_length:
            raise InvalidShuffleKeyError(
                f"Key length mismatch: key contains {len(parsed_indices)} indices, "
                f"message has length {expected_length}."
            )

        seen_indices = set()
        for idx in parsed_indices:
            if idx < 0 or idx >= expected_length:
                raise InvalidShuffleKeyError(
                    f"Index {idx} is out of bounds for message length {expected_length} "
                    f"(valid range is 0 to {expected_length - 1})."
                )
            if idx in seen_indices:
                raise InvalidShuffleKeyError(f"Duplicate index {idx} found in shuffle key.")
            seen_indices.add(idx)

        return parsed_indices

    def encrypt(self, plaintext: str, key: Union[str, List[int]]) -> str:
        """
        Encrypts plaintext by rearranging characters according to the permutation key:
        ciphertext[i] = plaintext[key[i]]
        """
        if not isinstance(plaintext, str):
            raise TypeError("Plaintext must be a string.")

        n = len(plaintext)
        if n == 0:
            return ""

        parsed_key = self.parse_key(key, n)
        return "".join(plaintext[idx] for idx in parsed_key)

    def decrypt(self, ciphertext: str, key: Union[str, List[int]]) -> str:
        """
        Decrypts ciphertext by reversing the permutation:
        plaintext[key[i]] = ciphertext[i]
        """
        if not isinstance(ciphertext, str):
            raise TypeError("Ciphertext must be a string.")

        n = len(ciphertext)
        if n == 0:
            return ""

        parsed_key = self.parse_key(key, n)
        plaintext_chars: List[str] = [""] * n

        for out_idx, orig_idx in enumerate(parsed_key):
            plaintext_chars[orig_idx] = ciphertext[out_idx]

        return "".join(plaintext_chars)

    def get_transformation_steps(self, text: str, key: Union[str, List[int]]) -> List[Dict[str, Any]]:
        """
        Returns position-mapping details for the transformation visualizer.
        """
        n = len(text)
        if n == 0:
            return []
        parsed_key = self.parse_key(key, n)
        steps: List[Dict[str, Any]] = []
        for out_pos, in_pos in enumerate(parsed_key):
            steps.append({
                "output_index": out_pos,
                "input_index": in_pos,
                "character": text[in_pos]
            })
        return steps
