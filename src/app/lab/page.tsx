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
      {/* Un-dismissible Educational Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex items-start space-x-3 shadow-lg shadow-amber-500/5">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold tracking-wide uppercase text-amber-300">
            Educational Cryptography Lab Warning
          </p>
          <p className="leading-relaxed">
            Classical ciphers (Caesar, Monoalphabetic Substitution, and Transposition) are
            <strong> mathematically broken</strong>. They preserve letter frequencies, possess trivial
            key spaces, and offer <strong>zero confidentiality</strong> against modern cryptanalysis.
            These tools are provided strictly for educational study and vulnerability demonstration.
            For confidential data, use the <strong>AES-256-GCM Secure Vault</strong>.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Cryptography Lab</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              MODULE A
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Analyze classical cipher mechanics, visual transformations, and statistical frequency distributions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-gray-900 p-1 border border-cyber-border">
          <button
            onClick={() => setActiveTab("caesar")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "caesar"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Caesar Rotational
          </button>
          <button
            onClick={() => setActiveTab("substitution")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "substitution"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Random Substitution
          </button>
          <button
            onClick={() => setActiveTab("shuffle")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "shuffle"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Shuffle Transposition
          </button>
        </div>
      </div>

      {/* Interactive Controls & Plaintext Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Text Area */}
        <div className="lg:col-span-2 cyber-card p-5 space-y-3">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            Plaintext Message (Custom 92-Char Alphabet)
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-gray-900 border border-cyber-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition font-mono"
            placeholder="Type plaintext to encrypt..."
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Length: {inputText.length} characters</span>
            <span>Entropy: {plainFreq.entropy.toFixed(3)} bits/char</span>
          </div>
        </div>

        {/* Algorithm Specific Key Controls */}
        <div className="cyber-card p-5 space-y-4 border-cyan-500/30">
          {activeTab === "caesar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Rotational Shift (k mod 92)
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {caesarShift}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="91"
                value={caesarShift}
                onChange={(e) => setCaesarShift(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400"
              />
              <p className="text-[11px] text-gray-400">
                Shift $k \in [0, 91]$. Since there are only 91 non-trivial keys, a computer can
                test every key in under 1 millisecond.
              </p>
            </div>
          )}

          {activeTab === "substitution" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Substitution Key (92 chars)
                </span>
                <button
                  onClick={() => setSubstitutionKey(SubstitutionCipherTS.generateRandomKey())}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-[11px] border border-cyan-500/30"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>New CSPRNG Key</span>
                </button>
              </div>
              <input
                type="text"
                value={substitutionKey}
                onChange={(e) => setSubstitutionKey(e.target.value)}
                className="w-full bg-gray-900 border border-cyber-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Key length: {substitutionKey.length}/92. Must contain each character of the 92-char
                alphabet exactly once without duplicates.
              </p>
            </div>
          )}

          {activeTab === "shuffle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Permutation Indices
                </span>
                <button
                  onClick={() => {
                    const k = ShuffleCipherTS.generateKey(inputText.length || 5);
                    setShuffleKeyInput(k.join(", "));
                  }}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-[11px] border border-cyan-500/30"
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
                className="w-full bg-gray-900 border border-cyber-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Requires exactly 1 index per character ($0$ to $N-1$) without duplicates.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ciphertext Output */}
      <div className="cyber-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Encrypted Output ({activeTab.toUpperCase()})
          </span>
          <button
            onClick={() => copyToClipboard(currentCiphertext)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:text-white text-xs border border-gray-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <div className="p-4 rounded-lg bg-gray-950 font-mono text-sm text-cyan-300 break-all border border-gray-800">
          {currentCiphertext}
        </div>
      </div>

      {/* Visual Transformation Steps (Caesar) */}
      {activeTab === "caesar" && (
        <div className="cyber-card p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Character Transformation Mapping (First 12 Chars)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {caesarSteps.map((step) => (
              <div
                key={step.index}
                className="p-2.5 rounded-lg bg-gray-900/90 border border-gray-800 text-center font-mono space-y-1"
              >
                <div className="text-xs text-gray-500">Char #{step.index}</div>
                <div className="text-sm font-bold text-white">
                  &apos;{step.inputChar === " " ? "[space]" : step.inputChar}&apos;
                </div>
                <div className="text-[10px] text-cyan-400">
                  pos: {step.origPos} &rarr; {step.newPos}
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  &apos;{step.outputChar === " " ? "[space]" : step.outputChar}&apos;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency Analysis Comparison */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400">
          <BarChart2 className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Frequency Distribution & Cryptanalysis
          </h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Monoalphabetic and transposition ciphers fail because they preserve the statistical
          frequency profile of the language. Below is the live frequency breakdown of the top
          characters in your input vs. ciphertext.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Plaintext Frequency */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-300">Plaintext Character Counts</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {plainFreq.frequencies.slice(0, 6).map((f) => (
                <div key={f.char} className="flex items-center text-xs space-x-2">
                  <span className="w-12 font-mono text-gray-400 truncate">
                    &apos;{f.char === " " ? "[sp]" : f.char}&apos;
                  </span>
                  <div className="flex-1 bg-gray-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, f.frequency * 100 * 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-gray-500 w-10 text-right">
                    {f.count} ({Math.round(f.frequency * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ciphertext Frequency */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-300">Ciphertext Character Counts</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {cipherFreq.frequencies.slice(0, 6).map((f) => (
                <div key={f.char} className="flex items-center text-xs space-x-2">
                  <span className="w-12 font-mono text-gray-400 truncate">
                    &apos;{f.char === " " ? "[sp]" : f.char}&apos;
                  </span>
                  <div className="flex-1 bg-gray-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, f.frequency * 100 * 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-gray-500 w-10 text-right">
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
