import Link from "next/link"
import { Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Sisi Kiri - Gambar / Branding (Sembunyi di mobile) */}
      <div className="hidden lg:block relative w-1/2 h-screen overflow-hidden bg-slate-900">
  
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
            src="/logo_white.svg"
            alt="Ampera Logo"
            width={900}
            height={900}
            className="object-contain scale-100 opacity-10"
            />
        </div>
        </div>

      {/* Sisi Kanan - Form Register */}
      <div className="flex w-full flex-col items-center justify-center lg:w-1/2 p-8">
        <div className="mx-auto flex w-full max-w-[450px] flex-col justify-center space-y-6">
          
          {/* Header & Logo */}
                    <div className="mb-4 flex items-center justify-center space-x-2 text-blue-700 font-bold text-xl">
                          <Image
                          src="/Logo_text.svg"
                          alt="Ampera AI Logo"
                          width={150}
                          height={150}
                          className="object-contain"
                          />
                      </div>

          {/* Form */}
          <div className="grid gap-5">
            <form>
              <div className="grid gap-4">
                
                {/* Baris 1: Nama & Kamar */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="Jane Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roomUnit">Room / Unit</Label>
                    <Input id="roomUnit" placeholder="Apt 4B" />
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    placeholder="jane.doe@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                  />
                </div>

                {/* Password Baru */}
                <div className="grid gap-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                  />
                </div>

                {/* Konfirmasi Password */}
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                  />
                </div>

                {/* Persetujuan S&K */}
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-xs font-medium leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the <Link href="#" className="text-blue-600 hover:underline">Terms and Conditions</Link> and <Link href="#" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                  </label>
                </div>

                {/* Submit Button */}
                <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white mt-4">
                  Activate Account
                </Button>
              </div>
            </form>
          </div>

          {/* Link ke Login */}
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