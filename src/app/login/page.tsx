"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, User, Mail, AlertCircle, CheckCircle, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTarget = searchParams.get("redirect") || "/vault";
  const reasonParam = searchParams.get("reason");
  const tabParam = searchParams.get("tab");

  const [isLogin, setIsLogin] = useState(tabParam !== "register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { username: username.trim(), password }
      : { username: username.trim(), email: email.trim().toLowerCase(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      setMessage({
        type: "success",
        text: isLogin
          ? `Authenticated successfully! Redirecting...`
          : `Account created successfully with 25 free credits! Redirecting...`,
      });
      setCurrentUser(data.user);

      setTimeout(() => {
        router.push(redirectTarget);
      }, 700);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoAccount = () => {
    setIsLogin(true);
    setUsername("demo@ciphervault.local");
    setPassword("DemoVault@2026!");
    setMessage({
      type: "success",
      text: "Demo credentials loaded. Click 'Sign In' to access the vault with 100 demo credits.",
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-6">
      {/* Auth Gating Alert if redirected */}
      {reasonParam && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-xs sm:text-sm flex items-start space-x-3 shadow-sm">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Authentication Required</div>
            <p className="text-blue-800/90">
              Please sign in or create an account to access the requested feature. Your destination
              will be preserved upon sign-in.
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 mb-1">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isLogin ? "Sign In to CipherVault" : "Create Free Account"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {isLogin
              ? "Access your zero-knowledge secure file vault"
              : "Includes 25 free credits for document encryption"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-md transition ${
              isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-md transition ${
              !isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-start space-x-2 ${
              message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {message.type === "error" ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isLogin ? "Username or Email" : "Username"}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isLogin ? "e.g. demo@ciphervault.local" : "Choose username"}
                className="w-full px-3.5 py-2 pl-9 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 8 chars)"
                className="w-full px-3.5 py-2 pl-9 pr-10 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Register & Claim 25 Credits"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Demo Account Box */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Restricted Demonstration Account</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
            100 Credits
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Evaluate CipherVault with an isolated demonstration account. Does not access real user data
          or administrative privileges.
        </p>

        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 font-mono text-xs text-slate-700">
          <div>
            <span className="text-slate-400 select-none">Email: </span>demo@ciphervault.local
          </div>
          <div>
            <span className="text-slate-400 select-none">Password: </span>DemoVault@2026!
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseDemoAccount}
          className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold transition shadow-sm flex items-center justify-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Use Demo Account</span>
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-500 text-sm">Loading authentication...</div>}>
      <AuthForm />
    </Suspense>
  );
}
