"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Unlock,
  Shield,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Download,
  Lock,
  ArrowRight,
  HardDrive,
  FileCode,
} from "lucide-react";
import { decryptFileClientSide, inferMimeTypeAndExtension } from "@/lib/crypto/web-crypto";
import { inspectContainer, ContainerInspection } from "@/lib/crypto/container";

export default function DecryptPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [inspection, setInspection] = useState<ContainerInspection | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [status, setStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
    details?: string;
  } | null>(null);
  const [decryptedInfo, setDecryptedInfo] = useState<{
    fileName: string;
    size: number;
    downloadUrl: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Max 50 MB check
    if (file.size > 50 * 1024 * 1024) {
      setStatus({
        type: "error",
        message: "File is too large. Maximum supported container size is 50 MB.",
      });
      return;
    }

    setSelectedFile(file);
    setStatus(null);
    setDecryptedInfo(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const insp = inspectContainer(bytes);
      setInspection(insp);

      if (!insp.isValid) {
        setStatus({
          type: "error",
          message: insp.error || "Unsupported or corrupted .cvault file format.",
        });
      }
    } catch (err: any) {
      setStatus({
        type: "error",
        message: `Failed to read file: ${err.message}`,
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileBytes || !selectedFile) {
      setStatus({ type: "error", message: "Please select an encrypted .cvault file." });
      return;
    }

    if (!password) {
      setStatus({ type: "error", message: "Decryption password is required." });
      return;
    }

    setIsDecrypting(true);
    setStatus({
      type: "info",
      message: "Verifying container header, unwrapping FEK, and checking 128-bit AES-GCM MAC...",
    });

    try {
      // Execute authenticated client-side decryption in volatile browser memory
      const decryptedBytes = await decryptFileClientSide(fileBytes, password);

      // Infer mime type and file extension
      const { mimeType, suggestedName } = inferMimeTypeAndExtension(
        decryptedBytes,
        selectedFile.name
      );

      // Create download blob
      const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);

      setDecryptedInfo({
        fileName: suggestedName,
        size: decryptedBytes.length,
        downloadUrl,
      });

      setStatus({
        type: "success",
        message: `Decryption successful! AES-GCM authentication tag verified. '${suggestedName}' is ready to download.`,
        details: `Cryptographic integrity confirmed. ${decryptedBytes.length.toLocaleString()} bytes reconstructed.`,
      });

      // Auto-trigger browser download
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setStatus({
        type: "error",
        message: "Decryption failed: Incorrect password or corrupted container.",
        details:
          "Authentication tag verification failed or key derivation parameters do not match. Zero plaintext leaked.",
      });
      setDecryptedInfo(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleClear = () => {
    if (decryptedInfo?.downloadUrl) {
      URL.revokeObjectURL(decryptedInfo.downloadUrl);
    }
    setSelectedFile(null);
    setFileBytes(null);
    setInspection(null);
    setPassword("");
    setStatus(null);
    setDecryptedInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Decrypt Encrypted File
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Zero-Knowledge Client Decryption
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Import any password-protected <code>.cvault</code> container. Plaintext is reconstructed
            strictly within your browser RAM via the Web Crypto API.
          </p>
        </div>

        <Link
          href="/vault"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-xs w-fit"
        >
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span>Open Secure Vault</span>
        </Link>
      </div>

      {/* Status Notifications */}
      {status && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 shadow-xs ${
            status.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : status.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          {status.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : status.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-semibold">{status.message}</div>
            {status.details && <p className="opacity-90">{status.details}</p>}
          </div>
        </div>
      )}

      {/* Decrypt Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Picker & Password Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleDecrypt} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span>1. Select Encrypted Container</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Supports .cvault files</span>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/70"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".cvault"
                onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <HardDrive className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-90" />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-blue-600 font-medium">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Container loaded
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag and drop a .cvault file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select an encrypted file you received from CipherVault or exported from Secure Vault
                  </p>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>2. Decryption Password</span>
              </div>
              <p className="text-xs text-slate-600">
                Enter the password established when this file was encrypted.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter decryption password..."
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {selectedFile ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Clear File
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={!selectedFile || !password || isDecrypting || inspection?.isValid === false}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-sm flex items-center space-x-2"
              >
                <Unlock className="w-4 h-4" />
                <span>{isDecrypting ? "Verifying & Decrypting..." : "Decrypt & Download"}</span>
              </button>
            </div>
          </form>

          {/* Downloaded File Notice if already decrypted */}
          {decryptedInfo && (
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-emerald-900 text-sm flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Plaintext File Recovered: {decryptedInfo.fileName}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Size: {(decryptedInfo.size / 1024).toFixed(1)} KB &bull; If the automatic download
                  did not begin, use the button on the right.
                </p>
              </div>
              <a
                href={decryptedInfo.downloadUrl}
                download={decryptedInfo.fileName}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Again</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Column: Cryptographic Container Inspection Details */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <FileCode className="w-4 h-4 text-blue-600" />
              <span>Container Metadata Inspection</span>
            </div>

            {inspection && inspection.isValid ? (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Valid .cvault Binary Signature (CVLT)</span>
                </div>

                <div className="space-y-2 pt-1 font-mono text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-500 font-sans">Format Version: </span>
                    <span className="font-semibold text-slate-900">v{inspection.version}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">Cipher Algorithm: </span>
                    <span className="font-semibold text-slate-900">{inspection.algorithm}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">KDF Function: </span>
                    <span className="font-semibold text-slate-900">{inspection.kdfAlgorithm}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">KDF Iterations: </span>
                    <span className="font-semibold text-slate-900">
                      {inspection.iterations?.toLocaleString()} iters
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">Ciphertext Size: </span>
                    <span className="font-semibold text-slate-900">
                      {inspection.ciphertextSize} bytes
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">Salt (128-bit): </span>
                    <span className="truncate block text-[10px] text-slate-600">{inspection.saltHex}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">Nonce IV (96-bit): </span>
                    <span className="truncate block text-[10px] text-slate-600">{inspection.nonceHex}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans">Auth Tag (128-bit MAC): </span>
                    <span className="truncate block text-[10px] text-slate-600">{inspection.authTagHex}</span>
                  </div>
                </div>
              </div>
            ) : inspection && !inspection.isValid ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                <div className="font-semibold">Format Validation Error</div>
                <p>{inspection.error}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Select an encrypted <code>.cvault</code> container file to inspect its non-secret
                cryptographic headers, format version, and derivation parameters.
              </p>
            )}
          </div>

          {/* Security Notice Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Zero-Knowledge Decryption</span>
            </div>
            <p className="leading-relaxed">
              Decryption is executed entirely in your browser memory via the native Web Crypto API.
              Your password and unencrypted file are never sent to the network or stored in disk caches.
            </p>
            <p className="leading-relaxed pt-1 text-slate-500">
              <strong>Post-Decryption Notice:</strong> Once downloaded, the resulting plaintext file is
              no longer protected by the <code>.cvault</code> container. Handle plaintext files responsibly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
