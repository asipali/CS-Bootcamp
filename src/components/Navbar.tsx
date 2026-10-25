"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Lock, BookOpen, Activity, User, LogOut, Sparkles } from "lucide-react";

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      window.location.href = "/login";
    } catch {}
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 group-hover:bg-blue-100 transition">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex items-center">
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              Cipher<span className="text-blue-600">Vault</span>
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-600 border border-slate-200">
              2.0
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <Link
            href="/features"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            Features
          </Link>
          <Link
            href="/lab"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Crypto Lab</span>
          </Link>
          <Link
            href="/vault"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Secure Vault</span>
          </Link>
          <Link
            href="/audit"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Audit</span>
          </Link>

          {/* User Auth & Credits Section */}
          <div className="pl-2 ml-1 border-l border-slate-200 flex items-center space-x-2">
            {currentUser ? (
              <>
                <Link
                  href="/credits"
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                  title="View your demo usage allowance & transaction history"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Credits: {currentUser.credits ?? 25}</span>
                </Link>

                <Link
                  href="/credits"
                  className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="max-w-[100px] truncate">{currentUser.username}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?tab=register"
                  className="px-3.5 py-1.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
