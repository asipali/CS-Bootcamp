# CipherVault 2.0 — Security Baseline & Architecture (Phase 2)

**Document Version:** 2.0.0 (Phase 2 Secure Vault Product)  
**Status:** Approved & Verified Implementation  
**Date:** October 2026  

---

## 1. Executive Summary & Security Posture
CipherVault 2.0 Phase 2 establishes an end-to-end, zero-knowledge, authenticated document vault and cryptanalysis laboratory. The platform couples client-side **AES-256-GCM** hardware-accelerated encryption (Web Crypto API) with strict server-side authorization (Next.js App Router, Prisma ORM, SQLite) and a tamper-evident `.cvault` versioned container format.

---

## 2. Cryptographic Architecture (Module B: Secure File Vault)

```
[Plaintext File Bytes] 
         │ 
         ├─► Ephemeral FEK (256-bit AES-GCM) ──► Encrypts File Payload ──► Ciphertext + 128-bit Tag
         │
[Master Password]
         │ 
         └─► PBKDF2-HMAC-SHA256 (600,000 iters + Salt) ──► KEK (256-bit)
                                                             │
                                                             ▼
                                                    AES-KW (RFC 3394)
                                                             │
                                                             ▼
                                                     Wrapped FEK (40B)
```

### 2.1 Algorithm & Specifications
- **Payload Encryption:** AES-256-GCM (NIST SP 800-38D).
- **Key Wrapping:** AES Key Wrap / AES-KW (NIST SP 800-38F / RFC 3394).
- **Key Derivation (KEK):** PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP ASVS Level 2 guideline) and 128-bit CSPRNG salt.
- **Nonce Management:** Unique 96-bit (12-byte) initialization vector per file generated via `crypto.getRandomValues()` / `secrets.token_bytes(12)`.
- **Integrity Tag:** 128-bit (16-byte) authentication tag validated prior to returning any decrypted bytes.
- **Zero-Knowledge Principle:** Plaintext files and master encryption keys are processed strictly within browser memory and are **never** transmitted over the network or stored on the server.

### 2.2 Versioned Container Format (`.cvault` v1)
A self-describing, tamper-resistant binary layout:

| Offset | Length | Field | Description |
| :--- | :--- | :--- | :--- |
| `0` | 4 B | `MAGIC_BYTES` | ASCII `"CVLT"` (Identifier) |
| `4` | 1 B | `VERSION` | `0x01` (Version 1) |
| `5` | 16 B | `KDF_SALT` | 128-bit random salt for KEK derivation |
| `21` | 4 B | `KDF_ITERS` | uint32 Big-Endian ($600,000$) |
| `25` | 40 B | `WRAPPED_FEK`| AES-KW wrapped 256-bit File Encryption Key |
| `65` | 12 B | `NONCE` | 96-bit AES-GCM IV |
| `77` | 16 B | `AUTH_TAG` | 128-bit AES-GCM Authentication Tag |
| `93` | N B | `CIPHERTEXT` | Encrypted file payload bytes |

---

## 3. Storage Abstraction & User Isolation

### 3.1 Server-Side Storage Security
- **UUID File Identification:** Encrypted files are stored on disk as `<uuid>.cvault`. User-controlled filenames are sanitized, stored only as metadata, and never used as filesystem paths.
- **Path Traversal Prevention:** Storage methods enforce strict regex validation (`^[0-9a-f-]{36}$`) and canonical path boundary checks.
- **Atomic Disk Writes:** Blobs are written to temporary files and replaced atomically (`tempfile` + `os.replace` / `fs.rename`) preventing corrupt or partial writes.

### 3.2 Authorization & IDOR Mitigation
- Every API endpoint (`/api/vault/files`, `/api/vault/files/[id]`, `/api/vault/files/[id]/download`) verifies session identity on the server.
- Database queries enforce ownership:
  ```typescript
  where: { id: fileId, userId: session.userId }
  ```
- Unauthorized access attempts by other users return `403 Forbidden` and trigger an `ACCESS_DENIED` security audit event.

---

## 4. Summary of Remediated Defects

| Security Requirement | Status | Verification Evidence |
| :--- | :--- | :--- |
| **AES-256-GCM Binary Encryption** | **IMPLEMENTED** | Tested with PDF, PNG, empty files, and 1 MB binary streams. |
| **Tamper & Bit-Flip Rejection** | **IMPLEMENTED** | Any modification to ciphertext or tag fails authentication with 0 plaintext released. |
| **Cross-Tenant User Isolation** | **IMPLEMENTED** | Multi-user test proves User B cannot download or delete User A's file. |
| **Zero Sensitive Data in Logs** | **IMPLEMENTED** | Passwords, raw keys, and file contents are strictly excluded from audit logs. |
| **Classical Ciphers Segregation**| **IMPLEMENTED** | Quarantined in Module A with persistent educational warning banner. |
