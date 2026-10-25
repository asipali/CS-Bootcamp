"""
Tests for Custom 92-Character Alphabet Invariants and Boundaries.
"""

import pytest
from ciphervault.charset import (
    CHARSET,
    CHARSET_LENGTH,
    CHARSET_SET,
    CHAR_TO_INDEX,
    INDEX_TO_CHAR,
    validate_charset,
)


def test_charset_exact_length():
    """Verify alphabet contains exactly 92 symbols."""
    assert len(CHARSET) == 92
    assert CHARSET_LENGTH == 92


def test_charset_uniqueness():
    """Verify all 92 symbols are distinct."""
    assert len(CHARSET_SET) == 92
    assert len(set(CHARSET)) == 92


def test_charset_excluded_characters():
    """Verify that backslash, double quote, and backtick are strictly excluded."""
    assert '"' not in CHARSET
    assert '\\' not in CHARSET
    assert '`' not in CHARSET


def test_charset_space_included():
    """Verify that space ' ' is present and positioned at index 0."""
    assert ' ' in CHARSET
    assert CHARSET[0] == ' '
    assert CHAR_TO_INDEX[' '] == 0
    assert INDEX_TO_CHAR[0] == ' '


def test_charset_bijection_lookup():
    """Verify bidirectional O(1) mappings for all 92 characters."""
    for idx, char in enumerate(CHARSET):
        assert CHAR_TO_INDEX[char] == idx
        assert INDEX_TO_CHAR[idx] == char


def test_validate_charset_function():
    """Verify the internal structural validator returns True, 'OK'."""
    is_valid, msg = validate_charset()
    assert is_valid is True
    assert msg == "OK"
