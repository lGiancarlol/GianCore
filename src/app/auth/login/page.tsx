"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Cpu, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email, password, redirect: false,
      });
      if (res?.error) {
        setError("Credenciales incorrectas.");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "hsl(var(--background))" }}>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--theme-soft)", border: "1px solid var(--theme-border)" }}>
            <Cpu className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
          </div>
          <div>
            <span className="font-bold text-lg text-foreground">GianCore</span>
            <p className="text-xs text-muted-foreground">Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                className="input-base"
                placeholder="admin@giancore.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          GianCore © {new Date().getFullYear()} — All rights reserved
        </p>
      </div>
    </div>
  );
}
