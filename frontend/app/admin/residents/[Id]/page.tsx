"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { 
  Building2, 
  Zap, 
  Banknote, 
  Activity, 
  ArrowRight,
  Download,
  UserMinus,
  Edit2,
  TrendingUp,
  CheckCircle2,
  Clock
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

// Dummy data untuk grafik Hourly (24 jam)
const hourlyData = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i.toString().padStart(2, '0')}:00`,
  value: Math.floor(Math.random() * 5) + 1 + (i > 8 && i < 20 ? Math.random() * 10 : 0), // Simulasi lonjakan siang hari
  isPeak: i >= 10 && i <= 15
}))

// Dummy data untuk grafik Daily (30 hari)
const dailyData = Array.from({ length: 30 }).map((_, i) => ({
  date: `Oct ${i + 1}`,
  value: Math.floor(Math.random() * 40) + 20,
  isToday: i === 29
}))

// Dummy data untuk tabel Alert History
const alertHistory = [
  { id: 1, date: "2023-10-26 14:32", type: "Usage Spike Detected", severity: "WARNING", details: "Consumption exceeded 5kWh in a single hour.", status: "Resolved" },
  { id: 2, date: "2023-10-20 09:15", type: "Limit Threshold Reached (80%)", severity: "CRITICAL", details: "Monthly usage reached 360 kWh of 450 kWh limit.", status: "Pending Review" },
  { id: 3, date: "2023-10-05 22:00", type: "Unusual Nighttime Activity", severity: "INFO", details: "Sustained draw > 2kWh between 12AM and 5AM.", status: "Resolved" },
]

export default function RoomDetailPage() {
  const params = useParams()
  // Mengambil ID dari URL (misal: "101" dari /admin/residents/101)
  const roomId = params.id as string

  // State untuk edit limit
  const [isEditLimitOpen, setIsEditLimitOpen] = useState(false)
  const [monthlyLimit, setMonthlyLimit] = useState(450)
  const [newLimit, setNewLimit] = useState("450")

  // Update newLimit ketika modal dibuka
  useEffect(() => {
    if (isEditLimitOpen) {
      setNewLimit(monthlyLimit.toString())
    }
  }, [isEditLimitOpen, monthlyLimit])

  // Fungsi untuk handle edit limit
  const handleEditLimit = () => {
    const limitValue = parseFloat(newLimit)
    if (limitValue > 0) {
      setMonthlyLimit(limitValue)
      setIsEditLimitOpen(false)
    }
  }

  // Fungsi untuk reset form
  const handleCancelEdit = () => {
    setNewLimit(monthlyLimit.toString())
    setIsEditLimitOpen(false)
  }

  // Render badge severity
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 border border-orange-200"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{severity}</span>
      case 'CRITICAL':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>{severity}</span>
      case 'INFO':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{severity}</span>
      default:
        return null
    }
  }

  // Render status text with icon
  const renderStatus = (status: string) => {
    if (status === 'Resolved') {
      return <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><CheckCircle2 className="w-3.5 h-3.5" /> {status}</span>
    }
    return <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600"><Clock className="w-3.5 h-3.5" /> {status}</span>
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Floor 3 • Monthly Limit: {monthlyLimit} kWh</p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Room {roomId || "304"}</h1>
          <p className="flex items-center text-sm font-medium text-slate-600 mt-1.5">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            Design Studio X
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isEditLimitOpen} onOpenChange={setIsEditLimitOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white">
                <Edit2 className="w-3.5 h-3.5 mr-2" />
                Edit Limit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Monthly Limit</DialogTitle>
                <DialogDescription>
                  Set a new monthly energy consumption limit for this room. This will affect billing calculations and alerts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="limit" className="text-right">
                    Limit (kWh)
                  </Label>
                  <Input
                    id="limit"
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter limit in kWh"
                    min="1"
                    step="0.1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" onClick={handleEditLimit} className="bg-blue-700 hover:bg-blue-800">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 3 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Month Usage */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="bg-blue-50 p-1.5 rounded-full mr-2">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Month Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">342.5</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <p className="text-xs text-red-600 font-medium flex items-center mt-2">
              <TrendingUp className="h-3 w-3 mr-1" /> +12% <span className="text-slate-500 font-normal ml-1">vs last month</span>
            </p>
          </CardContent>
        </Card>

        {/* Estimated Cost */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="bg-orange-50 p-1.5 rounded-full mr-2">
              <Banknote className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-500">$</span>
              <span className="text-3xl font-bold text-slate-900">128.40</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center">
              <span className="w-3 h-3 rounded-full border border-slate-300 text-[8px] flex items-center justify-center mr-1 text-slate-400">i</span>
              Based on $0.37/kWh rate
            </p>
          </CardContent>
        </Card>

        {/* Monthly Limit Status */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <div className="bg-slate-100 p-1.5 rounded-full mr-2">
                <Activity className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Limit Status</CardTitle>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{monthlyLimit} MAX</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{Math.round((342.5 / monthlyLimit) * 100)}</span>
              <span className="text-sm font-medium text-slate-500">%</span>
            </div>
            
            {/* Custom Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 mb-1.5">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min((342.5 / monthlyLimit) * 100, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-500 text-right font-medium">{Math.max(0, monthlyLimit - 342.5).toFixed(1)} kWh remaining</p>
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
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} barSize={6}>
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPeak ? '#1d4ed8' : '#93c5fd'} />
                    ))}
                  </Bar>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(value) => value === '00:00' || value === '06:00' || value === '12:00' || value === '18:00' || value === '23:00' ? value : ''} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Chart */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-sm font-semibold">Daily Consumption</CardTitle>
            <span className="text-[11px] font-medium text-slate-400 uppercase">Last 30 Days</span>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barGap={0} barCategoryGap={0}>
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="value">
                    {dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isToday ? '#1d4ed8' : '#dbeafe'} />
                    ))}
                  </Bar>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(value) => value === 'Oct 1' || value === 'Oct 15' || value === 'Oct 30' ? (value === 'Oct 30' ? 'Today' : value) : ''} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert History Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-sm font-semibold">Alert History</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
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
              {alertHistory.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{alert.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{alert.type}</td>
                  <td className="px-6 py-4">{renderSeverityBadge(alert.severity)}</td>
                  <td className="px-6 py-4 text-xs text-slate-600 max-w-md truncate">{alert.details}</td>
                  <td className="px-6 py-4">{renderStatus(alert.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}