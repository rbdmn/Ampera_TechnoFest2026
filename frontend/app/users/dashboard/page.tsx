"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Zap, 
  Banknote, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Snowflake, 
  Clock, 
  AlertTriangle, 
  Info,
  BarChart3,
} from "lucide-react"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { apiFetch } from "@/lib/api"
import { getEmail } from "@/lib/auth"

interface DashboardSeriesItem {
  ts: string
  kwh: number
  peak_demand_kw: number
  status: string
}

interface UserDashboardOverview {
  user: {
    user_id: string
    full_name?: string
    email: string
    role: string
    profile_photo_url?: string | null
  }
  room: {
    room_id: string
    tenant_name?: string | null
  } | null
  range: {
    start: string
    end: string
    interval: string
  } | null
  totals: {
    kwh: number
    bill: number
  } | null
  settings: {
    rate_per_kwh: number
    monthly_limit_kwh: number
  } | null
  projection: {
    projected_kwh: number
    projected_bill: number
  } | null
  series: DashboardSeriesItem[]
  latest_meter_reading: any
}

interface AlertItem {
  alert_id: string
  alert_type: string
  message: string
  triggered_at: string
  is_read: boolean
}

const defaultChartData = [
  { time: "00:00", value: 0 },
  { time: "06:00", value: 0 },
  { time: "12:00", value: 0 },
  { time: "18:00", value: 0 },
  { time: "24:00", value: 0 },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getUserDisplayName(user: UserDashboardOverview["user"] | undefined): string {
  if (!user) return "Resident"
  if (user.full_name) return user.full_name
  const emailName = user.email?.split("@")[0]?.replace(/[._-]/g, " ") || "Resident"
  return emailName.charAt(0).toUpperCase() + emailName.slice(1)
}

const alertTypeLabel: Record<string, string> = {
  usage_warning: "Usage Spike Detected",
  limit_exceeded: "Limit Threshold Reached",
  anomaly: "Unusual Activity",
}

export default function UserDashboardPage() {
  const [overview, setOverview] = useState<UserDashboardOverview | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [chartData, setChartData] = useState(defaultChartData)
  const [loading, setLoading] = useState(true)  
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedEmail = getEmail()
    if (!storedEmail) {
      setError("User email tidak ditemukan. Silakan login kembali.")
      setLoading(false)
      return
    }
    const userEmail: string = storedEmail

    async function loadDashboard() {
      try {
        const [overviewRes, alertsRes] = await Promise.all([
          apiFetch(`/dashboard/user/overview?email=${encodeURIComponent(userEmail)}`),
          apiFetch(`/alerts/?limit=2`),
        ])

        if (!overviewRes.ok) {
          const errorData = await overviewRes.json().catch(() => null)
          throw new Error(errorData?.detail || "Failed to load dashboard data")
        }

        const data: UserDashboardOverview = await overviewRes.json()
        setOverview(data)

        setChartData(
          data.series.length > 0
            ? data.series.map((item) => ({
                time: new Date(item.ts).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
                value: item.kwh,
              }))
            : defaultChartData,
        )

        if (alertsRes.ok) {
          const alertsJson = await alertsRes.json()
          setAlerts(alertsJson.data || [])
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const usageKwh = overview?.totals?.kwh ?? 0
  const usageBill = overview?.totals?.bill ?? 0
  const monthlyLimit = overview?.settings?.monthly_limit_kwh ?? 500
  const ratePerKwh = overview?.settings?.rate_per_kwh ?? 0

  const billValue = useMemo(() => {
    if (usageBill > 0) return formatCurrency(Math.round(usageBill))
    // fallback jika bill = 0 (belum ada data)
    if (ratePerKwh > 0) return formatCurrency(Math.round(usageKwh * ratePerKwh))
    return "Rp 0"
  }, [usageBill, usageKwh, ratePerKwh])

  const daysRemaining = useMemo(() => {
    // 1. Ambil waktu hari ini (real-time dari laptop/HP user)
    const today = new Date()
    
    // 2. Cari tanggal terakhir di bulan ini (misal: 31 Mei, 30 Juni, dsb)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    // 3. Hitung selisih hari antara hari ini dengan hari terakhir bulan ini
    const diff = Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    return diff > 0 ? diff : 0
  }, [])

  const usagePercent = useMemo(() => {
    if (monthlyLimit <= 0) return 0
    return Math.min(100, Math.round((usageKwh / monthlyLimit) * 100))
  }, [usageKwh, monthlyLimit])

  // --- PERBAIKAN LOGIKA PROYEKSI AKHIR BULAN ---
  const today = new Date()
  const daysPassed = today.getDate() || 1 // Menghindari pembagian dengan 0
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const projectedKwh = useMemo(() => {
    const backendProjected = overview?.projection?.projected_kwh ?? 0
    // Jika data dari backend ngawur (lebih kecil dari pemakaian saat ini), kita hitung secara rasional!
    if (backendProjected < usageKwh && usageKwh > 0) {
      return (usageKwh / daysPassed) * daysInMonth
    }
    return backendProjected
  }, [overview, usageKwh, daysPassed, daysInMonth])

  const projectedBill = useMemo(() => {
    // Kalikan hasil proyeksi kWh terbaru dengan rate harga
    if (ratePerKwh > 0) {
      return projectedKwh * ratePerKwh
    }
    return overview?.projection?.projected_bill ?? 0
  }, [projectedKwh, ratePerKwh, overview])
  // ----------------------------------------------

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-600">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {getUserDisplayName(overview?.user)}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {overview?.room?.room_id 
            ? `Energy consumption overview for room ${overview.room.room_id}.` 
            : "Here is your energy consumption overview for this billing cycle."}
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Metric 1 */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">KWH Used This Month</CardTitle>
            <div className="bg-blue-50 p-1.5 rounded-full">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{usageKwh.toFixed(1)}</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Bill (IDR)</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{billValue}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {ratePerKwh > 0 ? `Based on Rp ${ratePerKwh.toLocaleString("id-ID")}/kWh rate` : "Based on current usage rate"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Days Remaining In Cycle</CardTitle>
            <CalendarIcon className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1 mb-3">
              <span className="text-3xl font-bold text-slate-900">{daysRemaining}</span>
              <span className="text-sm font-medium text-slate-500">Days</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${usagePercent}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Area Chart (Takes 2 columns) */}
        <Card className="md:col-span-2 bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-semibold">
              {overview?.range?.interval === "hour" ? "Hourly Consumption Today" : "Daily Consumption"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      dy={10}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No consumption data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart (Takes 1 column) */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Usage vs Monthly Limit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center relative pt-4">
            <div className="h-[180px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Used", value: usagePercent, fill: "#f59e0b" },
                      { name: "Remaining", value: Math.max(100 - usagePercent, 0), fill: "#f1f5f9" },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { name: "Used", value: usagePercent, fill: "#f59e0b" },
                      { name: "Remaining", value: Math.max(100 - usagePercent, 0), fill: "#f1f5f9" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-900">{usagePercent}%</span>
                <span className="text-[10px] font-medium text-slate-500">of {monthlyLimit} kWh</span>
              </div>
            </div>
            
            {/* Custom Legend */}
            <div className="flex items-center justify-between w-full px-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-medium text-slate-500">Safe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] font-medium text-slate-500">Warn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[10px] font-medium text-slate-500">Limit</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom 3 Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Proyeksi Akhir Bulan */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center border-b pb-3 space-y-0">
            <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
            <CardTitle className="text-sm font-semibold">Proyeksi Akhir Bulan</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Estimated Final Usage</span>
              <span className="font-semibold text-slate-900">{projectedKwh.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">kWh</span></span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Estimated Final Cost</span>
              <span className="font-semibold text-slate-900">{formatCurrency(Math.round(projectedBill))}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {projectedKwh > monthlyLimit
                  ? "Projection indicates you may exceed your monthly limit. Consider reducing usage."
                  : "Projection indicates you will stay within your monthly limit. No immediate action required."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips Hemat Energi */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center border-b pb-3 space-y-0">
            <Zap className="w-4 h-4 text-orange-500 mr-2" />
            <CardTitle className="text-sm font-semibold">Tips Hemat Energi</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-1.5 rounded-full mt-0.5">
                <Snowflake className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Optimize AC Usage</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Raising your thermostat by 1°C can save up to 10% on cooling costs.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-1.5 rounded-full mt-0.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Shift High Loads</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Run your washing machine after 10 PM to avoid peak demand spikes.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="bg-white shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-slate-700 mr-2" />
              <CardTitle className="text-sm font-semibold">Recent Alerts</CardTitle>
            </div>
            {alerts.length > 0 && (
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3 flex-1 flex flex-col">
            {alerts.length > 0 ? (
              alerts.slice(0, 2).map((alert) => (
                <div key={alert.alert_id} className={`border rounded-lg p-3 ${!alert.is_read ? "border-red-100 bg-red-50/50" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!alert.is_read ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <h4 className="text-xs font-semibold text-slate-900">
                      {alertTypeLabel[alert.alert_type] || alert.alert_type}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-500 pl-5.5">{alert.message}</p>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                No recent alerts
              </div>
            )}

            <div className="mt-auto pt-2">
              <Link 
                href="/users/notifications" 
                className="block text-center w-full text-[10px] font-bold text-blue-700 uppercase tracking-wider hover:underline py-2"
              >
                View All Alerts
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}