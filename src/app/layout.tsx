import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "CipherVault 2.0 — Secure File Vault & Cryptography Lab",
  description:
    "Zero-knowledge client-side AES-256-GCM secure file vault and interactive classical cryptography laboratory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 flex flex-col min-h-screen antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Navigation Bar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Professional Minimal Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-700">CipherVault 2.0</span>
              <span>&bull; Zero-Knowledge Client-Side Cryptography</span>
            </div>
            <div className="flex items-center space-x-4 text-slate-600">
              <Link href="/features" className="hover:text-blue-600 transition">
                Features
              </Link>
              <Link href="/lab" className="hover:text-blue-600 transition">
                Crypto Lab
              </Link>
              <Link href="/vault" className="hover:text-blue-600 transition">
                Secure Vault
              </Link>
              <Link href="/credits" className="hover:text-blue-600 transition">
                Demo Credits
              </Link>
            </div>
            <p className="text-slate-500">
              NIST SP 800-38D AES-GCM &bull; PBKDF2 (600k iters) &bull; RFC 9106 Argon2id
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
