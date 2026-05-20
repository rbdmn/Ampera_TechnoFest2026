"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  Building2, 
  Zap, 
  Banknote, 
  Activity, 
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts"
import { apiFetch } from "@/lib/api"

// --- INTERFACES SESUAI API ---
interface RoomDetail {
  room_id: string
  floor: number | null
  tenant_name: string | null
  monthly_limit_kwh: number
  rate_per_kwh?: number
  current_month: {
    usage_kwh: number
    estimated_cost: number
    usage_percentage: number
    remaining_kwh: number
  }
}

interface ConsumptionPoint {
  ts: string
  kwh: number
}

interface AlertItem {
  alert_id: string
  room_id: string
  alert_type: string
  message: string
  triggered_at: string
  is_read: boolean
}

// --- HELPER FORMATTER ---
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("id-ID", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

const formatHour = (iso: string) => {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, "0")}:00`
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function RoomDetailPage() {
  const params = useParams()
  // Trik sapu jagat agar tidak infinite loading
  console.log("🕵️‍♂️ ISI PARAMS DARI NEXT.JS:", params)
  // Tambahkan params?.Id di urutan paling depan
  const roomId = (params?.Id || params?.id || params?.room_id || params?.roomId) as string

  // Data States
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  
  // UI States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditLimitOpen, setIsEditLimitOpen] = useState(false)
  const [newLimit, setNewLimit] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Semua Data Paralel
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailRes, hourlyRes, dailyRes, alertsRes] = await Promise.all([
        apiFetch(`/rooms/${roomId}/detail`),
        apiFetch(`/consumption/rooms/${roomId}?interval=hour`),
        apiFetch(`/consumption/rooms/${roomId}?interval=day`),
        apiFetch(`/alerts/?room_id=${roomId}&limit=50`),
      ])

      // 1. Room Detail
      if (!detailRes.ok) throw new Error("Kamar tidak ditemukan di sistem.")
      const detailRaw = await detailRes.json()
      const detail: RoomDetail = detailRaw.data || detailRaw
      setRoom(detail)
      setNewLimit(detail?.monthly_limit_kwh?.toString() || "0")

      // 2. Hourly Data
      if (hourlyRes.ok) {
        const hourlyRaw = await hourlyRes.json()
        const rawSeries = (hourlyRaw.data || hourlyRaw).series || []
        
        // Format untuk chart
        const formattedHourly = rawSeries.map((p: ConsumptionPoint) => {
          const hour = new Date(p.ts).getHours()
          return {
            time: formatHour(p.ts),
            value: p.kwh,
            isPeak: hour >= 17 && hour <= 22 // Anggap jam sibuk 17:00 - 22:00
          }
        })
        setHourlyData(formattedHourly)
      }

      // 3. Daily Data
      if (dailyRes.ok) {
        const dailyRaw = await dailyRes.json()
        const rawSeries = (dailyRaw.data || dailyRaw).series || []
        
        const todayStr = new Date().toDateString()
        const formattedDaily = rawSeries.map((p: ConsumptionPoint) => ({
          date: formatDate(p.ts),
          value: p.kwh,
          isToday: new Date(p.ts).toDateString() === todayStr
        }))
        setDailyData(formattedDaily)
      }

      // 4. Alerts
      if (alertsRes.ok) {
        const alertsRaw = await alertsRes.json()
        setAlerts(alertsRaw.data || [])
      }
      
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail kamar.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) fetchData()
    else {
        setError("System Error: ID Kamar tidak valid di URL.")
        setLoading(false)
    }
  }, [roomId])

  // Submit Perubahan Limit
  const handleEditLimit = async () => {
    const limitValue = parseFloat(newLimit)
    if (!(limitValue > 0)) return
    setIsSubmitting(true)

    try {
      const res = await apiFetch(`/rooms/${roomId}/limit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_limit_kwh: limitValue }),
      })
      if (!res.ok) throw new Error("Gagal mengupdate limit kamar.")
      
      // Update state lokal tanpa harus fetch ulang semua
      setRoom(prev => prev ? { ...prev, monthly_limit_kwh: limitValue } : null)
      setIsEditLimitOpen(false)
      
      // Fetch ulang untuk update kalkulasi persentase di backend
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setNewLimit(room?.monthly_limit_kwh.toString() || "")
    setIsEditLimitOpen(false)
  }

  // --- RENDERING HELPERS ---
  const renderSeverityBadge = (type: string) => {
    const isCritical = type.includes("exceeded") || type.includes("critical")
    const isWarning = type.includes("warning") || type.includes("spike")
    
    if (isCritical) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>CRITICAL</span>
    } else if (isWarning) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 border border-orange-200"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>WARNING</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>INFO</span>
  }

  const renderStatus = (isRead: boolean) => {
    if (isRead) return <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>
    return <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600"><Clock className="w-3.5 h-3.5" /> Pending</span>
  }

  // --- LOADING & ERROR STATES ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-sm text-slate-500">Memuat data kamar...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold text-slate-900 mb-2">Oops!</p>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link href="/admin/residents">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Residents</Button>
          </Link>
        </div>
      </div>
    )
  }

  const usage = room.current_month

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Back Button & Header Info */}
      <Link href="/admin/residents" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Residents
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Floor {room.floor || "-"} • Monthly Limit: {room.monthly_limit_kwh} kWh
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Room {room.room_id.replace("R-", "")}</h1>
          <p className="flex items-center text-sm font-medium text-slate-600 mt-1.5">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            {room.tenant_name || "Unassigned"}
          </p>
        </div>
        
        {/* Modal Edit Limit */}
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isEditLimitOpen} onOpenChange={setIsEditLimitOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white">
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Limit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Monthly Limit</DialogTitle>
                <DialogDescription>
                  Set a new monthly energy consumption limit for this room (kWh).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="limit" className="text-right">Limit (kWh)</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="col-span-3"
                    min="1"
                    step="0.1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                <Button type="submit" onClick={handleEditLimit} disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 3 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="bg-blue-50 p-1.5 rounded-full mr-2">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Month Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{usage?.usage_kwh?.toFixed(1) || 0}</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="bg-orange-50 p-1.5 rounded-full mr-2">
              <Banknote className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-500">Rp</span>
              <span className="text-3xl font-bold text-slate-900">{formatIDR(usage?.estimated_cost || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <div className="bg-slate-100 p-1.5 rounded-full mr-2">
                <Activity className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Limit Status</CardTitle>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{room.monthly_limit_kwh} MAX</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{usage?.usage_percentage?.toFixed(0) || 0}</span>
              <span className="text-sm font-medium text-slate-500">%</span>
            </div>
            
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 mb-1.5">
              <div 
                className={`h-full rounded-full ${usage?.usage_percentage > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{ width: `${Math.min(usage?.usage_percentage || 0, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right font-medium">
              {Math.max(0, usage?.remaining_kwh || 0).toFixed(1)} kWh remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2 Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Hourly Chart */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-sm font-semibold">Hourly Consumption</CardTitle>
            <span className="text-[11px] font-medium text-slate-400 uppercase">Last 24 Hours</span>
          </CardHeader>
          <CardContent className="pt-6">
            {hourlyData.length > 0 ? (
                <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} barSize={6}>
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {hourlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isPeak ? '#1d4ed8' : '#93c5fd'} />
                        ))}
                    </Bar>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(value) => ["00:00", "06:00", "12:00", "18:00", "23:00"].includes(value) ? value : ''} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Belum ada data pemakaian.</div>
            )}
          </CardContent>
        </Card>

        {/* Daily Chart */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-sm font-semibold">Daily Consumption</CardTitle>
            <span className="text-[11px] font-medium text-slate-400 uppercase">Last 30 Days</span>
          </CardHeader>
          <CardContent className="pt-6">
            {dailyData.length > 0 ? (
                <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} barGap={0} barCategoryGap={0}>
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Bar dataKey="value">
                        {dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isToday ? '#1d4ed8' : '#dbeafe'} />
                        ))}
                    </Bar>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} 
                        tickFormatter={(value, i) => i === 0 || i === Math.floor(dailyData.length/2) || i === dailyData.length - 1 ? value : ''} 
                    />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Belum ada data harian.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert History Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-sm font-semibold">Alert History</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto min-h-[150px]">
          {alerts.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Alert Type</th>
                  <th className="px-6 py-4 font-semibold">Severity</th>
                  <th className="px-6 py-4 font-semibold">Details</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <tr key={alert.alert_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDateTime(alert.triggered_at)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 capitalize">{alert.alert_type.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4">{renderSeverityBadge(alert.alert_type)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-md truncate">{alert.message}</td>
                    <td className="px-6 py-4">{renderStatus(alert.is_read)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">Kamar ini aman. Tidak ada alert yang tercatat.</div>
          )}
        </div>
      </Card>
    </div>
  )
}