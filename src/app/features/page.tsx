import Link from "next/link";
import { Shield, Lock, Cpu, Key, Activity, ArrowRight, CheckCircle2, AlertTriangle, FileCheck, Sparkles } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="space-y-16 py-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide">
          <Shield className="w-3.5 h-3.5" />
          <span>Product Architecture & Security Capabilities</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Modern Zero-Knowledge Vault & <br />
          <span className="text-blue-600">Interactive Cryptography Lab</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Explore CipherVault 2.0: an enterprise-focused zero-knowledge file security platform
          strictly separated from an educational cryptanalysis laboratory.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-4">
          <Link
            href="/vault"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            <span>Try Secure Vault</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/lab"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm transition"
          >
            <span>Open Cryptography Lab</span>
          </Link>
        </div>
      </section>

      {/* Free Demo Credits Callout */}
      <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-800 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Free Evaluation Credits Included</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Every new registered account receives <strong>25 free demo credits</strong>. Or use our
            pre-configured evaluation demo account with <strong>100 demo credits</strong>. One credit
            is consumed per encrypted file upload. File decryption and lab features are always free.
          </p>
        </div>
        <Link
          href="/login"
          className="whitespace-nowrap px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition shadow-sm"
        >
          Access Demo Account
        </Link>
      </section>

      {/* Feature Sections */}
      <div className="space-y-12">
        {/* Feature A: Secure File Vault */}
        <section className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Module B &bull; Production Security
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Secure File Vault</h2>
              </div>
            </div>
            <Link
              href="/vault"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm w-fit"
            >
              <span>Try Secure Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            The Secure File Vault stores documents in zero-knowledge encrypted form. All files (PDF,
            DOCX, PNG, binary payloads) are encrypted client-side in browser RAM before network
            transit. The server acts exclusively as a blind ciphertext storage provider.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Binary .cvault Container</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                93-byte structured header containing version byte, salt, IV, wrapped key envelope, and
                auth tag with Additional Authenticated Data (AAD) binding.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Tampering Detection</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                128-bit authentication tags ensure single bit-flip modifications to ciphertext or
                metadata abort atomically with zero plaintext leaked.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Multi-Tenant Isolation</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strict server-side authorization ensures users can only list, download, or delete their
                own files, eliminating IDOR vulnerabilities.
              </p>
            </div>
          </div>
        </section>

        {/* Feature B: File Encryption & Decryption */}
        <section className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Client Cryptography
                </span>
                <h2 className="text-2xl font-bold text-slate-900">File Encryption & Decryption</h2>
              </div>
            </div>
            <Link
              href="/vault"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm w-fit"
            >
              <span>Try Encryption</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            All cryptographic operations leverage the native browser Web Crypto API (SubtleCrypto).
            Original documents are transformed using authenticated AES-256-GCM with hardware
            acceleration. Decryption requires the authorized master passphrase; wrong keys and
            corrupted containers fail safely.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
              <h4 className="font-semibold text-slate-800 text-sm">NIST SP 800-38D AES-GCM</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unique 96-bit CSPRNG nonces per file operation prevent IV reuse. The 128-bit MAC
                authenticates both the ciphertext and file format headers.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
              <h4 className="font-semibold text-slate-800 text-sm">Multi-Format Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verified across PDF, DOCX, TXT, PNG, BIN, and empty 0-byte files with exact SHA-256
                byte equality upon roundtrip retrieval.
              </p>
            </div>
          </div>
        </section>

        {/* Feature C: Cryptography Learning Lab */}
        <section className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Module A &bull; Educational Only
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Cryptography Learning Lab</h2>
              </div>
            </div>
            <Link
              href="/lab"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm w-fit"
            >
              <span>Open Cryptography Lab</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs sm:text-sm">
            <strong>Security Notice:</strong> Classical ciphers (Caesar, Random Substitution, Shuffle
            Transposition) are strictly educational tools for demonstrating frequency analysis and
            cryptanalysis weaknesses. They are completely separated from the vault and must never be
            used to protect confidential files.
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            The lab features mathematical step-by-step visualizations of character mappings over a
            standardized 92-symbol printable ASCII alphabet (ASCII 32 to 126, excluding characters 34, 92, and 96).
            Explore cipher transformation mechanics, key permutation validations, and Shannon entropy
            visualizations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Modulo-92 Caesar</h4>
              <p className="text-xs text-slate-600">
                Rotational shift cipher with non-wrapping space preservation at index 0.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Bijective Substitution</h4>
              <p className="text-xs text-slate-600">
                Exact permutation validation with CSPRNG Fisher-Yates shuffling.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Shuffle Transposition</h4>
              <p className="text-xs text-slate-600">
                Block position permutation with reversible index sequence mapping.
              </p>
            </div>
          </div>
        </section>

        {/* Feature D: Secure Key Management */}
        <section className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Key Architecture
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Secure Key Management</h2>
              </div>
            </div>
            <Link
              href="/vault"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm w-fit"
            >
              <span>Explore Key Management</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            CipherVault employs envelope encryption. A unique 256-bit File Encryption Key (FEK) is
            generated per document. The FEK is wrapped using NIST SP 800-38F AES Key Wrap (AES-KW) with
            a Key Encryption Key (KEK) derived from your passphrase via PBKDF2 (600,000 iterations,
            SHA-256).
          </p>

          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs sm:text-sm space-y-2">
            <div className="font-semibold text-slate-900 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Zero-Knowledge Consequence Disclosure</span>
            </div>
            <p>
              Because the server never possesses master passphrases or unencrypted FEKs, there is no
              master backdoor or server-side key escrow. If a user forgets their master passphrase,
              encrypted files cannot be decrypted by any party.
            </p>
          </div>
        </section>

        {/* Feature E: Security Activity & Privacy Audit */}
        <section className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Auditability & Privacy
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Security Activity & Privacy Audit</h2>
              </div>
            </div>
            <Link
              href="/audit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm w-fit"
            >
              <span>View Security Activity</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Every security-critical event (logins, registrations, uploads, downloads, deletions, and
            unauthorized access attempts) is recorded in an immutable audit trail.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Privacy-Preserving IP Hashing</h4>
              <p className="text-xs text-slate-600">
                Client IP addresses are anonymized via truncated SHA-256 digests, preventing tracking
                while enabling intrusion detection.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Zero Plaintext Logging</h4>
              <p className="text-xs text-slate-600">
                Audit logs strictly prohibit plaintext file names, passwords, and cryptographic key
                material.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Final CTA Section */}
      <section className="text-center p-10 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Ready to experience client-side zero-knowledge encryption?
        </h3>
        <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
          Sign in with the instant demonstration account (100 credits) or create a new account (25
          credits) to start encrypting files immediately.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            Sign In with Demo Account
          </Link>
          <Link
            href="/login?tab=register"
            className="px-6 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-sm transition"
          >
            Create New Account
          </Link>
        </div>
      </section>
    </div>
  );
}
