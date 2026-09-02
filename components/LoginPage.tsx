"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Shield, AlertTriangle, Wifi, Lock, Mail } from "lucide-react";
import { login } from "@/lib/auth";
import type { User } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function validate(): boolean {
    let valid = true;
    setEmailError("");
    setPasswordError("");
    if (!email.trim()) {
      setEmailError("Email address is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }
    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    // Simulate network delay for realism
    await new Promise((r) => setTimeout(r, 800));

    const user = login(email, password);
    setLoading(false);

    if (user) {
      onLogin(user);
    } else {
      setError("Invalid credentials. Use the demo account shown below.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

      <div className="relative w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl shadow-blue-900/50 mb-5 border border-blue-500/30">
            <Shield className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Aero<span className="text-blue-400">Ai</span>Rescue
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 tracking-wide uppercase">
            AI-Powered Flood Rescue Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 font-medium">System Operational</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/50 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200 tracking-wide">
              SECURE AUTHENTICATION
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
            {/* General error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="commander@aerorescue.ai"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              error={emailError}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            {/* Password */}
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              error={passwordError}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-1"
            >
              {loading ? "Authenticating…" : "Access Command Center"}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mx-6 mb-6 bg-slate-900/60 border border-slate-600/40 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
              Demo Credentials
            </p>
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-mono">
                <span className="text-slate-500">Email: </span>
                commander@aerorescue.ai
              </p>
              <p className="text-xs text-slate-300 font-mono">
                <span className="text-slate-500">Password: </span>
                rescue2024
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" /> Encrypted Connection
          </span>
          <span className="text-slate-700">•</span>
          <span>AeroAiRescue v1.0.0</span>
          <span className="text-slate-700">•</span>
          <span>© 2026</span>
        </div>
      </div>
    </div>
  );
}
