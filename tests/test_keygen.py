"""
Tests for Cryptographically Secure Key Generator (CSPRNG).
"""

import pytest
from ciphervault.charset import CHARSET, CHARSET_LENGTH, CHARSET_SET
from ciphervault.keygen import KeyGenerator


def test_caesar_shift_generation():
    """Verify generated shifts fall strictly within specified bounds."""
    kg = KeyGenerator()
    for _ in range(50):
        shift = kg.generate_caesar_shift()
        assert 1 <= shift <= CHARSET_LENGTH - 1


def test_caesar_shift_custom_bounds():
    """Verify custom bound enforcement."""
    kg = KeyGenerator()
    shift = kg.generate_caesar_shift(min_shift=10, max_shift=20)
    assert 10 <= shift <= 20

    with pytest.raises(ValueError):
        kg.generate_caesar_shift(min_shift=30, max_shift=20)


def test_substitution_key_properties():
    """Verify substitution key structural invariants."""
    kg = KeyGenerator()
    for _ in range(10):
        key = kg.generate_substitution_key()
        assert len(key) == CHARSET_LENGTH
        assert set(key) == CHARSET_SET
        assert len(set(key)) == CHARSET_LENGTH


def test_shuffle_key_properties():
    """Verify shuffle key generation creates exact 0..N-1 permutations."""
    kg = KeyGenerator()
    for length in [1, 5, 20, 100]:
        key = kg.generate_shuffle_key(length)
        assert len(key) == length
        assert set(key) == set(range(length))

    with pytest.raises(ValueError):
        kg.generate_shuffle_key(0)


def test_secure_salt_generation():
    """Verify cryptographic salt format and length."""
    kg = KeyGenerator()
    salt = kg.generate_secure_salt(16)
    assert len(salt) == 32  # 16 bytes in hex is 32 chars
    # Ensure hex characters only
    int(salt, 16)

    with pytest.raises(ValueError):
        kg.generate_secure_salt(15)  # Enforce at least 16 bytes
