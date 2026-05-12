"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { Button } from "@/components/ui/button"

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Fungsi untuk mengecek apakah path saat ini sedang aktif
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

          {/* Menu Baru: Notifications */}
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
          {/* Tombol AI Agent dengan Active State */}
          {/* <Button
            asChild
            className={`w-full justify-start gap-2 h-11 rounded-xl shadow-md transition-all ${
              isActive('/users/chat') 
                ? 'bg-blue-800 text-white ring-2 ring-blue-300 ring-offset-1' // Warna saat halaman chat aktif
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' // Warna default
            }`}
          >
            <Link href="/users/chat">
              <Bot className="h-4 w-4" />
              <span>Inquire AI Agent</span>
            </Link>
          </Button> */}

          <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors mt-2">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </button>
          <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors">
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
            
            {/* Profil User: Bisa diklik & mengarah ke /users/profile */}
            <Link 
              href="/users/profile" 
              className="flex items-center gap-3 p-1.5 pr-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-slate-700 mr-1">Jane Doe</span>
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