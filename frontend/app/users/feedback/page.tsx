"use client"

import { useState } from "react"
import { Search, MessageSquare, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const adminFeedback = [
  {
    id: "MSG-2026-001",
    title: "Pembayaran Invoice Bulan Ini",
    message: "Halo, mohon segera upload bukti pembayaran untuk invoice Oktober agar tidak terjadi denda.",
    date: "May 10, 2026",
    status: "Unread",
  },
  {
    id: "MSG-2026-002",
    title: "Perubahan Jadwal Pemeliharaan",
    message: "Ada jadwal pemeliharaan listrik pada 15 Mei 2026 pukul 10:00 - 12:00. Harap matikan peralatan sensitif.",
    date: "May 05, 2026",
    status: "Read",
  },
  {
    id: "MSG-2026-003",
    title: "Tips Hemat Energi",
    message: "Gunakan mode hemat energi pada AC saat jam puncak untuk mengurangi biaya listrik Anda.",
    date: "May 01, 2026",
    status: "Read",
  },
]

export default function UserAdminFeedbackPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredFeedback = adminFeedback.filter((item) => {
    return `${item.title} ${item.message}`.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Feedback</h1>
          <p className="text-sm text-slate-500">Pesan dari admin yang ditujukan untuk Anda sebagai pengguna.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="text"
            placeholder="Cari pesan admin..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-[320px]"
          />
          <Button variant="outline" className="hidden md:inline-flex">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredFeedback.length > 0 ? (
          filteredFeedback.map((item) => (
            <Card key={item.id} className="bg-white shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.date}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.status === "Unread" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  {item.status}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{item.message}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    {item.status === "Read" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                    <span>{item.status === "Read" ? "Sudah dibaca" : "Belum dibaca"}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Mark as Read
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="text-center text-slate-500 py-16">
              Tidak ada pesan dari admin.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
