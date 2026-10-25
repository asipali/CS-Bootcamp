"use client";

import { useState, useEffect } from "react";
import { Activity, ShieldCheck, ShieldAlert, RefreshCw, Clock } from "lucide-react";

interface AuditLogItem {
  id: string;
  eventType: string;
  status: string;
  ipHash: string;
  details: string | null;
  timestamp: string;
}

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      if (res.status === 401) {
        window.location.href = "/login?redirect=/audit&reason=audit";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };


  const formatEventType = (type: string) => {
    switch (type) {
      case "AUTH_LOGIN":
        return "User Login";
      case "AUTH_LOGOUT":
        return "User Logout";
      case "AUTH_REGISTER":
        return "Account Registered";
      case "VAULT_UPLOAD":
        return "Encrypted File Upload";
      case "VAULT_DOWNLOAD":
        return "Encrypted File Download";
      case "VAULT_DELETE":
        return "File Deleted";
      case "ACCESS_DENIED":
        return "Unauthorized Access Denied";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Security Audit History</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              PRIVACY COMPLIANT
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Tamper-evident log of security-relevant operations. All records are sanitized; zero passwords, keys, or plaintext are retained.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
            Loading security events...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-lg">
            <Activity className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No security audit records found.</p>
            <p className="text-xs text-slate-500">
              Operations such as uploads, downloads, logins, and access denials will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Client IP Hash</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2 font-sans">
                      {log.status === "SUCCESS" ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <span>{formatEventType(log.eventType)}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.ipHash}</td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-xs">
                      {log.details || "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-sans">
                      <div className="inline-flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
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
