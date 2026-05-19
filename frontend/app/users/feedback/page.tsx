"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, MessageSquare, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getEmail } from "@/lib/auth"
import { getAdminFeedback, type AlertOut, markNotificationRead } from "@/lib/api"

type FeedbackItem = {
  id: string
  title: string
  message: string
  date: string
  status: "Unread" | "Read"
  raw: AlertOut
}

function toFeedbackItem(a: AlertOut): FeedbackItem {
  const d = new Date(a.triggered_at)
  const date = Number.isNaN(d.getTime()) ? a.triggered_at : d.toLocaleString()
  return {
    id: a.alert_id,
    title: "Admin Message",
    message: a.message,
    date,
    status: a.is_read ? "Read" : "Unread",
    raw: a,
  }
}

export default function UserAdminFeedbackPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | undefined>(undefined)

useEffect(() => {
  setEmail(getEmail() ?? undefined)
}, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const res = await getAdminFeedback({ email, page: 1, limit: 50 })
      setItems(res.data.map(toFeedbackItem))
    } catch (e: any) {
      setError(e?.message ?? "failed_to_load_feedback")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredFeedback = items.filter((item) => {
    return `${item.title} ${item.message}`.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const markAsRead = async (id: string) => {
    await markNotificationRead(id)
    await load()
  }

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

      {error && (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
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
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      item.status === "Unread" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{item.message}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      {item.status === "Read" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-600" />
                      )}
                      <span>{item.status === "Read" ? "Sudah dibaca" : "Belum dibaca"}</span>
                    </div>
                    {item.status === "Unread" ? (
                      <Button variant="outline" size="sm" onClick={() => markAsRead(item.id)}>
                        Mark as Read
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white shadow-sm">
              <CardContent className="text-center text-slate-500 py-16">Tidak ada pesan dari admin.</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
