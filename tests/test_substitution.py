"""
Tests for Random Substitution Cipher and Strict Key Validation.
"""

import pytest
from ciphervault.charset import CHARSET, CHARSET_LENGTH
from ciphervault.ciphers.substitution import SubstitutionCipher, InvalidSubstitutionKeyError
from ciphervault.keygen import keygen


def test_substitution_valid_csprng_roundtrip():
    """Verify roundtrip encryption and decryption with CSPRNG-generated valid key."""
    key = keygen.generate_substitution_key()
    cipher = SubstitutionCipher(key)
    plaintext = "The Quick Brown Fox Jumps Over The Lazy Dog! 1234567890."
    ciphertext = cipher.encrypt(plaintext)
    assert ciphertext != plaintext
    assert cipher.decrypt(ciphertext) == plaintext


def test_substitution_key_with_leading_or_trailing_space():
    """
    CRITICAL DEFECT REGRESSION TEST:
    Whitespace must never be stripped from cryptographic keys.
    When space ' ' is at index 0 or index 91 of the key, it must be preserved.
    """
    # Create key where space ' ' is at index 0 (leading space)
    leading_space_key = CHARSET  # Index 0 is ' '
    cipher1 = SubstitutionCipher(leading_space_key)
    assert cipher1.key[0] == " "
    assert len(cipher1.key) == 92

    # Create key where space ' ' is at index 91 (trailing space)
    # Rotate CHARSET by 1 to move ' ' from index 0 to index 91
    trailing_space_key = CHARSET[1:] + CHARSET[0]
    cipher2 = SubstitutionCipher(trailing_space_key)
    assert cipher2.key[-1] == " "
    assert len(cipher2.key) == 92

    msg = "Message with space"
    assert cipher1.decrypt(cipher1.encrypt(msg)) == msg
    assert cipher2.decrypt(cipher2.encrypt(msg)) == msg


def test_substitution_rejects_short_key():
    """Keys with fewer than 92 characters must be rejected."""
    short_key = CHARSET[:-1]  # 91 chars
    with pytest.raises(InvalidSubstitutionKeyError) as exc_info:
        SubstitutionCipher(short_key)
    assert "Invalid key length: 91" in str(exc_info.value)


def test_substitution_rejects_long_key():
    """Keys with more than 92 characters must be rejected."""
    long_key = CHARSET + "A"  # 93 chars
    with pytest.raises(InvalidSubstitutionKeyError) as exc_info:
        SubstitutionCipher(long_key)
    assert "Invalid key length: 93" in str(exc_info.value)


def test_substitution_rejects_duplicate_characters():
    """Keys with duplicate characters (and consequently missing characters) must be rejected."""
    # Replace last character with first character
    dup_key = CHARSET[:-1] + CHARSET[0]
    with pytest.raises(InvalidSubstitutionKeyError) as exc_info:
        SubstitutionCipher(dup_key)
    assert "duplicate character" in str(exc_info.value)


def test_substitution_rejects_arbitrary_unicode_keys():
    """92-character Unicode strings containing characters outside CHARSET must be rejected."""
    # 92 instances of Unicode emoji or Cyrillic
    unicode_key = "Ж" * 92
    with pytest.raises(InvalidSubstitutionKeyError) as exc_info:
        SubstitutionCipher(unicode_key)
    assert "duplicate" in str(exc_info.value) or "not in CHARSET" in str(exc_info.value)


def test_substitution_rejects_non_string_keys():
    """Non-string key inputs must be rejected with InvalidSubstitutionKeyError."""
    with pytest.raises(InvalidSubstitutionKeyError):
        SubstitutionCipher(12345)  # type: ignore
    with pytest.raises(InvalidSubstitutionKeyError):
        SubstitutionCipher(None)   # type: ignore


def test_substitution_empty_and_unsupported_text():
    """Test handling of empty string and unsupported characters."""
    key = keygen.generate_substitution_key()
    cipher = SubstitutionCipher(key)
    assert cipher.encrypt("") == ""
    assert cipher.decrypt("") == ""

    # Unsupported character (e.g., non-ASCII or excluded char '"')
    unsupported_text = 'Test "with" quotes and ü'
    enc = cipher.encrypt(unsupported_text)
    assert '"' in enc
    assert 'ü' in enc
    assert cipher.decrypt(enc) == unsupported_text


def test_substitution_transformation_steps():
    """Verify visualizer step structure."""
    key = keygen.generate_substitution_key()
    cipher = SubstitutionCipher(key)
    steps = cipher.get_transformation_steps("Hi")
    assert len(steps) == 2
    assert steps[0]["input_char"] == "H"
    assert steps[0]["output_char"] == cipher.encrypt("H")
    assert steps[0]["supported"] is True
