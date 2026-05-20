"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Zap, 
  BarChart2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  TrendingUp,
  ChevronDown,
  Filter,
  X,
  Check
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

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
  }
  series: Array<{ ts: string; kwh: number }>
}

const getErrorMessage = (err: unknown, fallback: string) => {
  return err instanceof Error ? err.message : fallback
}


export default function EnergyMonitoringPage() {
  // STATE MANAGEMENT
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily")
  const [dateRange, setDateRange] = useState<"7" | "30" | "all">("30")
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  
  const [sortBy, setSortBy] = useState<"date" | "consumption" | "peakDemand" | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "warning">("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const startDate = "2020-01-01T00:00:00Z";
        const endDate = new Date().toISOString();

        const res = await apiFetch(`/dashboard/admin/overview?interval=day&start=${startDate}&end=${endDate}`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.detail || 'Gagal memuat data history energi')
        }

        const overviewData: AdminDashboardOverview = await res.json()
        setOverview(overviewData)
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Terjadi kesalahan saat memuat data history energi'))
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  const dailyChartData = useMemo(() => {
    if (!overview || overview.series.length === 0) return []

    // Cari rata-rata pemakaian harian
    const totalUsage = overview.series.reduce((sum, item) => sum + item.kwh, 0)
    const averageDaily = totalUsage / overview.series.length

    return overview.series.map((item) => ({
      date: new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      actual: Number(item.kwh.toFixed(1)),
      // Logika: Kalau pemakaian hari ini di bawah rata-rata, isi selisihnya ke 'estimated'
      estimated: item.kwh < averageDaily ? Number((averageDaily - item.kwh).toFixed(1)) : 0,
    }))
  }, [overview])

  const monthlyChartData = useMemo(() => {
    if (!overview || overview.series.length === 0) return []

    // Grouping data per bulan
    const grouped = overview.series.reduce<Record<string, { consumption: number }>>((acc, item) => {
      const key = new Date(item.ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!acc[key]) acc[key] = { consumption: 0 }
      acc[key].consumption += item.kwh
      return acc
    }, {})

    const monthlyArray = Object.entries(grouped).map(([month, val]) => ({
      date: month,
      actual: Number(val.consumption.toFixed(1)),
    }))

    // Cari rata-rata pemakaian bulanan
    const totalMonthly = monthlyArray.reduce((sum, item) => sum + item.actual, 0)
    const avgMonthly = totalMonthly / monthlyArray.length

    return monthlyArray.map((item) => ({
      ...item,
      // Logika: Kalau pemakaian bulan ini di bawah rata-rata, isi selisihnya ke 'estimated'
      estimated: item.actual < avgMonthly ? Number((avgMonthly - item.actual).toFixed(1)) : 0,
    }))
  }, [overview])

  const dailyLogData = useMemo(() => {
    if (!overview) return []

    return overview.series.map((item) => ({
      date: new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      consumption: Number(item.kwh.toFixed(1)),
      peakDemand: Number((item.kwh / 8).toFixed(1)),
      status: item.kwh > 65 ? 'High Peak Detected' : 'Normal',
      statusType: item.kwh > 65 ? 'warning' : 'normal',
    }))
  }, [overview])

  const monthlyLogData = useMemo(() => {
    if (!overview) return []

    const grouped = overview.series.reduce<Record<string, { consumption: number; peakDemand: number }>>((acc, item) => {
      const month = new Date(item.ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const consumption = item.kwh
      const peakDemand = Math.max(3, Number((item.kwh / 8).toFixed(1)))

      if (!acc[month]) {
        acc[month] = { consumption, peakDemand }
      } else {
        acc[month].consumption += consumption
        acc[month].peakDemand = Math.max(acc[month].peakDemand, peakDemand)
      }
      return acc
    }, {})

    return Object.entries(grouped).map(([month, value]) => ({
      date: month,
      consumption: Number(value.consumption.toFixed(1)),
      peakDemand: value.peakDemand,
      status: value.consumption > 1300 ? 'Warning: Approaching Limit' : 'Normal',
      statusType: value.consumption > 1300 ? 'warning' : 'normal',
    }))
  }, [overview])

  // LOGIC: Memilih data teks untuk dropdown Date Filter
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

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("all") 

  // MASTER FILTER: satu sumber data untuk grafik dan tabel
  const filteredData = useMemo(() => {
    if (!overview || !overview.series) return []

    if (viewMode === "daily") {
      // Build daily items from series
      let data = overview.series.map((s) => {
        const d = new Date(s.ts)
        const consumption = Number(s.kwh.toFixed(1))
        return {
          ts: s.ts,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          dateISO: d.toISOString(),
          date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          consumption,
          peakDemand: Number((s.kwh / 8).toFixed(1)),
          status: s.kwh > 65 ? 'High Peak Detected' : 'Normal',
          statusType: s.kwh > 65 ? 'warning' : 'normal',
        }
      })

      // Status filter
      if (filterStatus !== 'all') data = data.filter(d => d.statusType === filterStatus)

      // Specific month filter has priority
      if (selectedMonthYear !== 'all') {
        const [y, m] = selectedMonthYear.split('-').map(Number)
        data = data.filter(d => d.year === y && d.month === m)
      }

      // Determine sorting comparator based on sortBy
      if (sortBy === 'consumption') data.sort((a, b) => b.consumption - a.consumption)
      else if (sortBy === 'peakDemand') data.sort((a, b) => b.peakDemand - a.peakDemand)
      else data.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())

      // If not filtering a specific month, apply dateRange slicing (keep highest/peak order when sorted by those keys)
      if (selectedMonthYear === 'all') {
        if (dateRange === '7') data = data.slice(0, 7)
        else if (dateRange === '30') data = data.slice(0, 30)
      }

      return data
    }

    // Monthly view: aggregate by month
    const grouped: Record<string, { year: number; month: number; consumption: number; peakDemand: number }> = {}
    overview.series.forEach((s) => {
      const d = new Date(s.ts)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!grouped[key]) grouped[key] = { year: d.getFullYear(), month: d.getMonth()+1, consumption: 0, peakDemand: 0 }
      grouped[key].consumption += s.kwh
      grouped[key].peakDemand = Math.max(grouped[key].peakDemand, s.kwh / 8)
    })

    let data = Object.entries(grouped).map(([key, val]) => ({
      key,
      date: new Date(val.year, val.month-1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year: val.year,
      month: val.month,
      consumption: Number(val.consumption.toFixed(1)),
      peakDemand: Number(Math.max(3, Number(val.peakDemand.toFixed(1)))),
      status: val.consumption > 1300 ? 'Warning: Approaching Limit' : 'Normal',
      statusType: val.consumption > 1300 ? 'warning' : 'normal',
    }))

    // Status filter
    if (filterStatus !== 'all') data = data.filter(d => d.statusType === filterStatus)

    // Specific month filter has priority
    if (selectedMonthYear !== 'all') {
      const [y, m] = selectedMonthYear.split('-').map(Number)
      data = data.filter(d => d.year === y && d.month === m)
    } else {
      // Sorting
      if (sortBy === 'consumption') data.sort((a, b) => b.consumption - a.consumption)
      else if (sortBy === 'peakDemand') data.sort((a, b) => b.peakDemand - a.peakDemand)
      else data.sort((a, b) => {
        // sort by year-month desc
        const aKey = `${a.year}-${String(a.month).padStart(2,'0')}`
        const bKey = `${b.year}-${String(b.month).padStart(2,'0')}`
        return bKey.localeCompare(aKey)
      })

      // Slice by dateRange (monthly counts)
      if (dateRange === '7') data = data.slice(0, 3)
      else if (dateRange === '30') data = data.slice(0, 6)
    }

    return data
  }, [overview, viewMode, dateRange, selectedMonthYear, filterStatus, sortBy])
  // LOGIC: Sesuaikan grafik dengan filter rentang waktu
  const activeChartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    if (viewMode === 'daily') {
      const points = filteredData.map((d) => ({ date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), actual: d.consumption, estimated: 0 }))
      // chronological order for chart
      return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // monthly view
    const points = filteredData.map((d) => ({ date: d.date, actual: d.consumption, estimated: 0 }))
    // sort months chronological
    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredData, viewMode])

  const handleClearFilters = () => {
    setSortBy(null)
    setFilterStatus("all")
    setDateRange("30")
    setIsFilterOpen(false)
    setIsDateFilterOpen(false)
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        view_mode: viewMode,
        date_range: dateRange,
        selected_month: selectedMonthYear,
        status: filterStatus,
        sort_by: sortBy ?? "date",
      })

      if (overview?.range?.start) params.set("start", overview.range.start)
      if (overview?.range?.end) params.set("end", overview.range.end)

      const res = await apiFetch(`/reports/admin-energy.pdf?${params.toString()}`, {
        headers: { Accept: "application/pdf" },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || "Gagal export PDF")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ampera-energy-monitoring-${viewMode}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal export PDF"))
    } finally {
      setExportingPdf(false)
    }
  }

  const availableMonths = useMemo(() => {
  if (!overview) return []
  const months = new Set<string>()
  
  overview.series.forEach(item => {
    const d = new Date(item.ts)
    // Format YYYY-MM
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  })
  
  // Kembalikan array terurut dari yang terbaru (menurun)
  return Array.from(months).sort((a, b) => b.localeCompare(a))
}, [overview])

  const hasActiveFilters = sortBy !== null || filterStatus !== "all" || dateRange !== "30"

  // KALKULASI UNTUK 3 KARTU METRIK ATAS
  const cardMetrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { total: 0, average: 0, peak: 0, peakDate: "-" }
    }

    // 1. Total Konsumsi
    const total = filteredData.reduce((sum, item) => sum + item.consumption, 0)
    
    // 2. Rata-rata Konsumsi
    const average = total / filteredData.length

    // 3. Peak Demand Tertinggi beserta Tanggalnya
    let maxPeakItem = filteredData[0]
    filteredData.forEach(item => {
      if (item.peakDemand > maxPeakItem.peakDemand) {
        maxPeakItem = item
      }
    })

    return {
      total,
      average,
      peak: maxPeakItem.peakDemand,
      peakDate: maxPeakItem.date
    }
  }, [filteredData])

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto py-20 text-center text-slate-600">
        Memuat data history energi...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto py-20 text-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
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

          {/* Date Filter Dropdown */}
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
              className="text-slate-600 font-medium h-9 text-sm w-[160px] justify-between bg-white"
            >
              <span className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {getDateRangeLabel()}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            
            {isDateFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 overflow-hidden">
                <button 
                  onClick={() => { setDateRange("7"); setIsDateFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {viewMode === "daily" ? "Last 7 Days" : "Last 3 Months"}
                  {dateRange === "7" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
                <button 
                  onClick={() => { setDateRange("30"); setSelectedMonthYear("all"); setIsDateFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {viewMode === "daily" ? "Last 30 Days" : "Last 6 Months"}
                  {dateRange === "30" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
                <div className="border-t my-1"></div>
                <button 
                  onClick={() => { setDateRange("all"); setSelectedMonthYear("all"); setIsDateFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  All Time
                  {dateRange === "all" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              </div>
            )}
          </div>
          <select 
  className="h-9 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 bg-white"
  value={selectedMonthYear}
  onChange={(e) => {
    setSelectedMonthYear(e.target.value)
    setDateRange("all") // Otomatis matikan filter '7 days/30 days' jika milih bulan
  }}
>
  <option value="all">All Months</option>
  {availableMonths.map(my => {
    const [y, m] = my.split('-')
    const monthName = new Date(Number(y), Number(m)-1).toLocaleString('default', { month: 'long' })
    return (
      <option key={my} value={my}>{monthName} {y}</option>
    )
  })}
</select>
          {/* Export Button */}
          <Button
            className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportingPdf ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* 3 Top Metric Cards (Statik untuk demo, namun labelnya berubah) */}
      {/* 3 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Total Consumption */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {viewMode === "daily" ? "Total Consumption (Filtered)" : "Total Consumption (Filtered)"}
            </CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              {/* Tampilkan nilai total dinamis */}
              <span className="text-2xl font-bold text-slate-900">
                {cardMetrics.total.toLocaleString("en-US", { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            {/* Note: Persentase tren sementara disembunyikan/distatiskan karena butuh API pembanding terpisah */}
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                Data based on current filter
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Average Use */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {viewMode === "daily" ? "Average Daily Use" : "Average Monthly Use"}
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              {/* Tampilkan nilai rata-rata dinamis */}
              <span className="text-2xl font-bold text-slate-900">
                {cardMetrics.average.toLocaleString("en-US", { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm font-medium text-slate-500">{viewMode === "daily" ? "kWh/day" : "kWh/mo"}</span>
            </div>
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
              {/* Tampilkan nilai peak tertinggi dinamis */}
              <span className="text-2xl font-bold text-slate-900">
                {cardMetrics.peak.toLocaleString("en-US", { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm font-medium text-slate-500">kW</span>
            </div>
            {/* Tampilkan tanggal kapan peak itu terjadi */}
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Recorded on {cardMetrics.peakDate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Chart Section */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">
            {viewMode === "daily" ? "Consumption Breakdown (Daily)" : "Consumption Trend (Monthly)"}
          </CardTitle>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-700"></span>
              Actual Use
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-100"></span>
              Estimated Base
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeChartData} barGap={0} barCategoryGap={0}>
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="actual" stackId="a" fill="#1d4ed8" />
                <Bar dataKey="estimated" stackId="a" fill="#dbeafe" />
                
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickFormatter={(value) => {
                    // Untuk harian, kurangi label biar tidak penuh. Bulanan tampilkan semua.
                    if (viewMode === "monthly") return value;
                    if (value === 'Sep 25' || value === 'Oct 01' || value === 'Oct 08' || value === 'Oct 14') return value;
                    return '';
                  }} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">
            {viewMode === "daily" ? "Daily Log" : "Monthly Summary"}
          </CardTitle>
          <div className="flex items-center gap-2">
            
            {/* Filter Dropdown */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`text-sm bg-white ${hasActiveFilters ? "bg-blue-50 border-blue-300" : ""}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {(sortBy ? 1 : 0) + (filterStatus !== "all" ? 1 : 0) + (dateRange !== "30" ? 1 : 0)}
                  </span>
                )}
              </Button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10 p-4 space-y-4">
                  {/* Sort Options */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Sort By</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="sort" value="date"
                          checked={sortBy === "date"} onChange={() => setSortBy("date")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">Latest Date</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="sort" value="consumption"
                          checked={sortBy === "consumption"} onChange={() => setSortBy("consumption")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">Highest Consumption</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="sort" value="peakDemand"
                          checked={sortBy === "peakDemand"} onChange={() => setSortBy("peakDemand")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">Highest Peak Demand</span>
                      </label>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Status Filter</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="status" value="all"
                          checked={filterStatus === "all"} onChange={() => setFilterStatus("all")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">All Status</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="status" value="normal"
                          checked={filterStatus === "normal"} onChange={() => setFilterStatus("normal")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-1"></span>Normal
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input 
                          type="radio" name="status" value="warning"
                          checked={filterStatus === "warning"} onChange={() => setFilterStatus("warning")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="inline-block w-2 h-2 bg-orange-600 rounded-full mr-1"></span>Warning
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Clear Button */}
                  {hasActiveFilters && (
                    <div className="border-t pt-4">
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleClearFilters}>
                        <X className="h-3 w-3 mr-1" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs">
            <span className="text-blue-900 font-medium">
              {dateRange !== "30" && `${getDateRangeLabel()} • `}
              {sortBy && `Sorted by: ${sortBy === "date" ? "Newest Date" : sortBy === "consumption" ? "Highest Consumption" : "Highest Peak Demand"}`}
              {sortBy && filterStatus !== "all" && " • "}
              {filterStatus !== "all" && `${filterStatus === "normal" ? "Normal" : "Warning"} Status`}
            </span>
            <button onClick={handleClearFilters} className="text-blue-600 hover:text-blue-800 font-semibold">
              Clear
            </button>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{viewMode === "daily" ? "Date" : "Month"}</th>
                <th className="px-6 py-4 font-semibold">Consumption (kWh)</th>
                <th className="px-6 py-4 font-semibold">Peak Demand (kW)</th>
                <th className="px-6 py-4 font-semibold">Status / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.date}</td>
                    <td className={`px-6 py-4 ${item.consumption > (viewMode==="daily"? 60 : 1300) ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                      {item.consumption.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 ${item.peakDemand > (viewMode==="daily"? 5.5 : 6.8) ? "text-red-600 font-medium" : "text-slate-600"}`}>
                      {item.peakDemand}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                        item.statusType === "warning" 
                          ? "bg-orange-100 text-orange-700" 
                          : "text-slate-500 text-xs bg-slate-100"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <p className="font-medium">No data found</p>
                    <p className="text-xs">Try adjusting your filters or date range</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
