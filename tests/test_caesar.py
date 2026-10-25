"""
Tests for Caesar Rotational Cipher.
"""

import pytest
from ciphervault.charset import CHARSET
from ciphervault.ciphers.caesar import CaesarCipher


def test_caesar_shift_zero():
    """Shift of 0 returns identical string (identity mapping)."""
    cipher = CaesarCipher(shift=0)
    text = "Hello World! 123"
    assert cipher.encrypt(text) == text
    assert cipher.decrypt(text) == text


def test_caesar_shift_92_multiple():
    """Shifts that are multiples of 92 behave as identity mapping."""
    for shift in [92, 184, -92, -184]:
        cipher = CaesarCipher(shift=shift)
        text = "Confidential Data 2026"
        assert cipher.encrypt(text) == text
        assert cipher.decrypt(text) == text


def test_caesar_known_answer_vectors():
    """Verify exact expected ciphertexts for known shift values."""
    # Shift = 1
    # ' ' (idx 0) -> '!' (idx 1)
    # '~' (idx 91) -> ' ' (idx 0)
    c1 = CaesarCipher(shift=1)
    assert c1.encrypt(" ") == "!"
    assert c1.encrypt("~") == " "
    assert c1.decrypt("!") == " "
    assert c1.decrypt(" ") == "~"

    # Shift = 3
    # ' ' (idx 0) -> '$' (idx 3)
    c3 = CaesarCipher(shift=3)
    assert c3.encrypt(" ") == "$"
    assert c3.decrypt("$") == " "


def test_caesar_roundtrip_all_alphabet():
    """Roundtrip encryption and decryption across the entire 92-char alphabet."""
    cipher = CaesarCipher(shift=17)
    encrypted = cipher.encrypt(CHARSET)
    decrypted = cipher.decrypt(encrypted)
    assert decrypted == CHARSET


def test_caesar_large_shifts():
    """Verify very large positive and negative shifts normalize correctly."""
    c_large_pos = CaesarCipher(shift=1000003)
    c_large_neg = CaesarCipher(shift=-1000003)
    msg = "Test message with spaces and punctuation: [100% OK!]"
    assert c_large_pos.decrypt(c_large_pos.encrypt(msg)) == msg
    assert c_large_neg.decrypt(c_large_neg.encrypt(msg)) == msg


def test_caesar_unsupported_characters():
    """
    Unsupported characters (such as double quote, backslash, non-ASCII Unicode)
    pass through unchanged per documented policy.
    """
    cipher = CaesarCipher(shift=5)
    # '"' and '\' are excluded from CHARSET; 'ñ' is non-ASCII
    mixed_input = 'Quote: "Hello" \\ Backslash \\ Unicode: ñ'
    encrypted = cipher.encrypt(mixed_input)

    # The unsupported characters must remain intact in ciphertext
    assert '"' in encrypted
    assert '\\' in encrypted
    assert 'ñ' in encrypted

    # Decryption must restore original text completely
    decrypted = cipher.decrypt(encrypted)
    assert decrypted == mixed_input


def test_caesar_empty_string():
    """Empty string inputs return empty strings cleanly."""
    cipher = CaesarCipher(shift=7)
    assert cipher.encrypt("") == ""
    assert cipher.decrypt("") == ""


def test_caesar_invalid_input_types():
    """Passing non-strings raises TypeError."""
    cipher = CaesarCipher(shift=3)
    with pytest.raises(TypeError):
        cipher.encrypt(12345)  # type: ignore
    with pytest.raises(TypeError):
        cipher.decrypt(None)   # type: ignore


def test_caesar_transformation_steps():
    """Verify visualization transformation steps format."""
    cipher = CaesarCipher(shift=2)
    steps = cipher.get_transformation_steps(" A")
    assert len(steps) == 2
    assert steps[0]["input_char"] == " "
    assert steps[0]["original_pos"] == 0
    assert steps[0]["shift"] == 2
    assert steps[0]["new_pos"] == 2
    assert steps[0]["supported"] is True
