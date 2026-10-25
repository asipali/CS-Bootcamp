# CipherVault 2.0 — Phase 1 Test Plan & Execution Report

**Document Version:** 1.0.0  
**Test Framework:** `pytest` 7.4.4 & Built-in In-Process Self-Test Suite  
**Status:** **100% PASSED (0 Failures, 0 Regressions)**  
**Execution Date:** October 2026  

---

## 1. Test Strategy & Objectives
Phase 1 automated testing establishes a repeatable, regression-free verification baseline. The test suite validates:
1. Mathematical invariants of the 92-character alphabet.
2. Modulo-92 Caesar cipher roundtrip and fixed known-answer vectors.
3. Strict permutation key validation and whitespace preservation for substitution ciphers.
4. Permutation index parsing and boundary enforcement for transposition ciphers.
5. Standard-compliant Argon2id password hashing and constant-time verification.
6. Safe on-the-fly legacy database migration.
7. Complete storage isolation preventing mutation of normal user databases.

---

## 2. Test Execution Summary

| Test Module | Test Focus | Tests Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `tests/test_charset.py` | 92-character alphabet invariants | 6 | **PASSED** | Validates length=92, uniqueness, space at index 0, exclusion of `\`, `"`, `` ` ``. |
| `tests/test_caesar.py` | Rotational modulo-92 transformations | 9 | **PASSED** | Validates shifts (zero, multiples of 92, negative, large), known-answer vectors, unsupported char passthrough. |
| `tests/test_substitution.py`| Substitution key bijection & whitespace | 9 | **PASSED** | Validates key length=92, permutation checks, space preservation at key boundaries, duplicate rejection. |
| `tests/test_shuffle.py` | Transposition key parsing & boundaries | 12 | **PASSED** | Validates index permutations, comma/space string parsing, negative/out-of-bounds rejection, empty string handling. |
| `tests/test_keygen.py` | CSPRNG key & salt generation | 5 | **PASSED** | Validates `secrets.SystemRandom` output ranges, permutation structural invariants, minimum 128-bit salt. |
| `tests/test_auth.py` | Argon2id auth, validation & migration | 11 | **PASSED** | Validates memory-hard hashing, whitespace preservation in passwords, duplicate detection, legacy re-hashing. |
| `tests/test_cli.py` | In-process self-test & CLI flags | 3 | **PASSED** | Validates `--test` and `--demo` arguments and exit codes. |
| `CipherVault.py --test` | In-process standalone self-test runner | 22 assertions | **PASSED** | Standalone runner validating all components without external pytest runner. |
| **Total Test Items** | | **55 pytest + 22 self-test** | **100% PASS** | Zero failures, zero warnings, zero skipped. |

---

## 3. Detailed Test Cases & Evidence

### 3.1 Known-Answer Verification Tests
- **Caesar Cipher Shift = 3:**
  - Input: `' '` (space at index 0 of `CHARSET`)
  - Expected Output: `'$'` (character at index $(0 + 3) \bmod 92 = 3$)
  - Result: Verified exact match (`'$'`).
- **Caesar Cipher Shift = 1 Boundary Wrap:**
  - Input: `'~'` (character at index 91 of `CHARSET`)
  - Expected Output: `' '` (character at index $(91 + 1) \bmod 92 = 0$)
  - Result: Verified exact match (`' '`).

### 3.2 Security Defect Regression Tests
- **Whitespace Preservation in Keys:**
  - Test: Key starting with space `' '` (index 0) or ending with space `' '` (index 91).
  - Assertion: Key length remains exactly 92; `.strip()` is never called; roundtrip encryption restores original message.
  - Result: **PASSED**.
- **Whitespace Preservation in Passwords:**
  - Test: User password with intentional leading/trailing spaces (`"  Correct Horse Battery Staple  "`).
  - Assertion: Argon2id hash successfully verifies only against the exact padded string; fails against trimmed string.
  - Result: **PASSED**.
- **Legacy Password Migration:**
  - Test: User record with plaintext `"password": "legacy_plaintext_secret"`.
  - Assertion: Login succeeds; password upgraded to `$argon2id$...`; plaintext key deleted from disk file.
  - Result: **PASSED**.

---

## 4. How to Reproduce & Verify

### Command 1: Pytest Suite
```bash
python -m pytest tests/ -v
```
*Expected Output:* `55 passed in ~1.3s`

### Command 2: CLI In-Process Self-Test
```bash
python CipherVault.py --test
```
*Expected Output:* `Self-Test Summary: 22 PASSED, 0 FAILED.`

### Command 3: Classical Cipher Demonstration
```bash
python CipherVault.py --demo
```
*Expected Output:* Formatted banner with educational disclaimer and sample cipher transformations.
