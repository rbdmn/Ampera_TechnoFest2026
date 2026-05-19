"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Zap, Banknote, Building2, AlertTriangle, AlertCircle, Info, Lightbulb, MoreHorizontal, Bot, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"
import { apiFetch } from "@/lib/api"

// Dummy data untuk grafik bila API belum tersedia
const defaultChartData = Array.from({ length: 30 }).map((_, i) => ({
  name: `Oct ${i + 1}`,
  total: Math.floor(Math.random() * 500) + 100,
}))

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value)

interface AdminDashboardOverview {
  range: {
    start: string
    end: string
    interval: string
  }
  totals: {
    rooms: number
    users: number
    kwh: number
    active_rooms: number    // Tambahan baru
    total_rooms: number     // Tambahan baru
    active_alerts_count: number // Tambahan baru
    estimated_bill: number  // Tambahan baru
    kwh_change_percentage?: number // Tambahan opsional untuk menunjukkan perubahan dibanding periode sebelumnya
  }
  series: Array<{ ts: string; kwh: number }>
  top_consumers: Array<{ room_id: string; usage_percentage: number }> // Tambahan baru
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomStatuses, setRoomStatuses] = useState<Array<{ room_id: string; tenant_name: string; kwh_usage_mtd: number; status: string }>>([])
  const [alerts, setAlerts] = useState<any[]>([])

  const chartData = useMemo(() => {
    if (!overview) return defaultChartData

    return overview.series.map((item) => ({
      name: new Date(item.ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: item.kwh,
    }))
  }, [overview])

  const totalKwh = overview?.totals.kwh ?? 0
  const estimatedBill = overview?.totals?.estimated_bill ?? 0
  const activeRooms = overview?.totals.rooms ?? 0
  const activeUsers = overview?.totals.users ?? 0
  const chartTitle = overview
    ? `Building total across ${new Date(overview.range.end).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}`
    : "Building total across last 30 days"
  const [kwhChange, setKwhChange] = useState<number | null>(null)

 useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        // --- LOGIKA WAKTU ---
        const now = new Date()
        
        // 30 Hari Terakhir (Current)
        const last30Days = new Date(now)
        last30Days.setDate(now.getDate() - 30)
        
        // 30 Hari Sebelumnya (Previous, untuk perbandingan)
        const last60Days = new Date(last30Days)
        last60Days.setDate(last30Days.getDate() - 30)

        // Encode ke URL
        const start = encodeURIComponent(last30Days.toISOString())
        const end = encodeURIComponent(now.toISOString())
        const prevStart = encodeURIComponent(last60Days.toISOString())
        const prevEnd = encodeURIComponent(last30Days.toISOString())
        // -------------------

        // Tarik data secara paralel (Tambahkan API untuk prevOverview)
        const [overviewRes, prevOverviewRes, roomsRes, alertsRes] = await Promise.all([
          apiFetch(`/dashboard/admin/overview?interval=day&start=${start}&end=${end}`),
          apiFetch(`/dashboard/admin/overview?interval=day&start=${prevStart}&end=${prevEnd}`), // Data pembanding
          apiFetch('/rooms/admin/room-status'),
          apiFetch(`/alerts/?start=${start}&end=${end}`),
        ])

        if (!overviewRes.ok) {
          const data = await overviewRes.json().catch(() => null)
          throw new Error(data?.detail || 'Gagal memuat data dashboard')
        }

        const overviewJson: AdminDashboardOverview = await overviewRes.json()
        setOverview(overviewJson)

        // Hitung Persentase Perbandingan
        if (prevOverviewRes.ok) {
          const prevJson = await prevOverviewRes.json().catch(() => null)
          const currentKwh = overviewJson.totals?.kwh || 0
          const prevKwh = prevJson?.totals?.kwh || 0

          if (prevKwh > 0) {
            // Rumus: ((Bulan Ini - Bulan Lalu) / Bulan Lalu) * 100
            const change = ((currentKwh - prevKwh) / prevKwh) * 100
            setKwhChange(change)
          } else {
            // Jika data bulan lalu 0 atau belum ada riwayat
            setKwhChange(null)
          }
        }

        // Lanjut set data lainnya...
        if (roomsRes.ok) {
          const roomsJson = await roomsRes.json().catch(() => null)
          setRoomStatuses(roomsJson?.data ?? [])
        }

        if (alertsRes.ok) {
          const alertsJson = await alertsRes.json().catch(() => null)
          setAlerts(alertsJson?.data ?? alertsJson ?? [])
        }
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan saat memuat dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-600">
        Loading admin dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500">Real-time facility energy performance and AI insights.</p>
        </div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          AGENT ACTIVE
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        {/* Card 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total KWH (Last 30 Days)</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalKwh.toLocaleString("en-US", { maximumFractionDigits: 1 })}</div>
            
            {/* Logic Persentase Dinamis vs Bulan Lalu */}
            {kwhChange !== null ? (
              <p className={`text-xs font-medium flex items-center mt-1 ${kwhChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span className="mr-1">{kwhChange > 0 ? '↗' : '↘'}</span> 
                {kwhChange > 0 ? '+' : ''}{kwhChange.toFixed(1)}% vs last month
              </p>
            ) : (
              // Jika ga ada data bulan lalu
              <p className="text-xs text-slate-400 font-medium flex items-center mt-1">
                - vs last month
              </p>
            )}

          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Bill (IDR)</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatIDR(estimatedBill)}</div>
            <p className="text-xs text-slate-500 mt-1">Projected end of cycle</p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Rooms</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{activeRooms}</div>
            <p className="text-xs text-slate-500 mt-1">{activeUsers} active users</p>
          </CardContent>
        </Card>

        {/* Card 4 (Alert) */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Active AI Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
            {alerts ? alerts.length : 0}
          </div>
            <p className="text-xs text-red-500 font-medium mt-1">Requires immediate review</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Chart & Top Consumers */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily Consumption Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Daily Consumption</CardTitle>
              <p className="text-xs text-slate-500">{chartTitle}</p>
            </div>
            <button className="text-xs border text-blue-600 border-blue-200 bg-blue-50 px-3 py-1 rounded-md font-medium">
              📅 Last 30 Days
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => value.includes('1') || value.includes('15') || value.includes('30') ? value : ''} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Consumers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Consumers</CardTitle>
            <p className="text-xs text-slate-500">% of allocated monthly limit</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {(overview?.top_consumers && overview.top_consumers.length > 0) ? (
              overview.top_consumers.map((tc) => (
                <div key={tc.room_id} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium text-slate-900">
                    <span>{tc.room_id}</span>
                    <span className={"font-bold"}>{tc.usage_percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${tc.usage_percentage}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium text-slate-900">
                    <span>Room 304</span>
                    <span className="text-red-600">92%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 w-[92%] rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium text-slate-900">
                    <span>Room 102</span>
                    <span className="text-amber-600">78%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-600 w-[78%] rounded-full"></div>
                  </div>
                </div>
              </>
            )}

            <Link 
              href="/admin/residents" 
              className="block w-full text-center text-xs font-medium border rounded-md py-2 text-slate-700 hover:bg-slate-50 mt-4 transition-colors"
            >
              View All Rooms
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Table & AI Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Quick Room Status Table */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-base font-semibold">Quick Room Status</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 font-semibold">Room</th>
                  <th className="px-6 py-3 font-semibold">Tenant</th>
                  <th className="px-6 py-3 font-semibold">KWH Usage (MTD)</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomStatuses && roomStatuses.length > 0 ? (
                  roomStatuses.slice(0, 5).map((r) => (
                    <tr key={r.room_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{r.room_id}</td>
                      <td className="px-6 py-3 text-slate-500">{r.tenant_name}</td>
                      <td className={`px-6 py-3 ${r.kwh_usage_mtd > 900 ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                        {Number(r.kwh_usage_mtd).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 text-[10px] font-medium rounded-full ${r.status && r.status.toLowerCase().includes('warn') ? 'bg-orange-50 text-orange-600 border border-orange-200' : r.status && r.status.toLowerCase().includes('exceed') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">Room 101</td>
                      <td className="px-6 py-3 text-slate-500">Acme Corp</td>
                      <td className="px-6 py-3 text-slate-900">458.2</td>
                      <td className="px-6 py-3">
                        <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Normal</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">Room 304</td>
                      <td className="px-6 py-3 text-slate-500">Design Studio X</td>
                      <td className="px-6 py-3 text-red-600 font-medium">980.5</td>
                      <td className="px-6 py-3">
                        <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-red-50 text-red-600 border border-red-200">Exceeded</span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Latest AI Insights */}
        <Card className="bg-gradient-to-b from-blue-50/50 to-white">
          <CardHeader className="border-b border-blue-100/50 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Recent Alerts & Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {alerts && alerts.length > 0 ? (
              alerts.slice(0, 5).map((a: any, idx: number) => {
                const title = a.title || a.summary || a.message || `Insight ${idx + 1}`
                const message = a.message || a.detail || a.summary || ''
                const time = a.timestamp || a.created_at || a.time || ''
                const severity = (a.severity || a.level || '').toString().toLowerCase()
                const Icon = severity.includes('warn') ? Info : severity.includes('error') || severity.includes('critical') ? AlertCircle : Lightbulb

                return (
                  <div key={idx} className="flex gap-3">
                    <div className="mt-0.5">
                      <Icon className={`h-4 w-4 ${severity.includes('error') || severity.includes('critical') ? 'text-red-500' : severity.includes('warn') ? 'text-amber-500' : 'text-blue-500'}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">{time ? new Date(time).toLocaleString() : ''}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Abnormal usage spike detected</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Room 304 showed a 40% jump in AC load between 2 AM and 4 AM today.</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">2 HOURS AGO</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Info className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Inefficient cooling pattern</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Server Room A cooling units cycling too frequently. Maintenance recommended.</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">YESTERDAY</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Optimization potential</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Adjusting base building temperature by +1°C could save approx. Rp 1.2M this month.</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">2 DAYS AGO</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}