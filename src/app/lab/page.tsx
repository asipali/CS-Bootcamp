"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  AlertTriangle,
  RotateCw,
  Shuffle,
  BarChart2,
  Key,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  CHARSET,
  CHARSET_LENGTH,
} from "@/lib/crypto/constants";
import {
  CaesarCipherTS,
  SubstitutionCipherTS,
  ShuffleCipherTS,
  calculateFrequency,
} from "@/lib/crypto/classical";

export default function CryptoLabPage() {
  const [activeTab, setActiveTab] = useState<"caesar" | "substitution" | "shuffle">("caesar");
  const [inputText, setInputText] = useState("CIPHERVAULT 2.0 LAB EXPERIMENT");
  const [caesarShift, setCaesarShift] = useState(7);
  const [substitutionKey, setSubstitutionKey] = useState(
    SubstitutionCipherTS.generateRandomKey()
  );
  const [shuffleKeyInput, setShuffleKeyInput] = useState("4, 0, 1, 3, 2");
  const [copied, setCopied] = useState(false);

  // Compute cipher outputs
  const caesarCipher = useMemo(() => new CaesarCipherTS(caesarShift), [caesarShift]);
  const caesarOutput = useMemo(() => caesarCipher.encrypt(inputText), [caesarCipher, inputText]);
  const caesarSteps = useMemo(
    () => caesarCipher.getTransformationSteps(inputText.slice(0, 12)),
    [caesarCipher, inputText]
  );

  const substitutionCipher = useMemo(() => {
    try {
      return new SubstitutionCipherTS(substitutionKey);
    } catch {
      return null;
    }
  }, [substitutionKey]);

  const substitutionOutput = useMemo(() => {
    if (!substitutionCipher) return "[INVALID KEY: Key must contain all 92 unique CHARSET symbols]";
    return substitutionCipher.encrypt(inputText);
  }, [substitutionCipher, inputText]);

  const shuffleCipher = useMemo(() => new ShuffleCipherTS(), []);
  const shuffleOutput = useMemo(() => {
    try {
      return shuffleCipher.encrypt(inputText, shuffleKeyInput);
    } catch (err: any) {
      return `[SHUFFLE ERROR: ${err.message}]`;
    }
  }, [shuffleCipher, inputText, shuffleKeyInput]);

  // Frequency analysis
  const currentCiphertext =
    activeTab === "caesar"
      ? caesarOutput
      : activeTab === "substitution"
      ? substitutionOutput
      : shuffleOutput;

  const plainFreq = useMemo(() => calculateFrequency(inputText), [inputText]);
  const cipherFreq = useMemo(() => calculateFrequency(currentCiphertext), [currentCiphertext]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Educational Notice Banner */}
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs sm:text-sm flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold text-amber-800">
            EDUCATIONAL CRYPTANALYSIS LABORATORY &bull; NOT FOR CONFIDENTIAL USE
          </p>
          <p className="text-amber-900/90">
            Classical ciphers (Caesar, Monoalphabetic Substitution, and Transposition) are
            <strong> mathematically broken</strong>. They preserve letter frequencies, possess trivial
            key spaces, and offer <strong>zero confidentiality</strong> against modern cryptanalysis.
            These tools are provided strictly for educational study and vulnerability demonstration.
            For confidential data, use the <strong>AES-256-GCM Secure Vault</strong>.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cryptography Lab</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              MODULE A &bull; EDUCATIONAL
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Analyze classical cipher mechanics, visual transformations, and statistical frequency distributions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab("caesar")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "caesar"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Caesar Rotational
          </button>
          <button
            onClick={() => setActiveTab("substitution")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "substitution"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Random Substitution
          </button>
          <button
            onClick={() => setActiveTab("shuffle")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "shuffle"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Shuffle Transposition
          </button>
        </div>
      </div>

      {/* Interactive Controls & Plaintext Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Text Area */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Plaintext Message (Custom 92-Char Alphabet)
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono placeholder:text-slate-400"
            placeholder="Type plaintext to encrypt..."
          />
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Length: {inputText.length} characters</span>
            <span>Entropy: {plainFreq.entropy.toFixed(3)} bits/char</span>
          </div>
        </div>

        {/* Algorithm Specific Key Controls */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          {activeTab === "caesar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Rotational Shift (k mod 92)
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">
                  {caesarShift}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="91"
                value={caesarShift}
                onChange={(e) => setCaesarShift(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Shift $k \in [0, 91]$. Since there are only 91 non-trivial keys, a computer can
                test every key in under 1 millisecond.
              </p>
            </div>
          )}

          {activeTab === "substitution" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Substitution Key (92 chars)
                </span>
                <button
                  onClick={() => setSubstitutionKey(SubstitutionCipherTS.generateRandomKey())}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] border border-blue-200 font-medium"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>New CSPRNG Key</span>
                </button>
              </div>
              <input
                type="text"
                value={substitutionKey}
                onChange={(e) => setSubstitutionKey(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Key length: {substitutionKey.length}/92. Must contain each character of the 92-char
                alphabet exactly once without duplicates.
              </p>
            </div>
          )}

          {activeTab === "shuffle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Permutation Indices
                </span>
                <button
                  onClick={() => {
                    const k = ShuffleCipherTS.generateKey(inputText.length || 5);
                    setShuffleKeyInput(k.join(", "));
                  }}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] border border-blue-200 font-medium"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Gen Matching Key</span>
                </button>
              </div>
              <input
                type="text"
                value={shuffleKeyInput}
                onChange={(e) => setShuffleKeyInput(e.target.value)}
                placeholder="e.g. 2, 0, 1"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Requires exactly 1 index per character ($0$ to $N-1$) without duplicates.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ciphertext Output */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Encrypted Output ({activeTab.toUpperCase()})
          </span>
          <button
            onClick={() => copyToClipboard(currentCiphertext)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs border border-slate-300 transition font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 font-mono text-sm text-slate-900 break-all border border-slate-200">
          {currentCiphertext}
        </div>
      </div>

      {/* Visual Transformation Steps (Caesar) */}
      {activeTab === "caesar" && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Character Transformation Mapping (First 12 Chars)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {caesarSteps.map((step) => (
              <div
                key={step.index}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono space-y-1"
              >
                <div className="text-[11px] text-slate-500 font-medium">Char #{step.index}</div>
                <div className="text-sm font-bold text-slate-900">
                  &apos;{step.inputChar === " " ? "[space]" : step.inputChar}&apos;
                </div>
                <div className="text-[11px] text-blue-600 font-semibold">
                  pos: {step.origPos} &rarr; {step.newPos}
                </div>
                <div className="text-sm font-bold text-emerald-700">
                  &apos;{step.outputChar === " " ? "[space]" : step.outputChar}&apos;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency Analysis Comparison */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <BarChart2 className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Frequency Distribution & Cryptanalysis
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Monoalphabetic and transposition ciphers fail because they preserve the statistical
          frequency profile of the language. Below is the live frequency breakdown of the top
          characters in your input vs. ciphertext.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Plaintext Frequency */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">Plaintext Character Counts</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {plainFreq.frequencies.slice(0, 6).map((f) => (
                <div key={f.char} className="flex items-center text-xs space-x-2">
                  <span className="w-12 font-mono text-slate-700 truncate">
                    &apos;{f.char === " " ? "[sp]" : f.char}&apos;
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, f.frequency * 100 * 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-600 w-10 text-right font-mono">
                    {f.count} ({Math.round(f.frequency * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ciphertext Frequency */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">Ciphertext Character Counts</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {cipherFreq.frequencies.slice(0, 6).map((f) => (
                <div key={f.char} className="flex items-center text-xs space-x-2">
                  <span className="w-12 font-mono text-slate-700 truncate">
                    &apos;{f.char === " " ? "[sp]" : f.char}&apos;
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, f.frequency * 100 * 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-600 w-10 text-right font-mono">
                    {f.count} ({Math.round(f.frequency * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

