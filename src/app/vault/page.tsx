"use client";

import { useState, useEffect, useRef } from "react";
import {
  Lock,
  Unlock,
  Upload,
  Download,
  Trash2,
  FileCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
} from "lucide-react";
import { encryptFileClientSide, decryptFileClientSide } from "@/lib/crypto/web-crypto";

interface VaultFile {
  id: string;
  originalName: string;
  mimeType: string;
  ciphertextSize: number;
  formatVersion: number;
  algorithm: string;
  createdAt: string;
}

export default function VaultDashboard() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [actionStatus, setActionStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files and user credit balance on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // 1. Check authentication and credit balance
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        window.location.href = "/login?redirect=/vault&reason=vault";
        return;
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user?.credits !== undefined) {
          setCredits(meData.user.credits);
        }
      }

      // 2. Load vault files
      const res = await fetch("/api/vault/files");
      if (res.status === 401) {
        window.location.href = "/login?redirect=/vault&reason=vault";
        return;
      }
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch {
      setActionStatus({ type: "error", message: "Failed to connect to vault API." });
    } finally {
      setLoading(false);
    }
  };


  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleEncryptAndUpload = async () => {
    if (!selectedFile) {
      setActionStatus({ type: "error", message: "Please select a file to encrypt." });
      return;
    }
    if (!masterPassword) {
      setActionStatus({
        type: "error",
        message: "Master Vault Key is required to encrypt your file locally.",
      });
      return;
    }

    setIsEncrypting(true);
    setActionStatus({
      type: "info",
      message: "Executing client-side AES-256-GCM encryption & key derivation...",
    });

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);

      // Client-side encryption: Plaintext never touches network or server
      const containerBytes = await encryptFileClientSide(rawBytes, masterPassword);

      setActionStatus({
        type: "info",
        message: "Encryption complete. Uploading encrypted .cvault container...",
      });

      // Package container blob into FormData
      const formData = new FormData();
      const containerBlob = new Blob([containerBytes as unknown as BlobPart], { type: "application/octet-stream" });
      formData.append("file", containerBlob, `${selectedFile.name}.cvault`);
      formData.append("originalName", selectedFile.name);
      formData.append("mimeType", selectedFile.type || "application/octet-stream");

      const res = await fetch("/api/vault/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      if (result.remainingCredits !== undefined) {
        setCredits(result.remainingCredits);
      }

      setActionStatus({
        type: "success",
        message: `File '${selectedFile.name}' securely encrypted and saved to vault! (1 demo credit deducted, ${result.remainingCredits ?? 0} remaining)`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchFiles();
    } catch (err: any) {
      setActionStatus({ type: "error", message: err.message || "Encryption failed." });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDownloadAndDecrypt = async (file: VaultFile) => {
    if (!masterPassword) {
      setActionStatus({
        type: "error",
        message: "Please enter your Master Vault Key in the Key Management box to decrypt.",
      });
      return;
    }

    setActionStatus({
      type: "info",
      message: `Fetching encrypted container for '${file.originalName}'...`,
    });

    try {
      const res = await fetch(`/api/vault/files/${file.id}/download`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download file.");
      }

      const arrayBuffer = await res.arrayBuffer();
      const containerBytes = new Uint8Array(arrayBuffer);

      setActionStatus({
        type: "info",
        message: "Verifying AES-GCM authentication tag & unwrapping FEK in browser...",
      });

      // Authenticated Client-Side Decryption
      const decryptedBytes = await decryptFileClientSide(containerBytes, masterPassword);

      // Trigger safe browser file download
      const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: file.mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setActionStatus({
        type: "success",
        message: `Authenticated decryption successful! '${file.originalName}' verified and downloaded.`,
      });
    } catch (err: any) {
      setActionStatus({
        type: "error",
        message: `DECRYPTION INTEGRITY FAILURE: ${err.message}`,
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete '${name}' from your vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vault/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Deletion failed.");
      }
      setActionStatus({ type: "success", message: `File '${name}' deleted successfully.` });
      fetchFiles();
    } catch (err: any) {
      setActionStatus({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Secure File Vault</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              AES-256-GCM
            </span>
            {credits !== null && (
              <a
                href="/credits"
                className={`px-2.5 py-0.5 rounded text-xs font-semibold border transition ${
                  credits > 0
                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                }`}
              >
                Demo Credits: {credits}
              </a>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Zero-knowledge client-side encrypted repository. Plaintext is decrypted strictly in browser RAM.
          </p>
        </div>

        <button
          onClick={fetchFiles}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          <span>Refresh Vault</span>
        </button>
      </div>

      {/* Low / Zero Credit Notification */}
      {credits !== null && credits <= 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs sm:text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-amber-800">Demo Credit Allowance Exhausted (0 Remaining)</div>
            <p className="text-amber-900/90 leading-relaxed">
              You have used your free demo upload quota. <strong>All file downloads and decryptions remain completely free and accessible.</strong> New file uploads require credits.
            </p>
          </div>
        </div>
      )}

      {/* Status Alert Banner */}
      {actionStatus && (
        <div
          className={`p-4 rounded-lg text-sm flex items-start space-x-3 transition ${
            actionStatus.type === "error"
              ? "bg-red-50 border border-red-200 text-red-900"
              : actionStatus.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-blue-50 border border-blue-200 text-blue-900"
          }`}
        >
          {actionStatus.type === "error" ? (
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          ) : actionStatus.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-xs tracking-wider uppercase mb-0.5">
              {actionStatus.type === "error" ? "Security / Operation Alert" : "Vault Notification"}
            </p>
            <p className="text-xs leading-relaxed">{actionStatus.message}</p>
          </div>
        </div>
      )}

      {/* Grid: Master Key & Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Key Panel */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Key className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Master Vault Key
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your key derives the 256-bit Key Encryption Key (KEK) using PBKDF2 (600,000 iters). It
            is kept strictly in volatile memory and never transmitted to the server.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Vault Password / Key</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter master password..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberKey}
                onChange={(e) => setRememberKey(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer">
                Retain in memory during active browser tab
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>Zero-Knowledge Rule:</strong> If you lose this key, your encrypted files cannot
            be recovered by administrators.
          </div>
        </div>

        {/* Drag & Drop Encrypt & Upload Area */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-600">
              <Upload className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Encrypt & Upload File
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Max size: 50 MB</span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/70"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
              className="hidden"
            />
            <HardDrive className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-90" />
            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-blue-600 font-medium">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for AES-256-GCM
                  encryption
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Drag and drop any file here, or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF, DOCX, TXT, PNG, JPG, and binary executables
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 transition"
              >
                Clear Selection
              </button>
            )}
            <button
              onClick={handleEncryptAndUpload}
              disabled={!selectedFile || isEncrypting}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm flex items-center space-x-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isEncrypting ? "Encrypting & Uploading..." : "Encrypt & Save to Vault"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stored Files Table */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Stored Encrypted Files</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {files.length} {files.length === 1 ? "file" : "files"} in vault
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Loading secure vault inventory...
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-lg">
            <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Your vault contains no files yet.</p>
            <p className="text-xs text-slate-500">
              Select a file above and enter your master key to store your first encrypted document.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Ciphertext Size</th>
                  <th className="py-3 px-4">Encryption Format</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="truncate max-w-xs">{file.originalName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {(file.ciphertextSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                        {file.algorithm} &bull; v{file.formatVersion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 flex items-center space-x-1.5 pt-4">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(file.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleDownloadAndDecrypt(file)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition font-medium"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Decrypt & Download</span>
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.originalName)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
