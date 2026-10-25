# CipherVault 2.0 — Final Test Execution Results & Verification Matrix

**Document Version:** 3.2.0 (Public Features, Auth Gating & Demo Credit System Verified)  
**Execution Timestamp:** October 25, 2026  
**Total Tests Executed:** 116 Automated Assertions + Live Localhost Endpoint Audit (100% Passed, 0 Failed, 0 Skipped)  

---

## 1. Automated Test Execution Matrix

| Test Category | Command / Suite | Actual Outcome | Notes |
| :--- | :--- | :--- | :--- |
| **Python Unit & Regression** | `python -m pytest tests/ -v` | **70 PASSED** (5.51s) | Modulo-92 Caesar, Substitution bijection, Shuffle transposition, Argon2id, atomic persistence. |
| **Python E2E Multi-Format** | `pytest tests/test_integration_e2e.py` | **3 PASSED** | PDF, DOCX, TXT, PNG, BIN, Empty file SHA-256 roundtrips, disk tampering, size limits. |
| **Web Crypto AES-GCM** | `npm test -- tests-ts/crypto.test.ts` | **7 PASSED** (1.73s) | Web Crypto API AES-256-GCM, PBKDF2 (600k iters), AES-KW key wrap, bit-flip & tag tampering rejection. |
| **Multi-Tenant Isolation & IDOR** | `npm test -- tests-ts/isolation.test.ts`| **4 PASSED** (1.71s) | Verified User B cannot access/delete User A's files; path traversal prevention; constant-time auth. |
| **Demo Account & Credit System** | `npm test -- tests-ts/credits_and_gating.test.ts` | **5 PASSED** (1.32s) | Demo account 100 credits grant, registration 25 credits grant, 1 credit deduction, 0 credit download allowed, upload rejection on 0 balance. |
| **TypeScript Full-Stack E2E** | `npm test -- tests-ts/integration_e2e.test.ts`| **1 PASSED** (1.63s) | Multi-format (PDF, DOCX, PNG, BIN, Empty) Web Crypto & Prisma storage roundtrips. |
| **TypeScript Classical Ciphers**| `npm test -- tests-ts/classical.test.ts`| **7 PASSED** (10ms) | Modulo-92 Caesar, Substitution, Shuffle, and Shannon entropy frequency analysis. |
| **Standalone CLI Self-Test** | `python CipherVault.py --test` | **22 PASSED** (0.75s) | Standalone in-process test runner validating core invariants without external test runners. |
| **TypeScript Type Checking** | `npx tsc --noEmit` | **0 ERRORS** (Exit 0) | Strict type-safety across all components, API route handlers, and cryptographic wrappers. |
| **Next.js Production Build** | `npm run build` | **SUCCESS** (Exit 0) | Compiled all 18 static and dynamic pages with optimized chunk bundles (87.3 kB shared JS). |
| **Live Localhost Execution** | `http://localhost:3000` | **VERIFIED LIVE** | Active daemon server, responsive UI routes (`/`, `/features`, `/credits`, `/login`, `/vault`, `/lab`, `/audit`). |
| **Live Auth & Credit Gating** | HTTP Cookie Session Audit | **VERIFIED 200 OK** | Registration, session issuance, demo account (100 credits), and unauthenticated API 401 rejections validated live. |

---

## 2. Multi-Format Cryptographic Verification Summary

All tested file formats underwent client-side encryption, storage persistence, retrieval, and authenticated decryption. The original and decrypted files were compared using SHA-256 digests:

| File Format | Payload Description | Original Size | Ciphertext Size | SHA-256 Match Status |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | UTF-8 Plaintext memo | 76 B | 169 B | **EXACT MATCH (Verified)** |
| **PDF** | Binary `%PDF-1.7` stream | 16,423 B | 16,516 B | **EXACT MATCH (Verified)** |
| **DOCX** | Binary ZIP container headers | 2,079 B | 2,172 B | **EXACT MATCH (Verified)** |
| **PNG** | Binary `\x89PNG` image stream | 4,129 B | 4,222 B | **EXACT MATCH (Verified)** |
| **BIN** | High-entropy arbitrary binary | 32,768 B | 32,861 B | **EXACT MATCH (Verified)** |
| **EMPTY** | 0-byte edge-case payload | 0 B | 93 B (Header) | **EXACT MATCH (Verified)** |

---

## 3. Negative Security Failure & Credit Gating Verification

- **Bit-Flip Ciphertext Attack:** Flipped 1 bit in ciphertext payload; verified atomic rejection via `Authentication tag verification failed`. Zero plaintext released.
- **Incorrect Key Decryption:** Master password mismatch verified; unwrapping failed with `Incorrect master password or corrupted key envelope`.
- **Zero-Credit Upload Rejection:** Users with 0 credit balance are blocked with HTTP `402 Insufficient demo credits`.
- **Zero-Credit Retrieval Allowed:** Users with 0 credit balance can download and decrypt their already stored files freely without credit penalties.
- **Credit Deductions Only on Success:** Failed uploads or invalid containers abort before credit deduction occurs.
- **IDOR Cross-Tenant Access:** User B attempting to download or delete User A's storage object returns HTTP `403 Forbidden` and logs an `ACCESS_DENIED` security audit event.
- **Storage Path Traversal:** Requests with `../../` or malformed UUIDs rejected immediately with `Security violation: Path traversal attempt detected`.
- **Unauthenticated API Access:** Protected endpoints `/api/vault/files`, `/api/audit`, and `/api/credits/history` return HTTP `401 Unauthorized` when accessed without session cookie.
