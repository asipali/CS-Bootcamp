# CipherVault 2.0 — Industry-Oriented Secure File Vault & Cryptography Security Lab

[![Tests Status](https://img.shields.io/badge/All%20Tests-116%20passed-brightgreen)](#)
[![Python Tests](https://img.shields.io/badge/pytest-70%20passed-success)](#)
[![Vitest Tests](https://img.shields.io/badge/vitest-24%20passed-success)](#)
[![Next.js Build](https://img.shields.io/badge/next.js-14.2%20build%20passing-blue)](#)
[![Crypto Architecture](https://img.shields.io/badge/crypto-AES--256--GCM%20%2B%20AES--KW-orange)](#)

CipherVault 2.0 is an enterprise-focused zero-knowledge file security platform and educational cryptography laboratory. It combines two strictly separated capabilities:

1. **Module A — Cryptography Learning Lab (Educational):**  
   Preserves classical ciphers (Caesar, Random Substitution, and Shuffle Transposition) over a standardized 92-character alphabet ($32–126 \setminus \{34, 92, 96\}$). Features live character transformation visualizers, frequency analysis histograms, and Shannon entropy calculators. Clearly labeled as mathematically broken and unsuitable for real confidential data.

2. **Module B — Secure File Vault (Zero-Knowledge):**  
   Hardware-accelerated **AES-256-GCM** client-side file encryption (Web Crypto API) encapsulated in a structured 93-byte `.cvault` container format. Features PBKDF2-HMAC-SHA256 (600,000 iterations) key derivation, NIST SP 800-38F AES Key Wrap (AES-KW) envelope encryption, server-side user isolation (Next.js, Prisma ORM, SQLite), privacy-aware audit logging, and a **persistent free-credit evaluation system**.

---

## 1. Public Features & Authentication Gating

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
| **Python Unit & Regression** | `pytest tests/ -v` | **70 PASSED** (5.51s) | Modulo-92 Caesar, bijection, shuffle, Argon2id, atomic persistence. |
| **Vitest Web Crypto & Isolation** | `npx vitest run` | **24 PASSED** (9.35s) | Web Crypto AES-GCM, PBKDF2, AES-KW, IDOR isolation, credit accounting. |
| **Python Standalone Self-Test** | `python CipherVault.py --test` | **22 PASSED** (0.75s) | In-process verification of core invariant mappings. |
| **TypeScript Type Check** | `npx tsc --noEmit` | **0 ERRORS** | Strict type-safety across all routes, pages, and components. |
| **Next.js Production Build** | `npm run build` | **SUCCESS** | 18 static/dynamic routes compiled cleanly (87.3 kB shared JS). |

**Total Automated Assertions:** **116 Passed, 0 Failed, 0 Skipped.**

---

## 7. Submission Artifacts

- **Source Code Archive:** [`CipherVault2_IndustryReady_Source.zip`](file:///d:/Desktop/HackShift/bootcamp/CipherVault2_IndustryReady_Source.zip)
- **Academic Project Report:** [`CipherVault2_Project_Report.docx`](file:///d:/Desktop/HackShift/bootcamp/CipherVault2_Project_Report.docx)
- **Comprehensive Audit Report:** [`CIPHERVAULT_FINAL_AUDIT_REPORT.md`](file:///d:/Desktop/HackShift/bootcamp/CIPHERVAULT_FINAL_AUDIT_REPORT.md)
- **Test Results Matrix:** [`TEST_RESULTS.md`](file:///d:/Desktop/HackShift/bootcamp/TEST_RESULTS.md)
- **Python Dependencies:** [`requirements.txt`](file:///d:/Desktop/HackShift/bootcamp/requirements.txt)
