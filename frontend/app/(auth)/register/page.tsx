"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function normalizeErrorMessage(data: any) {
    if (!data) return "Registration failed. Please check your input."
    if (typeof data === "string") return data
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === "string") return item
          if (item?.msg) return item.msg
          if (item?.detail) return String(item.detail)
          return JSON.stringify(item)
        })
        .join(" | ")
    }
    if (data?.message) return String(data.message)
    if (data?.detail) {
      if (typeof data.detail === "string") return data.detail
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: any) => item?.msg || item?.detail || JSON.stringify(item))
          .join(" | ")
      }
      return JSON.stringify(data.detail)
    }
    return JSON.stringify(data)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!termsAccepted) {
      setError("Please agree to the terms and conditions.")
      return
    }

    if (password !== confirmPassword) {
      setError("Password and confirmation must match.")
      return
    }

    setLoading(true)

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          room_id: roomId,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(normalizeErrorMessage(data))
        return
      }

      setSuccessMessage("Registration successful. Redirecting to login...")
      setTimeout(() => router.push("/login"), 1200)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <div className="hidden lg:block relative w-1/2 h-screen overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/ampera-bg.jpg')" }}
        />

        <div className="absolute inset-0 bg-blue/10" />

        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/logo_white.svg"
            alt="Ampera Logo"
            width={900}
            height={900}
            className="object-contain scale-100 opacity-10"
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center lg:w-1/2 p-8">
        <div className="mx-auto flex w-full max-w-[450px] flex-col justify-center space-y-6">
          <div className="mb-4 flex items-center justify-center space-x-2 text-blue-700 font-bold text-xl">
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
              Create an account
            </h1>
            <p className="text-sm text-slate-500">
              Register a new tenant account and connect it to your room.
            </p>
          </div>

          <div className="grid gap-5">
            <form onSubmit={onSubmit}>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roomId">Room ID</Label>
                    <Input
                      id="roomId"
                      placeholder="R-101"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    placeholder="jane.doe@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs font-medium leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the <Link href="#" className="text-blue-600 hover:underline">Terms and Conditions</Link> and <Link href="#" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                  </label>
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {successMessage ? <p className="text-sm text-green-600">{successMessage}</p> : null}

                <Button
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white mt-4"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Activate Account"}
                </Button>
              </div>
            </form>
          </div>

          <p className="px-8 text-center text-xs text-slate-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
