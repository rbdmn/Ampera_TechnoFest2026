"use client"

import Link from "next/link"
import { Mail, Lock, AlertTriangle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { apiFetch } from "@/lib/api"
import { setAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.detail || "Login failed")
        return
      }

      setAuth(data.access_token, data.role, email)
      if (data.role === "admin") router.push("/admin/dashboard")
      else router.push("/users/dashboard")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sisi Kiri - Gambar / Branding (Sembunyi di mobile) */}
      <div className="hidden lg:block relative w-1/2 h-full overflow-hidden bg-slate-900">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/ampera-bg.jpg')" }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-blue/10" />

        {/* Logo Besar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/Logo_white.svg"
            alt="Ampera Logo"
            width={900}
            height={900}
            className="object-contain scale-100 opacity-10"
          />
        </div>
      </div>

      {/* Sisi Kanan - Form Login */}
      <div className="flex w-full flex-col items-center justify-center lg:w-1/2 h-full overflow-y-auto py-6 px-8">
        <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-3">
          {/* Header & Logo */}
          <div className="flex items-center justify-center space-x-2 text-blue-700 font-bold text-xl">
            <Image
              src="/Logo_text.svg"
              alt="Ampera AI Logo"
              width={150}
              height={150}
              className="object-contain"
            />
          </div>

          <div className="flex flex-col items-start space-y-2 text-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Sign in
            </h1>
            <p className="text-sm text-slate-500">
              Enter your credentials to access the Management Console.
            </p>
          </div>

          {/* Form */}
          <div className="grid gap-5">
            <form onSubmit={onSubmit}>
              <div className="grid gap-4">
                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      placeholder="boss@admin.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Cold start notice */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <span className="font-semibold">Render cold start: </span>
                    server tidur saat tidak aktif dan butuh{" "}
                    <span className="font-medium">1–2 menit</span> untuk bangun.
                    Jika login gagal, tunggu lalu{" "}
                    <span className="font-medium">coba sekali lagi</span>.
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-red-600">{error}</p>
                ) : null}

                {/* Submit Button */}
                <Button
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white mt-2"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Signing in..." : "Sign In →"}
                </Button>

                {/* Demo credentials */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex gap-2">
                  <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-slate-600 space-y-1.5 w-full">
                    <p className="font-semibold text-slate-700">Akun demo</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 shrink-0">Admin</span>
                      <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 text-[11px]">
                        admin@ampera.com / admin
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 shrink-0">User</span>
                      <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 text-[11px]">
                        rizky.pratama@ampera.com / user
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}