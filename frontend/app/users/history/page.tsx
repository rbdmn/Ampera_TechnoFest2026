"use client"

import { useEffect, useState } from "react"
import { 
  Zap, 
  BarChart2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  TrendingUp,
  ChevronDown,
  Check,
  Filter
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"
import { apiFetch } from "@/lib/api"
import { getEmail } from "@/lib/auth"

interface DashboardSeriesItem {
  ts: string
  kwh: number
}

interface UserDashboardOverview {
  user: {
    user_id: string
    full_name?: string
    email: string
    role: string
  }
  room: {
    room_id: string
  }
  range: {
    start: string
    end: string
    interval: string
  }
  totals: {
    kwh: number
  }
  series: DashboardSeriesItem[]
  latest_meter_reading: {
    reading_id: string
    room_id: string
    reading_value_kwh: number
    usage_delta_kwh: number
    period_start: string
    period_end: string
    source: string
    verification_status: string
  }
}

interface ConsumptionLogItem {
  date: string
  consumption: number
  peakDemand: number
  status: string
  statusType: "warning" | "normal"
}

const defaultChartData = [
  { date: "Day 1", actual: 0, estimated: 0 },
  { date: "Day 2", actual: 0, estimated: 0 },
]

export default function UserEnergyHistoryPage() {
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily")
  const [dateRange, setDateRange] = useState<"7" | "30" | "all">("30")
  const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "warning">("all")
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  
  // Data fetching states
  const [overview, setOverview] = useState<UserDashboardOverview | null>(null)
  const [chartData, setChartData] = useState(defaultChartData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const email = getEmail()
    if (!email) {
      setError("User email tidak ditemukan. Silakan login kembali.")
      setLoading(false)
      return
    }

    const dashboardEmail = email

    async function loadHistory() {
      try {
        const res = await apiFetch(`/dashboard/user/overview?email=${encodeURIComponent(dashboardEmail)}`)
        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          throw new Error(errorData?.detail || "Failed to load history data")
        }

        const data: UserDashboardOverview = await res.json()
        setOverview(data)

        // Convert series data to chart format
        if (data.series.length > 0) {
          const transformed = data.series.map((item) => ({
            date: new Date(item.ts).toLocaleDateString(),
            actual: Math.round(item.kwh * 10) / 10,
            estimated: 0,
          }))
          setChartData(transformed)
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load history")
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  // Calculate metrics from overview data
  const totalConsumption = overview?.totals.kwh ?? 0
  const averageDailyUse = overview?.series.length 
    ? Math.round((totalConsumption / overview.series.length) * 10) / 10 
    : 0
  const peakDemand = overview?.series.length 
    ? Math.round(Math.max(...overview.series.map(s => s.kwh)) * 10) / 10 
    : 0

  // Convert series data to daily log format
  const dailyLogData: ConsumptionLogItem[] = (overview?.series ?? [])
    .map((item) => {
      const statusType: "warning" | "normal" = item.kwh > 50 ? "warning" : "normal"
      return {
        date: new Date(item.ts).toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "short", 
          day: "numeric" 
        }),
        consumption: Math.round(item.kwh * 10) / 10,
        peakDemand: Math.round(item.kwh * 0.15 * 10) / 10,
        status: item.kwh > 50 ? "High Peak Detected" : "Normal",
        statusType,
      }
    })
    .reverse()

  const getDateRangeLabel = () => {
    if (viewMode === "monthly") {
      if (dateRange === "7") return "Last 3 Months"
      if (dateRange === "30") return "Last 6 Months"
      return "All Time"
    }
    if (dateRange === "7") return "Last 7 Days"
    if (dateRange === "30") return "Last 30 Days"
    return "All Time"
  }

  const getFilteredChartData = () => {
    if (dateRange === "7") {
      return chartData.slice(0, 7)
    }
    if (dateRange === "30" && viewMode === "daily") {
      return chartData.slice(0, 30)
    }
    return chartData
  }

  const dailyTableData = dailyLogData.filter(
    (item) => filterStatus === "all" || item.statusType === filterStatus
  )

  const activeChartData = getFilteredChartData()
  const hasActiveFilters = dateRange !== "30" || filterStatus !== "all"

  const dateOptions = [
    { value: "7", label: viewMode === "daily" ? "Last 7 Days" : "Last 3 Months" },
    { value: "30", label: viewMode === "daily" ? "Last 30 Days" : "Last 6 Months" },
    { value: "all", label: "All Time" },
  ]

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-600">
        Loading history data...
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
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consumption History</h1>
          <p className="text-sm text-slate-500">Analyze your detailed electricity usage patterns over time.</p>
        </div>
        
        {/* Actions Container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Daily/Monthly Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border text-sm font-medium">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1 rounded transition-all ${viewMode === "daily" ? "bg-white text-blue-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1 rounded transition-all ${viewMode === "monthly" ? "bg-white text-blue-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              Monthly
            </button>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Button
              variant="outline"
              className="text-slate-600 font-medium h-9 text-sm bg-white justify-between"
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
            >
              <span className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {getDateRangeLabel()}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>

            {isDateFilterOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg z-20 overflow-hidden">
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateRange(option.value as "7" | "30" | "all")
                      setIsDateFilterOpen(false)
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 ${dateRange === option.value ? "bg-slate-100 text-slate-900" : ""}`}
                  >
                    {option.label}
                    {dateRange === option.value && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button */}
          <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* 3 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Total Consumption */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Consumption</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{totalConsumption.toFixed(0)}</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 bg-orange-100/80 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">
                <TrendingUp className="h-3 w-3" />
                +4.2% vs last 30 days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Average Daily Use */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Daily Use</CardTitle>
            <BarChart2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{averageDailyUse.toFixed(1)}</span>
              <span className="text-sm font-medium text-slate-500">kWh/day</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Typical range: 35-45 kWh</p>
          </CardContent>
        </Card>

        {/* Card 3: Peak Demand */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peak Demand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{peakDemand.toFixed(1)}</span>
              <span className="text-sm font-medium text-slate-500">kW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {overview?.latest_meter_reading 
                ? `Last reading: ${new Date(overview.latest_meter_reading.period_end).toLocaleDateString()}` 
                : "No recent data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Chart Section */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">
            {viewMode === "daily" ? "Daily Consumption Breakdown" : "Monthly Consumption Breakdown"}
          </CardTitle>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0d4ed8]"></span>
              Actual Use
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#dbeafe]"></span>
              Estimated Base
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {chartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeChartData} barGap={0} barCategoryGap={0}>
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="actual" stackId="a" fill="#0d4ed8" />
                  <Bar dataKey="estimated" stackId="a" fill="#dbeafe" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] w-full flex items-center justify-center text-slate-500">
              No data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Table Section */}
      {viewMode === "daily" ? (
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4 gap-4">
            <CardTitle className="text-base font-semibold">Daily Log</CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                className="text-slate-600 font-medium h-9 text-sm bg-white"
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {filterStatus === "all" ? "All Statuses" : filterStatus === "normal" ? "Normal" : "Warning"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>

              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { setFilterStatus("all"); setIsStatusFilterOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm ${filterStatus === "all" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                  >All Statuses</button>
                  <button
                    onClick={() => { setFilterStatus("normal"); setIsStatusFilterOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm ${filterStatus === "normal" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                  >Normal</button>
                  <button
                    onClick={() => { setFilterStatus("warning"); setIsStatusFilterOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm ${filterStatus === "warning" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                  >Warning</button>
                </div>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Consumption (kWh)</th>
                  <th className="px-6 py-4 font-semibold text-center">Peak Demand (kW)</th>
                  <th className="px-6 py-4 font-semibold">Status / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyTableData.length > 0 ? (
                  dailyTableData.map((item) => (
                    <tr key={item.date} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-900">{item.date}</td>
                      <td className="px-6 py-4 text-slate-900 text-center">{item.consumption}</td>
                      <td className={`px-6 py-4 text-center ${item.peakDemand > 5.5 ? "text-red-600 font-medium" : "text-slate-600"}`}>
                        {item.peakDemand}
                      </td>
                      <td className="px-6 py-4">
                        {item.statusType === "warning" ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-orange-50 text-orange-600 border border-orange-100">
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">{item.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      <p className="font-medium">No daily log data found</p>
                      <p className="text-xs">Try changing the status filter or date range.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">Monthly Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Period</th>
                  <th className="px-6 py-4 font-semibold text-center">Total Consumption (kWh)</th>
                  <th className="px-6 py-4 font-semibold text-right">Average Daily</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.length > 0 ? (
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-900">
                      {overview?.range.start ? new Date(overview.range.start).toLocaleDateString() : "Current"}
                    </td>
                    <td className="px-6 py-4 text-slate-900 text-center">{totalConsumption.toFixed(1)}</td>
                    <td className="px-6 py-4 text-slate-600 text-right">{averageDailyUse.toFixed(1)} kWh</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      <p className="font-medium">No monthly data found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}