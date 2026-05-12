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
  Check,
  Filter
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

const dailyChartData = [
  { date: "Sep 15", actual: 45, estimated: 0 },
  { date: "Sep 16", actual: 52, estimated: 0 },
  { date: "Sep 17", actual: 38, estimated: 0 },
  { date: "Sep 18", actual: 40, estimated: 0 },
  { date: "Sep 19", actual: 65, estimated: 0 },
  { date: "Sep 20", actual: 70, estimated: 0 },
  { date: "Sep 21", actual: 68, estimated: 0 },
  { date: "Sep 22", actual: 42, estimated: 0 },
  { date: "Sep 23", actual: 45, estimated: 0 },
  { date: "Sep 24", actual: 48, estimated: 0 },
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

const monthlyChartData = [
  { date: "May", actual: 1100, estimated: 0 },
  { date: "Jun", actual: 1150, estimated: 0 },
  { date: "Jul", actual: 1280, estimated: 0 },
  { date: "Aug", actual: 1450, estimated: 0 },
  { date: "Sep", actual: 1320, estimated: 0 },
  { date: "Oct", actual: 1245, estimated: 0 },
]

const dailyLogData = [
  { date: "Oct 14, 2023", consumption: 42.5, peakDemand: 6.2, status: "High Peak Detected", statusType: "warning" },
  { date: "Oct 13, 2023", consumption: 38.1, peakDemand: 4.1, status: "Normal", statusType: "normal" },
  { date: "Oct 12, 2023", consumption: 40.2, peakDemand: 4.5, status: "Normal", statusType: "normal" },
  { date: "Oct 11, 2023", consumption: 39.8, peakDemand: 4.3, status: "Normal", statusType: "normal" },
  { date: "Oct 10, 2023", consumption: 68.0, peakDemand: 5.8, status: "Anomalous Usage", statusType: "warning" },
  { date: "Oct 09, 2023", consumption: 45.0, peakDemand: 4.8, status: "Normal", statusType: "normal" },
]

const monthlySummaryData = [
  { date: "September 2023", consumption: 1320.5, bill: "$158.46" },
  { date: "August 2023", consumption: 1450.0, bill: "$174.00" },
  { date: "July 2023", consumption: 1280.2, bill: "$153.62" },
]

export default function UserEnergyHistoryPage() {
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily")
  const [dateRange, setDateRange] = useState<"7" | "30" | "all">("30")
  const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "warning">("all")
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)

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
    const source = viewMode === "daily" ? dailyChartData : monthlyChartData
    if (dateRange === "7") {
      return source.slice(0, viewMode === "daily" ? 7 : 3)
    }
    if (dateRange === "30" && viewMode === "daily") {
      return source.slice(0, 30)
    }
    return source
  }

  const dailyTableData = dailyLogData.filter((item) => filterStatus === "all" || item.statusType === filterStatus)
  const monthlyTableData = monthlySummaryData

  const activeChartData = getFilteredChartData()
  const hasActiveFilters = dateRange !== "30" || filterStatus !== "all"

  const dateOptions = [
    { value: "7", label: viewMode === "daily" ? "Last 7 Days" : "Last 3 Months" },
    { value: "30", label: viewMode === "daily" ? "Last 30 Days" : "Last 6 Months" },
    { value: "all", label: "All Time" },
  ]

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
              <span className="text-3xl font-bold text-slate-900">1,245</span>
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
              <span className="text-3xl font-bold text-slate-900">41.5</span>
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
              <span className="text-3xl font-bold text-slate-900">6.2</span>
              <span className="text-sm font-medium text-slate-500">kW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Recorded on Oct 14, 6:00 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Chart Section */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">Last 30 Days Breakdown</CardTitle>
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
                  tickFormatter={(value) => {
                    if (viewMode === "monthly") return value;
                    if (value === 'Sep 15' || value === 'Sep 22' || value === 'Sep 29' || value === 'Oct 06' || value === 'Oct 14') {
                      return value;
                    }
                    return '';
                  }} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                  <th className="px-6 py-4 font-semibold">Month</th>
                  <th className="px-6 py-4 font-semibold text-center">Total Consumption (kWh)</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTableData.map((item) => (
                  <tr key={item.date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-900">{item.date}</td>
                    <td className="px-6 py-4 text-slate-900 text-center">{item.consumption}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium text-right">{item.bill}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}