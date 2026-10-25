"""
Tests for Shuffle (Transposition) Cipher and Strict Key Parser.
"""

import pytest
from ciphervault.ciphers.shuffle import ShuffleCipher, InvalidShuffleKeyError
from ciphervault.keygen import keygen


def test_shuffle_roundtrip_list_key():
    """Verify roundtrip with explicit integer list key."""
    cipher = ShuffleCipher()
    msg = "ABCDE"
    key = [4, 0, 3, 1, 2]
    # cipher[0] = msg[4] = 'E'
    # cipher[1] = msg[0] = 'A'
    # cipher[2] = msg[3] = 'D'
    # cipher[3] = msg[1] = 'B'
    # cipher[4] = msg[2] = 'C' -> "EADBC"
    enc = cipher.encrypt(msg, key)
    assert enc == "EADBC"
    assert cipher.decrypt(enc, key) == msg


def test_shuffle_comma_separated_string_key():
    """Verify string key parsing with comma separation."""
    cipher = ShuffleCipher()
    msg = "HELLO"
    key_str = "4, 1, 0, 3, 2"
    enc = cipher.encrypt(msg, key_str)
    assert cipher.decrypt(enc, key_str) == msg


def test_shuffle_space_separated_string_key():
    """Verify string key parsing with space separation."""
    cipher = ShuffleCipher()
    msg = "WORLD"
    key_str = "2 4 1 0 3"
    enc = cipher.encrypt(msg, key_str)
    assert cipher.decrypt(enc, key_str) == msg


def test_shuffle_csprng_roundtrip():
    """Verify roundtrip with CSPRNG generated key for longer text."""
    cipher = ShuffleCipher()
    msg = "Cybersecurity Lab: Transposition Invariants 2026!"
    key = keygen.generate_shuffle_key(len(msg))
    enc = cipher.encrypt(msg, key)
    assert enc != msg
    assert cipher.decrypt(enc, key) == msg


def test_shuffle_single_character():
    """Single character message with key [0] roundtrips cleanly."""
    cipher = ShuffleCipher()
    assert cipher.encrypt("X", [0]) == "X"
    assert cipher.decrypt("X", [0]) == "X"


def test_shuffle_empty_string():
    """Empty string with empty key returns empty string."""
    cipher = ShuffleCipher()
    assert cipher.encrypt("", []) == ""
    assert cipher.decrypt("", "") == ""


def test_shuffle_rejects_duplicate_index():
    """Duplicate index in key must raise InvalidShuffleKeyError."""
    cipher = ShuffleCipher()
    with pytest.raises(InvalidShuffleKeyError) as exc:
        cipher.parse_key([0, 1, 1], expected_length=3)
    assert "Duplicate index" in str(exc.value)


def test_shuffle_rejects_negative_index():
    """Negative index must raise InvalidShuffleKeyError."""
    cipher = ShuffleCipher()
    with pytest.raises(InvalidShuffleKeyError) as exc:
        cipher.parse_key([-1, 1, 2], expected_length=3)
    assert "out of bounds" in str(exc.value)


def test_shuffle_rejects_out_of_bounds_index():
    """Index >= length must raise InvalidShuffleKeyError."""
    cipher = ShuffleCipher()
    with pytest.raises(InvalidShuffleKeyError) as exc:
        cipher.parse_key([0, 1, 3], expected_length=3)
    assert "out of bounds" in str(exc.value)


def test_shuffle_rejects_length_mismatch():
    """Key with wrong count of indices must raise InvalidShuffleKeyError."""
    cipher = ShuffleCipher()
    with pytest.raises(InvalidShuffleKeyError) as exc:
        cipher.parse_key([0, 1], expected_length=3)
    assert "Key length mismatch" in str(exc.value)


def test_shuffle_rejects_malformed_string_tokens():
    """Non-integer tokens must be rejected."""
    cipher = ShuffleCipher()
    with pytest.raises(InvalidShuffleKeyError) as exc:
        cipher.parse_key("0, 1, foo", expected_length=3)
    assert "non-integer token" in str(exc.value)


def test_shuffle_transformation_steps():
    """Verify visualizer step structure for shuffle cipher."""
    cipher = ShuffleCipher()
    steps = cipher.get_transformation_steps("CAT", [2, 0, 1])
    assert len(steps) == 3
    assert steps[0]["output_index"] == 0
    assert steps[0]["input_index"] == 2
    assert steps[0]["character"] == "T"
