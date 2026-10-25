# CipherVault 2.0 — Threat Model (Phase 1 Foundation)

**Document Version:** 1.0.0  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Status:** Approved & Implemented Baseline  

---

## 1. System Assets & Trust Boundaries

### 1.1 Critical Assets
1. **User Authentication Credentials:** Plaintext passwords and cryptographic password hashes.
2. **Cryptographic Keys:** Caesar shifts, Monoalphabetic permutation keys, Transposition index sequences.
3. **User Profile & Registration Data:** Usernames, normalized email addresses, mobile numbers.
4. **Local Database & Storage:** `users_db.json` and transient memory state.

### 1.2 Trust Boundaries
- **Boundary 1 (Input Boundary):** Untrusted user input received via CLI flags, interactive prompts, or programmatic method invocations.
- **Boundary 2 (Process Memory Boundary):** Local Python process execution space holding cleartext variables during active operations.
- **Boundary 3 (Persistent Storage Boundary):** File system layer where JSON database files reside.

```
[Untrusted External Inputs] 
         │ (Validation & Sanitization Boundary)
         ▼
[Core Cryptographic & Auth Engine (Python Memory)]
         │ (Argon2id Hashing & Atomic Write Boundary)
         ▼
[Persistent Storage (users_db.json on Disk)]
```

---

## 2. Attacker Assumptions
- The attacker may have local unprivileged access or read access to disk backups.
- The attacker can supply arbitrary malformed, oversized, or boundary-breaking strings as inputs.
- The attacker can inspect application output streams, error traces, and logs.
- The attacker has computational power sufficient to attempt dictionary or brute-force attacks against weak hashes.

---

## 3. Threat Assessment Matrix (STRIDE)

| Threat ID | Category | Threat Scenario | Impact | Phase 1 Status & Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **TH-01** | **Spoofing** | Attacker brute-forces account passwords or presents duplicate registrations. | Unauthorized account takeover. | **Mitigated in Phase 1:** Argon2id memory-hard hashing ($64\text{ MB}$, $2$ iters) prevents GPU/ASIC acceleration. Duplicate username and email detection enforced. |
| **TH-02** | **Tampering** | Attacker supplies malformed or duplicate substitution/transposition keys to cause state corruption. | Cryptographic error, data corruption, or denial of service. | **Mitigated in Phase 1:** Strict bijection key validator (`SubstitutionCipher.validate_key`) and strict integer index parser (`ShuffleCipher.parse_key`). |
| **TH-03** | **Tampering** | Interrupted write operation corrupts `users_db.json`. | Permanent database loss. | **Mitigated in Phase 1:** Atomic file persistence (`tempfile` + `os.replace` + `fsync`). |
| **TH-04** | **Repudiation** | User denies performing an encryption or registration action. | Inability to audit security events. | **Planned for Phase 2/3:** Structured audit logging table and privacy-conscious event tracker. |
| **TH-05** | **Info Disclosure** | Plaintext password leaked via database dump or disk inspection. | Complete credential compromise. | **Mitigated in Phase 1:** Zero plaintext password storage. Legacy plaintext records automatically upgraded to Argon2id on first login and cleartext deleted. |
| **TH-06** | **Info Disclosure** | Classical cipher ciphertext intercepted and cryptanalyzed. | Plaintext message recovered. | **Accepted Residual Risk:** Classical ciphers are preserved strictly for educational purposes and explicitly labeled INSECURE. Real confidentiality deferred to AES-256-GCM in Phase 2. |
| **TH-07** | **Info Disclosure** | Sensitive keys or passwords printed in error messages or logs. | Secret leakage in diagnostics. | **Mitigated in Phase 1:** Exception classes emit generic, sanitized error messages without echoing secret inputs or passwords. |
| **TH-08** | **Denial of Service**| Enormous input strings or malformed tokens submitted to exhaust memory. | Process crash or thread hang. | **Mitigated in Phase 1:** Input length limits (password max 256 chars, username max 30 chars, strict integer bounds on shuffle keys). |
| **TH-09** | **Elevation** | Cross-tenant file access (IDOR). | Unauthorized file access. | **Deferred to Phase 2:** Web vault session guards and server-side tenant isolation queries. |

---

## 4. Residual Risks & Next Steps
1. **Classical Cipher Mathematics:** Monoalphabetic and transposition algorithms cannot protect confidential information. They are quarantined in the educational lab module.
2. **Process Memory Protection:** Plaintext strings in Python memory are managed by Python's garbage collector. While transient, full memory zeroization is constrained by Python string immutability.
3. **Phase 2 Hand-off:** Phase 2 will implement client-side **AES-256-GCM** authenticated encryption with hardware acceleration (Web Crypto API) and relational database isolation.
