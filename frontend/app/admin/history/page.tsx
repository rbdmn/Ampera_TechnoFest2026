"use client"

import { 
  Zap, 
  BarChart2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  TrendingUp,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

// Dummy data untuk grafik (gabungan actual & estimated)
const chartData = [
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

export default function EnergyMonitoringPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consumption History</h1>
          <p className="text-sm text-slate-500">Analyze your detailed electricity usage patterns over time.</p>
        </div>
        
        {/* Actions Container */}
        <div className="flex items-center gap-3">
          {/* Daily/Monthly Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border text-sm font-medium">
            <button className="px-3 py-1 bg-white text-blue-700 shadow-sm rounded border border-slate-200">Daily</button>
            <button className="px-3 py-1 text-slate-500 hover:text-slate-700">Monthly</button>
          </div>

          {/* Date Filter */}
          <Button variant="outline" className="text-slate-600 font-medium h-9 text-sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>

          {/* Export Button */}
          <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 3 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Total Consumption */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Consumption</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">1,245</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">
                <TrendingUp className="h-3 w-3" />
                +4.2% vs last 30 days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Average Daily Use */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Daily Use</CardTitle>
            <BarChart2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">41.5</span>
              <span className="text-sm font-medium text-slate-500">kWh/day</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Typical range: 35-45 kWh</p>
          </CardContent>
        </Card>

        {/* Card 3: Peak Demand */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peak Demand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">6.2</span>
              <span className="text-sm font-medium text-slate-500">kW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Recorded on Oct 14, 6:00 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Chart Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">Last 30 Days Breakdown</CardTitle>
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
              <BarChart data={chartData} barGap={0} barCategoryGap={0}>
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                {/* Batang Biru Gelap (Data Asli) */}
                <Bar dataKey="actual" stackId="a" fill="#1d4ed8" />
                {/* Batang Biru Terang (Data Prediksi/Estimasi) */}
                <Bar dataKey="estimated" stackId="a" fill="#dbeafe" />
                
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickFormatter={(value) => {
                    // Hanya menampilkan label pada tanggal tertentu agar tidak penuh
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

      {/* Daily Log Table Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">Daily Log</CardTitle>
          <button className="text-xs font-semibold text-blue-600 hover:underline">
            View Full Log
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Consumption (kWh)</th>
                <th className="px-6 py-4 font-semibold">Peak Demand (kW)</th>
                <th className="px-6 py-4 font-semibold">Status / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Baris 1: High Peak */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">Oct 14, 2023</td>
                <td className="px-6 py-4 text-slate-900">42.5</td>
                <td className="px-6 py-4 text-red-600 font-medium">6.2</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-orange-100 text-orange-700">
                    High Peak Detected
                  </span>
                </td>
              </tr>
              {/* Baris 2: Normal */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">Oct 13, 2023</td>
                <td className="px-6 py-4 text-slate-900">38.1</td>
                <td className="px-6 py-4 text-slate-600">4.1</td>
                <td className="px-6 py-4 text-slate-500 text-xs">Normal</td>
              </tr>
              {/* Baris 3: Normal */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">Oct 12, 2023</td>
                <td className="px-6 py-4 text-slate-900">40.2</td>
                <td className="px-6 py-4 text-slate-600">4.5</td>
                <td className="px-6 py-4 text-slate-500 text-xs">Normal</td>
              </tr>
              {/* Baris 4: Normal */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">Oct 11, 2023</td>
                <td className="px-6 py-4 text-slate-900">39.8</td>
                <td className="px-6 py-4 text-slate-600">4.3</td>
                <td className="px-6 py-4 text-slate-500 text-xs">Normal</td>
              </tr>
              {/* Baris 5: Anomalous */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">Oct 10, 2023</td>
                <td className="px-6 py-4 text-slate-900 font-medium">68.0</td>
                <td className="px-6 py-4 text-slate-600">5.8</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-orange-100 text-orange-700">
                    Anomalous Usage
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}