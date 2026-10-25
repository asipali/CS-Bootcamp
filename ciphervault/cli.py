"""
CipherVault 2.0 - Interactive Command-Line Interface & Self-Test Runner.
"""

import sys
import argparse
from typing import Optional

from .charset import CHARSET, CHARSET_LENGTH
from .ciphers.caesar import CaesarCipher
from .ciphers.substitution import SubstitutionCipher, InvalidSubstitutionKeyError
from .ciphers.shuffle import ShuffleCipher, InvalidShuffleKeyError
from .keygen import keygen
from .auth.user_store import UserStore, AuthenticationError
from .auth.validator import ValidationError

BANNER = f"""
========================================================================
   CIPHERVAULT 2.0 - SECURE FOUNDATION & CRYPTO LAB (PHASE 1)
   Custom 92-Char Domain | Argon2id Auth | CSPRNG Key Generation
========================================================================
[!] NOTICE: Classical ciphers (Caesar, Substitution, Shuffle) are
    mathematically broken and included strictly for educational study.
    Never use them to protect confidential information.
========================================================================
"""


def run_self_tests() -> int:
    """
    Executes in-process self-test suite covering alphabet invariants,
    Caesar roundtrips and known vectors, Substitution permutation validation,
    Shuffle parsing, and Argon2id password verification.
    """
    print("\n[+] Starting CipherVault 2.0 Phase 1 Self-Test Suite...")
    passed = 0
    failed = 0

    def test(name: str, condition: bool, err_msg: str = ""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {name}")
            passed += 1
        else:
            print(f"  [FAIL] {name}: {err_msg}")
            failed += 1

    # 1. CHARSET invariants
    test("Alphabet contains exactly 92 characters", len(CHARSET) == 92)
    test("Alphabet characters are completely unique", len(set(CHARSET)) == 92)
    test("Excluded characters are absent (\", \\, `)",
         '"' not in CHARSET and '\\' not in CHARSET and '`' not in CHARSET)
    test("Space ' ' is present at index 0", CHARSET[0] == ' ')

    # 2. Caesar Cipher
    caesar = CaesarCipher(shift=3)
    p_text = "Hello World! 123"
    c_text = caesar.encrypt(p_text)
    d_text = caesar.decrypt(c_text)
    test("Caesar shift=3 roundtrip", d_text == p_text)

    # Known-answer Caesar check:
    # ' ' (idx 0) shifted by 3 -> '$' (idx 3)
    test("Caesar known-answer vector (' ' shifted by 3 is '$')",
         caesar.encrypt(" ") == "$")

    # Caesar large & negative shifts
    caesar_neg = CaesarCipher(shift=-95)  # -95 % 92 = 89
    test("Caesar negative shift roundtrip", caesar_neg.decrypt(caesar_neg.encrypt(p_text)) == p_text)

    # 3. Random Substitution
    sub_key = keygen.generate_substitution_key()
    test("Generated substitution key has 92 chars", len(sub_key) == 92)
    test("Generated substitution key is valid permutation", set(sub_key) == set(CHARSET))

    sub_cipher = SubstitutionCipher(sub_key)
    sub_c = sub_cipher.encrypt(p_text)
    sub_d = sub_cipher.decrypt(sub_c)
    test("Substitution roundtrip with CSPRNG key", sub_d == p_text)

    # Substitution key containing leading space
    # When space is mapped to first position, key starts with ' '
    try:
        SubstitutionCipher("INVALID_KEY_SHORT")
        test("Substitution rejects short key", False, "Failed to raise error")
    except InvalidSubstitutionKeyError:
        test("Substitution rejects short key", True)

    try:
        # 92 characters with duplicate 'A'
        dup_key = CHARSET.replace("B", "A")
        SubstitutionCipher(dup_key)
        test("Substitution rejects duplicate characters", False, "Failed to raise error")
    except InvalidSubstitutionKeyError:
        test("Substitution rejects duplicate characters", True)

    # 4. Shuffle Transposition
    shuffle_cipher = ShuffleCipher()
    shuf_msg = "SECURE_VAULT_2026"
    shuf_key = keygen.generate_shuffle_key(len(shuf_msg))
    shuf_c = shuffle_cipher.encrypt(shuf_msg, shuf_key)
    shuf_d = shuffle_cipher.decrypt(shuf_c, shuf_key)
    test("Shuffle cipher roundtrip with CSPRNG key", shuf_d == shuf_msg)

    # Shuffle key validation
    try:
        shuffle_cipher.parse_key([0, 1, 1], expected_length=3)
        test("Shuffle rejects duplicate index", False, "Failed to raise error")
    except InvalidShuffleKeyError:
        test("Shuffle rejects duplicate index", True)

    try:
        shuffle_cipher.parse_key([0, 1, 99], expected_length=3)
        test("Shuffle rejects out-of-bounds index", False, "Failed to raise error")
    except InvalidShuffleKeyError:
        test("Shuffle rejects out-of-bounds index", True)

    # 5. Argon2id Authentication & Storage
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        import os
        test_db = os.path.join(td, "test_users.json")
        store = UserStore(db_path=test_db, require_gmail=True)

        # Registration
        user = store.register_user(
            username="alice_test",
            email="alice@gmail.com",
            mobile="9876543210",
            password=" Correct Horse Battery ! "  # Intentional leading and trailing spaces
        )
        test("User registration succeeds", user.username == "alice_test")
        test("Password hash starts with $argon2id$", user.password_hash.startswith("$argon2id$"))

        # Login with correct password (including spaces)
        auth_user = store.authenticate_user("alice_test", " Correct Horse Battery ! ")
        test("Authentication succeeds with exact whitespace password", auth_user.username == "alice_test")

        # Login with wrong password
        try:
            store.authenticate_user("alice_test", "WrongPassword123")
            test("Authentication fails on wrong password", False, "Should have failed")
        except AuthenticationError:
            test("Authentication fails on wrong password", True)

        # Legacy plaintext password auto-migration
        raw_db = {
            "legacy_bob": {
                "username": "legacy_bob",
                "email": "bob@gmail.com",
                "mobile": "1234567890",
                "password": "old_plaintext_password",
                "created_at": 1000.0,
                "updated_at": 1000.0
            }
        }
        import json
        with open(test_db, "w", encoding="utf-8") as f:
            json.dump(raw_db, f)

        # Bob logs in with legacy password
        migrated_bob = store.authenticate_user("legacy_bob", "old_plaintext_password")
        test("Legacy plaintext password verified", migrated_bob.username == "legacy_bob")

        # Verify disk record was upgraded to Argon2id and plaintext removed
        with open(test_db, "r", encoding="utf-8") as f:
            upgraded_data = json.load(f)
        bob_record = upgraded_data["legacy_bob"]
        test("Legacy record upgraded to Argon2id on disk",
             bob_record.get("password_hash", "").startswith("$argon2id$"))
        test("Legacy plaintext password key deleted from disk",
             "password" not in bob_record)

    print("\n------------------------------------------------------------------------")
    print(f"Self-Test Summary: {passed} PASSED, {failed} FAILED.")
    print("------------------------------------------------------------------------\n")
    return 0 if failed == 0 else 1


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(
        description="CipherVault 2.0 - Core Cryptographic & Authentication Suite"
    )
    parser.add_argument("--test", action="store_true", help="Run automated self-test suite")
    parser.add_argument("--demo", action="store_true", help="Display educational cipher transformations")

    args = parser.parse_args(argv)

    print(BANNER)

    if args.test:
        return run_self_tests()

    if args.demo:
        print("[*] Educational Cipher Demonstrations:\n")
        sample_text = "CipherVault 2.0: Defense-in-Depth!"
        print(f"Original Text: {sample_text}")

        # Caesar
        c_shift = 7
        caesar = CaesarCipher(shift=c_shift)
        c_enc = caesar.encrypt(sample_text)
        print(f"[1] Caesar (shift={c_shift}): {c_enc}")

        # Substitution
        sub_k = keygen.generate_substitution_key()
        sub = SubstitutionCipher(sub_k)
        sub_enc = sub.encrypt(sample_text)
        print(f"[2] Substitution (CSPRNG key): {sub_enc}")

        # Shuffle
        shuf_k = keygen.generate_shuffle_key(len(sample_text))
        shuf = ShuffleCipher()
        shuf_enc = shuf.encrypt(sample_text, shuf_k)
        print(f"[3] Shuffle Transposition:    {shuf_enc}")
        return 0

    print("Use --test to execute the automated self-tests, or --demo to run cipher demonstrations.")
    print("For interactive options, launch the test suite or check docs/SECURITY_BASELINE.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
