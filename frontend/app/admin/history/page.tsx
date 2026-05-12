"use client"

import { useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

// --- DUMMY DATA ---

// Daily Log Data
const dailyLogData = [
  { date: "Oct 14, 2023", consumption: 42.5, peakDemand: 6.2, status: "High Peak Detected", statusType: "warning" },
  { date: "Oct 13, 2023", consumption: 38.1, peakDemand: 4.1, status: "Normal", statusType: "normal" },
  { date: "Oct 12, 2023", consumption: 40.2, peakDemand: 4.5, status: "Normal", statusType: "normal" },
  { date: "Oct 11, 2023", consumption: 39.8, peakDemand: 4.3, status: "Normal", statusType: "normal" },
  { date: "Oct 10, 2023", consumption: 68.0, peakDemand: 5.8, status: "Anomalous Usage", statusType: "warning" },
  { date: "Oct 09, 2023", consumption: 45.0, peakDemand: 4.8, status: "Normal", statusType: "normal" },
  { date: "Oct 08, 2023", consumption: 68.0, peakDemand: 5.2, status: "Normal", statusType: "normal" },
  { date: "Oct 07, 2023", consumption: 58.0, peakDemand: 4.9, status: "Normal", statusType: "normal" },
  { date: "Oct 06, 2023", consumption: 62.0, peakDemand: 5.1, status: "Normal", statusType: "normal" },
  { date: "Oct 05, 2023", consumption: 55.0, peakDemand: 4.7, status: "Normal", statusType: "normal" },
]

// Monthly Log Data (Data baru untuk tab Monthly)
const monthlyLogData = [
  { date: "October 2023", consumption: 1245.0, peakDemand: 6.8, status: "Warning: Approaching Limit", statusType: "warning" },
  { date: "September 2023", consumption: 1320.5, peakDemand: 7.1, status: "High Peak Detected", statusType: "warning" },
  { date: "August 2023", consumption: 1450.0, peakDemand: 6.5, status: "Normal", statusType: "normal" },
  { date: "July 2023", consumption: 1280.2, peakDemand: 5.9, status: "Normal", statusType: "normal" },
  { date: "June 2023", consumption: 1150.8, peakDemand: 5.5, status: "Normal", statusType: "normal" },
]

// Daily Chart Data
const dailyChartData = [
  { date: "Sep 25", actual: 55, estimated: 0 },
  { date: "Sep 26", actual: 85, estimated: 0 },
  { date: "Sep 27", actual: 75, estimated: 0 },
  { date: "Sep 28", actual: 40, estimated: 0 },
  { date: "Sep 29", actual: 35, estimated: 0 },
  { date: "Sep 30", actual: 45, estimated: 0 },
  { date: "Oct 01", actual: 48, estimated: 0 },
  { date: "Oct 02", actual: 58, estimated: 0 },
  { date: "Oct 03", actual: 60, estimated: 0 },
  { date: "Oct 04", actual: 55, estimated: 0 },
  { date: "Oct 05", actual: 45, estimated: 0 },
  { date: "Oct 06", actual: 62, estimated: 0 },
  { date: "Oct 07", actual: 58, estimated: 0 },
  { date: "Oct 08", actual: 68, estimated: 0 },
  { date: "Oct 09", actual: 45, estimated: 0 },
  { date: "Oct 10", actual: 0, estimated: 42 },
  { date: "Oct 11", actual: 0, estimated: 45 },
  { date: "Oct 12", actual: 0, estimated: 40 },
  { date: "Oct 13", actual: 0, estimated: 43 },
  { date: "Oct 14", actual: 0, estimated: 45 },
]

// Monthly Chart Data (Data baru)
const monthlyChartData = [
  { date: "May", actual: 1100, estimated: 0 },
  { date: "Jun", actual: 1150, estimated: 0 },
  { date: "Jul", actual: 1280, estimated: 0 },
  { date: "Aug", actual: 1450, estimated: 0 },
  { date: "Sep", actual: 1320, estimated: 0 },
  { date: "Oct", actual: 0, estimated: 1245 },
]

export default function EnergyMonitoringPage() {
  // STATE MANAGEMENT
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily")
  const [dateRange, setDateRange] = useState<"7" | "30" | "all">("30")
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  
  const [sortBy, setSortBy] = useState<"date" | "consumption" | "peakDemand" | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "warning">("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  // LOGIC: Filter dan Sort Data Tabel
  const getFilteredAndSortedData = () => {
    // 1. Pilih dataset berdasarkan viewMode
    let data = viewMode === "daily" ? [...dailyLogData] : [...monthlyLogData]

    // 2. Filter by Date Range (Memotong array sesuai jumlah yang diminta)
    if (dateRange === "7") {
      data = data.slice(0, viewMode === "daily" ? 7 : 3) 
    } else if (dateRange === "30") {
      data = data.slice(0, viewMode === "daily" ? 30 : 6)
    }

    // 3. Filter by Status
    if (filterStatus !== "all") {
      data = data.filter(item => item.statusType === filterStatus)
    }

    // 4. Sort data
    if (sortBy === "date") {
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else if (sortBy === "consumption") {
      data.sort((a, b) => b.consumption - a.consumption)
    } else if (sortBy === "peakDemand") {
      data.sort((a, b) => b.peakDemand - a.peakDemand)
    }

    return data
  }

  const filteredData = getFilteredAndSortedData()
  const activeChartData = viewMode === "daily" ? dailyChartData : monthlyChartData

  const handleClearFilters = () => {
    setSortBy(null)
    setFilterStatus("all")
    setDateRange("30")
    setIsFilterOpen(false)
    setIsDateFilterOpen(false)
  }

  const hasActiveFilters = sortBy !== null || filterStatus !== "all" || dateRange !== "30"

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
                  onClick={() => { setDateRange("30"); setIsDateFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {viewMode === "daily" ? "Last 30 Days" : "Last 6 Months"}
                  {dateRange === "30" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
                <div className="border-t my-1"></div>
                <button 
                  onClick={() => { setDateRange("all"); setIsDateFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  All Time
                  {dateRange === "all" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
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

      {/* 3 Top Metric Cards (Statik untuk demo, namun labelnya berubah) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {viewMode === "daily" ? "Total Consumption (MTD)" : "Total Consumption (YTD)"}
            </CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{viewMode === "daily" ? "1,245" : "15,840"}</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">
                <TrendingUp className="h-3 w-3" />
                {viewMode === "daily" ? "+4.2% vs last 30 days" : "+1.5% vs last year"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {viewMode === "daily" ? "Average Daily Use" : "Average Monthly Use"}
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{viewMode === "daily" ? "41.5" : "1,320"}</span>
              <span className="text-sm font-medium text-slate-500">{viewMode === "daily" ? "kWh/day" : "kWh/mo"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peak Demand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{viewMode === "daily" ? "6.2" : "7.1"}</span>
              <span className="text-sm font-medium text-slate-500">kW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {viewMode === "daily" ? "Recorded on Oct 14" : "Recorded on Sep 2023"}
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