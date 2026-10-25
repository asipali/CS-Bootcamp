import Link from "next/link";
import { Shield, Lock, BookOpen, Key, Cpu, FileCheck, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide">
          <Shield className="w-3.5 h-3.5" />
          <span>Industry-Oriented Cryptography & Security Lab</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Defense-in-Depth File Vault & <br />
          <span className="text-blue-600">
            Interactive Cryptanalysis Lab
          </span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          CipherVault 2.0 strictly decouples educational classical algorithms from
          production-grade zero-knowledge file encryption. Your plaintext files and keys never leave
          your browser unencrypted.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/features"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm inline-flex items-center space-x-1.5"
          >
            <span>Explore All Features</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/vault"
            className="px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm transition"
          >
            Open Secure Vault
          </Link>
        </div>
      </div>

      {/* Free Evaluation Allowance Callout */}
      <div className="max-w-4xl mx-auto rounded-xl border border-blue-200 bg-blue-50/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-slate-800 text-xs sm:text-sm">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-blue-900">Evaluation Allowance:</span>{" "}
            Register an account to receive <strong>25 free demo credits</strong> for zero-knowledge file encryption. Decryption and lab exercises are always free.
          </div>
        </div>
        <Link
          href="/login"
          className="whitespace-nowrap px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
        >
          Sign In / Register
        </Link>
      </div>

      {/* Dual Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Module B: Secure File Vault */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Lock className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                MODULE B &bull; PRODUCTION
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Secure File Vault</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Zero-knowledge document storage. Files (PDF, DOCX, PNG, binary) are encrypted locally
              using hardware-accelerated <strong>AES-256-GCM</strong> with 128-bit authentication
              tags and unique 96-bit nonces before network transmission.
            </p>
            <ul className="text-xs text-slate-700 space-y-2 pt-2">
              <li className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Versioned <code>.cvault</code> container format with tamper rejection</span>
              </li>
              <li className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>PBKDF2-HMAC-SHA256 (600,000 iters) envelope key wrapping</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Strict server-side user isolation & privacy-aware audit logs</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <Link
              href="/vault"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <span>Try Secure Vault</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Module A: Cryptography Learning Lab */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                MODULE A &bull; EDUCATIONAL
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cryptography Lab</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hands-on cryptanalysis laboratory. Explore Caesar, Random Substitution, and Shuffle
              Transposition over the custom 92-character alphabet with live character transformation
              visualizers and frequency analysis.
            </p>
            <ul className="text-xs text-slate-700 space-y-2 pt-2">
              <li className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                <span>Step-by-step character index mapping visualizer</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Live letter frequency & Shannon entropy calculators</span>
              </li>
              <li className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-slate-500" />
                <span>Strict 92-char bijection key validation & CSPRNG generator</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <Link
              href="/lab"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
            >
              <span>Explore Crypto Lab</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
