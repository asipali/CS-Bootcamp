"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowDownRight, ArrowUpRight, History, Shield, AlertCircle, RefreshCw } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface CreditData {
  balance: number;
  initialGrant: number;
  totalConsumed: number;
  transactions: Transaction[];
}

export default function CreditsPage() {
  const [data, setData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/history");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login?redirect=/credits&reason=credits_view";
          return;
        }
        throw new Error("Failed to load credit history.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching credit data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Demo Credits & Usage Allowance
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Persisted operational usage balance for client-side file encryption and vault storage.
          </p>
        </div>
        <button
          onClick={fetchCredits}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-sm w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Balance</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-6 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Available Balance</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-blue-900">
            {loading ? "..." : data?.balance ?? 0}
          </div>
          <p className="text-xs text-slate-600">
            Remaining file encryption & upload operations.
          </p>
        </div>

        {/* Initial Allocation */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Initial Grant
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {loading ? "..." : data?.initialGrant ?? 25}
          </div>
          <p className="text-xs text-slate-600">
            Credits allocated upon account creation.
          </p>
        </div>

        {/* Total Consumed */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Credits Consumed
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {loading ? "..." : data?.totalConsumed ?? 0}
          </div>
          <p className="text-xs text-slate-600">
            Deducted for verified file upload operations.
          </p>
        </div>
      </div>

      {/* Free Operations Notice */}
      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs sm:text-sm space-y-1">
        <div className="font-semibold text-slate-900 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Demo Credit Policy</span>
        </div>
        <p className="text-slate-600">
          Demo credits are application usage quotas for evaluating zero-knowledge file encryption.
          They are not money, cryptocurrency, or a measure of cryptographic security.
          <strong> File downloads, file decryptions, and Cryptography Lab exercises are always free</strong> and
          remain available even if your credit balance reaches zero.
        </p>
      </div>

      {/* Credit Transactions History */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-lg">
          <History className="w-5 h-5 text-slate-600" />
          <h2>Credit Transaction History</h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      Loading credit transactions...
                    </td>
                  </tr>
                ) : data && data.transactions.length > 0 ? (
                  data.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            tx.type === "INITIAL_GRANT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {tx.amount > 0 ? (
                          <span className="text-emerald-600 flex items-center">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />+{tx.amount}
                          </span>
                        ) : (
                          <span className="text-slate-600 flex items-center">
                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{tx.amount}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {tx.balanceAfter}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{tx.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
