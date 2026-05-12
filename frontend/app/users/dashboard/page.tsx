"use client"

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
import { Button } from "@/components/ui/button"
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

// Dummy data for Hourly Chart
const hourlyData = [
  { time: "00:00", value: 20 },
  { time: "06:00", value: 55 },
  { time: "12:00", value: 85 },
  { time: "18:00", value: 110 },
  { time: "24:00", value: 45 },
]

// Dummy data for Donut Chart
const limitData = [
  { name: "Used", value: 72, fill: "#f59e0b" }, // Amber color
  { name: "Remaining", value: 28, fill: "#f1f5f9" } // Slate-100 color
]

export default function UserDashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, Resident</h1>
        <p className="text-sm text-slate-500 mt-1">Here is your energy consumption overview for this billing cycle.</p>
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
              <span className="text-3xl font-bold text-slate-900">342.5</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <p className="text-xs text-blue-600 font-medium flex items-center mt-2">
              <TrendingUp className="h-3 w-3 mr-1" /> +4% <span className="text-slate-500 font-normal ml-1">from last month</span>
            </p>
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
              <span className="text-3xl font-bold text-slate-900">Rp 512.4K</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Based on current usage rate
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
              <span className="text-3xl font-bold text-slate-900">12</span>
              <span className="text-sm font-medium text-slate-500">Days</span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Area Chart (Takes 2 columns) */}
        <Card className="md:col-span-2 bg-white shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-semibold">Hourly Consumption Today</CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                    data={limitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {limitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-900">72%</span>
                <span className="text-[10px] font-medium text-slate-500">of 500 kWh</span>
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
              <span className="font-semibold text-slate-900">485.2 <span className="text-[10px] text-slate-500 font-normal">kWh</span></span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Estimated Final Cost</span>
              <span className="font-semibold text-slate-900">Rp 720,500</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Projection indicates you will stay within your historical average. No immediate action required.
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
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 flex-1 flex flex-col">
            {/* Alert 1 */}
            <div className="border border-red-100 bg-red-50/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <h4 className="text-xs font-semibold text-slate-900">Unusual Spike Detected</h4>
              </div>
              <p className="text-[10px] text-slate-500 pl-5.5">Yesterday at 14:00, usage spiked by 40%.</p>
            </div>

            {/* Alert 2 */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-semibold text-slate-900">Bill Generated</h4>
              </div>
              <p className="text-[10px] text-slate-500 pl-5.5">Your previous month invoice is ready.</p>
            </div>

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