# CipherVault 2.0 — Industry-Oriented Secure File Vault & Cryptography Security Lab

[![Tests Status](https://img.shields.io/badge/All%20Tests-121%20passed-brightgreen)](#)
[![Python Tests](https://img.shields.io/badge/pytest-70%20passed-success)](#)
[![Vitest Tests](https://img.shields.io/badge/vitest-29%20passed-success)](#)
[![Next.js Build](https://img.shields.io/badge/next.js-14.2%20build%20passing-blue)](#)
[![Crypto Architecture](https://img.shields.io/badge/crypto-AES--256--GCM%20%2B%20AES--KW-orange)](#)

CipherVault 2.0 is an enterprise-focused zero-knowledge file security platform and educational cryptography laboratory. It combines three core operational modules:

1. **Module A — Cryptography Learning Lab (Educational):**  
   Preserves classical ciphers (Caesar, Random Substitution, and Shuffle Transposition) over a standardized 92-character alphabet ($32–126 \setminus \{34, 92, 96\}$). Features live character transformation visualizers, frequency analysis histograms, and Shannon entropy calculators. Clearly labeled as mathematically broken and unsuitable for real confidential data.

2. **Module B — Secure File Vault (Zero-Knowledge Cloud Storage):**  
   Hardware-accelerated **AES-256-GCM** client-side file encryption (Web Crypto API) encapsulated in a structured 93-byte `.cvault` container format. Features PBKDF2-HMAC-SHA256 (600,000 iterations) key derivation, NIST SP 800-38F AES Key Wrap (AES-KW) envelope encryption, server-side user isolation (Next.js, Prisma ORM, SQLite), privacy-aware audit logging, and a **persistent free-credit evaluation system**.

3. **Module C — Portable Encrypted File Transfer & Decryption (Zero-Knowledge):**  
   Standalone client-side workflows enabling users to encrypt files with a password and download portable `.cvault` containers. Recipients can import and decrypt `.cvault` containers independently without requiring the sender's account, session, or database records. Includes a dedicated public decryption tool at `/decrypt` accessible to anonymous users.

---

## 1. Portable File Encryption & Decryption Workflows

CipherVault 2.0 provides two portable file-sharing workflows alongside persistent vault storage:

### Workflow A — Encrypt and Download a Password-Protected File
1. Sign in to CipherVault and navigate to **Secure Vault** (`/vault`) -> **Encrypt & Download (.cvault)**.
2. Select any local file (PDF, DOCX, TXT, PNG, JPG, ZIP, or arbitrary binary data up to 50 MB).
3. Set an encryption password ($\ge 8$ characters) and confirm it.
4. Click **Encrypt & Download Container**:
   - The browser generates an ephemeral 256-bit File Encryption Key (FEK) via CSPRNG.
   - Derives a Key Encryption Key (KEK) using PBKDF2-HMAC-SHA256 (600,000 iterations) with a fresh 16-byte random salt.
   - Wraps the FEK with the KEK using NIST SP 800-38F AES Key Wrap (40-byte envelope).
   - Encrypts the payload with AES-256-GCM using a fresh 12-byte nonce and 21-byte Additional Authenticated Data (AAD).
   - Serializes into a self-contained `.cvault` binary container.
5. The application triggers a download of `<filename>.cvault`.
6. **Zero-Knowledge Guarantee:** The plaintext file and encryption password are never sent to the backend server. Only the encrypted container is downloaded. This operation consumes **0 credits**.

### Workflow B — Import and Decrypt an Existing Encrypted File
1. Open CipherVault and navigate to either:
   - **Decrypt File** in the top navigation bar (`/decrypt`), available publicly to all users without authentication.
   - **Secure Vault** (`/vault`) -> **Import & Decrypt (.cvault)** when signed in.
2. Select or drag-and-drop the `.cvault` container received from another user.
3. CipherVault instantly parses and inspects the container header:
   - Validates the magic signature (`CVLT`) and format version (`v1`).
   - Verifies that key-derivation parameters are within safe bounds ($100,000 \le \text{iterations} \le 5,000,000$).
   - Displays non-sensitive metadata: algorithm (AES-256-GCM), KDF (PBKDF2-HMAC-SHA256), iterations (600,000), salt (hex), nonce (hex), auth tag (hex), and ciphertext size.
4. Enter the decryption password supplied by the sender and click **Decrypt & Download Plaintext**.
5. The application unwraps the FEK, validates the 128-bit MAC tag with AAD, reconstructs the original plaintext in memory, and triggers the download.
6. **Integrity & Tamper Resistance:** If the password is wrong, or if even a single byte of ciphertext, nonce, or authentication tag was modified, authenticated decryption fails immediately and zero plaintext is released.

### Encrypted Container vs. Plaintext Download
- **Download Encrypted File (`.cvault`):** Downloads the raw ciphertext container. The file remains strongly encrypted at rest and requires the password to open.
- **Decrypt & Download Plaintext:** Recovers the unencrypted file. Once saved, the resulting file is no longer protected by CipherVault encryption. Users are explicitly cautioned about this distinction in the interface.

### Out-of-Band Password Sharing Advisory
> [!IMPORTANT]
> Always transmit the decryption password through a separate, secure communication channel (e.g. Signal, encrypted voice call, in-person exchange) rather than through the same channel used to send the `.cvault` file. Never attach the password in the same email or message as the encrypted container.

### Sample Demonstration Container
The repository includes a pre-encrypted demonstration file:
- **File:** `CipherVault_Demo_Encrypted.cvault`
- **Password:** `DemoVault@2026!`
- **Verification:** Import this file at `/decrypt` or `/vault` to test independent decryption and verification.

---

## 2. Portable `.cvault` Binary Container Specification (Version 1)

The `.cvault` file format is a self-contained, versioned binary container designed for independent portability:

| Byte Offset | Field Length | Data Type | Description |
|---|---|---|---|
| `0x00 .. 0x03` | 4 bytes | ASCII String | Magic Signature: ASCII `'CVLT'` (`0x43 0x56 0x4C 0x54`) |
| `0x04` | 1 byte | uint8 | Format Version: `0x01` (Version 1) |
| `0x05 .. 0x14` | 16 bytes | Raw Bytes | CSPRNG Random Salt (PBKDF2 salt) |
| `0x15 .. 0x18` | 4 bytes | uint32 BE | KDF Iterations (Big-Endian, default: 600,000) |
| `0x19 .. 0x40` | 40 bytes | Raw Bytes | NIST SP 800-38F AES Key Wrap (Wrapped 256-bit FEK) |
| `0x41 .. 0x4C` | 12 bytes | Raw Bytes | AES-GCM Initialization Vector (96-bit Nonce) |
| `0x4D .. 0x5C` | 16 bytes | Raw Bytes | AES-GCM Authentication Tag (128-bit MAC) |
| `0x5D .. EOF` | Variable | Raw Bytes | AES-256-GCM Ciphertext Payload |

**Additional Authenticated Data (AAD):**  
To prevent header truncation, splicing, or version-downgrade attacks, the first 21 bytes (`'CVLT'` + `Version` + `Salt`) are fed as Additional Authenticated Data into AES-GCM encryption and decryption. If an attacker modifies the version byte or salt, the AES-GCM authentication tag verification fails immediately.

---

## 3. Public Features & Authentication Gating

CipherVault 2.0 features a dedicated public website experience alongside authenticated secure application modules:

- **Public Features Page (`/features`):** Accessible without authentication. Explains Secure File Vault, File Encryption & Decryption, Cryptography Learning Lab, Key Management, and Security Activity with clean, minimal light-themed sections.
- **Authentication Gating:** Public visitors can browse `/features` and explore `/lab` freely. When unauthenticated visitors click a restricted action (e.g. *Try Secure Vault* or *View Security Activity*), the application presents a clear authentication prompt and preserves the intended destination (`/login?redirect=...`). After successful sign-in or registration, users are automatically redirected to their chosen feature.
- **Password Visibility Control:** The login and registration forms feature a dedicated show/hide password toggle.

---

## 2. Free Evaluation Credit System

To allow immediate evaluation of client-side file encryption without requiring payment or external setup:

### Credit Allocation & Policy
- **New Account Grant:** Every new registered account automatically receives **25 free credits** upon creation.
- **Credit Consumption:** Exactly **1 credit** is consumed when a file encryption and vault upload operation successfully completes. Failed uploads do not consume credits.
- **Always-Free Operations:** File downloads, authenticated file decryptions, metadata viewing, and Cryptography Lab exercises **never consume credits** and remain completely accessible even if an account reaches zero credits.
- **Usage & History Page (`/credits`):** Authenticated users can inspect their real persisted balance, initial allocation, credits consumed, and a detailed transaction history table.
- **Authorized Evaluation:** For course staff and authorized academic evaluators, pre-configured evaluation account details are documented separately in the private assessment guide (`README_PRIVATE.md`), excluded from public release packages.

---

## 3. Architecture & Security Invariants

```
+-----------------------------------------------------------------------------------------+
|                                    CIPHERVAULT 2.0                                      |
+---------------------------------------------------+-------------------------------------+
|        BROWSER CLIENT (Untrusted Env /            |    BACKEND SERVER & PERSISTENCE     |
|         Trusted Cryptographic Context)            |      (Zero-Knowledge of Plaintext)  |
+---------------------------------------------------+-------------------------------------+
| - Public Features & Lab exploration               | - Next.js 14 App Router API routes  |
| - Web Crypto API (SubtleCrypto) AES-256-GCM       | - SQLite Database via Prisma ORM    |
| - Ephemeral 256-bit FEK generated via CSPRNG      | - User records & Argon2id passwords |
| - Master KEK (PBKDF2-HMAC-SHA256, 600,000 iters)  | - CreditAccount & CreditTransaction |
| - AES-KW Envelope Encryption (40-byte wrapped FEK)| - File metadata (UUID storage IDs)  |
| - Versioned .cvault container (93-byte header)    | - Local blob storage (.cvault files)|
| - Tamper rejection (128-bit MAC tag with AAD)     | - Server-side IDOR ownership checks |
| - Plaintext recovered strictly in browser RAM     | - Privacy-aware audit logger (IP hash) |
+---------------------------------------------------+-------------------------------------+
```

---

## 4. Directory Structure

```
bootcamp/
├── src/                             # Next.js Full-Stack Application
│   ├── app/                         # App Router Pages & API Endpoints
│   │   ├── layout.tsx               # Root light-theme layout & navigation
│   │   ├── page.tsx                 # Public landing portal
│   │   ├── features/page.tsx        # Public Features Overview & gated CTAs
│   │   ├── credits/page.tsx         # Account Credit Balance & Usage History
│   │   ├── login/page.tsx           # Authentication UI with Demo Account section
│   │   ├── vault/page.tsx           # Secure File Vault Dashboard (Upload/Decrypt)
│   │   ├── lab/page.tsx             # Interactive Cryptography Lab & Visualizer
│   │   ├── audit/page.tsx           # Security Audit History Viewer
│   │   └── api/                     # REST API Route Handlers
│   │       ├── auth/                # /api/auth (register, login, logout, me)
│   │       ├── credits/history/     # /api/credits/history (balance & audit log)
│   │       ├── vault/               # /api/vault (files, upload, download, delete)
│   │       └── audit/               # /api/audit (sanitized event log query)
│   ├── components/
│   │   └── Navbar.tsx               # Header with dynamic credit badge & auth state
│   └── lib/                         # Shared Core Modules
│       ├── prisma.ts                # Prisma database client singleton
│       ├── auth/                    # Session management (JWT), Argon2id & demo account
│       ├── crypto/                  # Web Crypto AES-256-GCM, container & classical ciphers
│       └── storage/                 # Local blob storage abstraction with UUIDs
├── ciphervault/                     # Python Core Package (Educational Lab & Engine)
│   ├── charset.py                   # 92-char custom alphabet & lookup tables
│   ├── keygen.py                    # CSPRNG key & salt generation (secrets)
│   ├── ciphers/                     # Caesar, Substitution, and Shuffle ciphers
│   ├── auth/                        # Argon2id hasher & atomic JSON user store
│   └── vault/                       # Python AES-256-GCM engine & .cvault parser
├── prisma/                          # Relational Database Schema & Migrations
│   ├── schema.prisma                # User, CreditAccount, FileRecord, AuditLog models
│   └── dev.db                       # Local SQLite database
├── tests-ts/                        # Vitest Integration & Security Test Suites
│   ├── classical.test.ts            # Classical ciphers & frequency entropy
│   ├── crypto.test.ts               # Web Crypto AES-GCM, PBKDF2 & tampering rejection
│   ├── isolation.test.ts            # Multi-tenant isolation & IDOR prevention
│   ├── integration_e2e.test.ts      # Multi-format (PDF, DOCX, PNG, BIN) roundtrip
│   └── credits_and_gating.test.ts   # Credit accounting, deduction & auth gating
├── tests/                           # Python PyTest Suite (70 test cases)
└── scripts/                         # Operational & Packaging Scripts
    ├── seed_demo.ts                 # Idempotent demo account provisioner
    ├── package_source.py            # Clean ZIP archive packager (<10MB)
    └── generate_report.py           # Academic Word report generator (.docx)
```

---

## 5. Quick Start & Localhost Execution

### Prerequisites
- **Node.js**: v18.17+ or v20+ (`node -v`)
- **Python**: v3.10+ (`python --version`)

### Web Application Launch (Localhost)
```bash
# 1. Install Node.js dependencies
npm install

# 2. Push database schema to SQLite
npx prisma db push

# 3. Seed demonstration account (100 credits)
npx tsx scripts/seed_demo.ts

# 4. Start local development server
npm run dev
```
The application will be live at **`http://localhost:3000`**.

### Python Reference Verification
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run full automated Python test suite
pytest tests/ -v

# 3. Run built-in self-test verification
python CipherVault.py --test
```

---

## 6. Automated Testing Matrix

| Test Suite | Command | Result | Notes |
|---|---|---|---|
| **Python Unit & Regression** | `pytest tests/ -v` | **70 PASSED** (5.33s) | Modulo-92 Caesar, bijection, shuffle, Argon2id, atomic persistence. |
| **Vitest Web Crypto & Isolation** | `npx vitest run` | **29 PASSED** (9.10s) | Web Crypto AES-GCM, PBKDF2, AES-KW, portable sharing, tampering rejection, IDOR isolation, credit accounting. |
| **Python Standalone Self-Test** | `python CipherVault.py --test` | **22 PASSED** (0.75s) | In-process verification of core invariant mappings. |
| **TypeScript Type Check** | `npx tsc --noEmit` | **0 ERRORS** | Strict type-safety across all routes, pages, and components. |
| **Next.js Production Build** | `npm run build` | **SUCCESS** | 19 static/dynamic routes compiled cleanly (87.3 kB shared JS). |

**Total Automated Assertions:** **121 Passed, 0 Failed, 0 Skipped.**

---

## 7. Submission Artifacts

- **Source Code Archive:** [`CipherVault2_IndustryReady_Source.zip`](file:///d:/Desktop/HackShift/bootcamp/CipherVault2_IndustryReady_Source.zip)
- **Academic Project Report:** [`CipherVault2_Project_Report.docx`](file:///d:/Desktop/HackShift/bootcamp/CipherVault2_Project_Report.docx)
- **Comprehensive Audit Report:** [`CIPHERVAULT_FINAL_AUDIT_REPORT.md`](file:///d:/Desktop/HackShift/bootcamp/CIPHERVAULT_FINAL_AUDIT_REPORT.md)
- **Test Results Matrix:** [`TEST_RESULTS.md`](file:///d:/Desktop/HackShift/bootcamp/TEST_RESULTS.md)
- **Python Dependencies:** [`requirements.txt`](file:///d:/Desktop/HackShift/bootcamp/requirements.txt)
