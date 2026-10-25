"""
CipherVault 2.0 - Core Alphabet & Character Domain Specification.

This module defines the custom 92-character alphabet used for the educational
classical ciphers (Caesar, Random Substitution, and Shuffle Transposition).
"""

from typing import Tuple, Set

# The 92-character custom alphabet:
# ASCII printable characters from 32 (space) to 126 (~), excluding:
# - '"' (double quote, ASCII 34)
# - '\\' (backslash, ASCII 92)
# - '`' (backtick, ASCII 96)
#
# Total characters = 95 - 3 = 92.
# All characters are distinct, preserving deterministic index mapping.
CHARSET: str = "".join(chr(i) for i in range(32, 127) if i not in (34, 92, 96))

CHARSET_LENGTH: int = len(CHARSET)  # Must be exactly 92
CHARSET_SET: Set[str] = set(CHARSET)

# Pre-computed lookup dictionaries for O(1) character-to-index and index-to-character operations
CHAR_TO_INDEX: dict[str, int] = {char: idx for idx, char in enumerate(CHARSET)}
INDEX_TO_CHAR: dict[int, str] = {idx: char for idx, char in enumerate(CHARSET)}


def validate_charset() -> Tuple[bool, str]:
    """
    Validates structural invariants of the CHARSET constant.
    Returns:
        (True, 'OK') if invariants hold, or (False, error_message).
    """
    if len(CHARSET) != 92:
        return False, f"CHARSET length is {len(CHARSET)}, expected exactly 92."
    if len(CHARSET_SET) != 92:
        return False, f"CHARSET contains {92 - len(CHARSET_SET)} duplicate characters."
    return True, "OK"


# Validate on module load
_is_valid, _err = validate_charset()
if not _is_valid:
    raise RuntimeError(f"Cryptographic CHARSET invariant violation: {_err}")
