"use client" // Wajib ditambahkan agar bisa menggunakan usePathname

import Link from "next/link"
import { usePathname } from "next/navigation" // Import hook dari Next.js
import { 
  LayoutDashboard, 
  Activity, 
  FileText, 
  Users, 
  Bot, 
  HelpCircle, 
  LogOut, 
  Bell,
  BellRing
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() // Mengambil URL yang sedang aktif saat ini

  // Fungsi bantuan untuk mengecek apakah menu sedang aktif
  // (Menggunakan startsWith agar sub-halaman seperti /admin/rooms/101 tetap membuat menu 'Rooms' aktif)
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

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
            href="/admin/dashboard" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/admin/dashboard') 
                ? 'bg-blue-50 text-blue-700' // Warna saat Aktif
                : 'text-slate-600 hover:bg-slate-50' // Warna saat Tidak Aktif
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          
          <Link 
            href="/admin/history" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/admin/history') 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            Energy Monitoring
          </Link>

          <Link 
            href="/admin/billing" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/admin/billing') 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Billing & Invoices
          </Link>

          <Link 
            href="/admin/residents" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/admin/residents') 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Resident Management
          </Link>
          
          <Link 
            href="/admin/alerts" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive('/admin/alerts') 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BellRing className="h-4 w-4" />
            Alert History
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t space-y-2">
          <Button
            asChild
            className="w-full justify-start gap-2 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
            >
            <Link href="/admin/chat">
                <Bot className="h-4 w-4" />
                <span>Inquire AI Agent</span>
            </Link>
            </Button>
          <Link 
            href="/admin/help" 
            className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Help Center
          </Link>
          <Link 
            href="/login" 
            className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b bg-white flex items-center justify-end px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
            </button>
            Admin
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>

      <Toaster
        position="top-right"
        richColors
        closeButton
      />
    </div>
  )
}