"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Activity, 
  FileText, 
  MessageSquare,
  Bot, 
  HelpCircle, 
  LogOut, 
  Bell
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { apiFetch, type ProfileResponse } from "@/lib/api"
import { getEmail, clearAuth } from "@/lib/auth"

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    const email = getEmail()
    if (!email) {
      setProfileLoaded(true)
      return
    }

    apiFetch(`/auth/me?email=${encodeURIComponent(email)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setProfile(data))
      .catch(() => {})
      .finally(() => setProfileLoaded(true))
  }, [])

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  const handleLogout = () => {
    clearAuth()
    router.push("/login")
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white flex flex-col fixed inset-y-0 z-50">
        {/* Logo Area */}
        <div className="flex items-center gap-2 px-6 h-16 border-b">
          <div>
            <img src="/logo_text.svg" alt="Ampera Logo" className="h-8 w-auto" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link 
            href="/users/dashboard" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/users/dashboard') 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          
          <Link 
            href="/users/history" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/users/history') 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            Energy Monitoring
          </Link>

          <Link 
            href="/users/billing" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/users/billing') 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Billing & Invoices
          </Link>

          <Link 
            href="/users/feedback" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/users/feedback') 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Admin Feedback
          </Link>

          <Link 
            href="/users/notifications" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/users/notifications') 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b bg-white flex items-center justify-end px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            
            {/* Profil User */}
            <Link 
              href="/users/profile" 
              className="flex items-center gap-3 p-1.5 pr-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.profile_photo_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-slate-700 mr-1">
                {profile?.full_name || (profileLoaded ? "User" : "...")}
              </span>
            </Link>

          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}