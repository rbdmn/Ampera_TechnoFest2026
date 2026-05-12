"use client"

import Link from "next/link"
import { Zap, Banknote, Building2, AlertTriangle, AlertCircle, Info, Lightbulb, MoreHorizontal, Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

// Dummy data untuk grafik
const data = Array.from({ length: 30 }).map((_, i) => ({
  name: `Oct ${i + 1}`,
  total: Math.floor(Math.random() * 500) + 100,
}))

export default function AdminDashboardPage() {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total KWH This Month</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12,458.2</div>
            <p className="text-xs text-green-600 font-medium flex items-center mt-1">
              <span className="mr-1">↘</span> -4.2% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Bill (IDR)</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">18,245,000</div>
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
            <div className="text-2xl font-bold text-slate-900">42 / 50</div>
            <p className="text-xs text-slate-500 mt-1">84% occupancy rate</p>
          </CardContent>
        </Card>

        {/* Card 4 (Alert) */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Active AI Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
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
              <p className="text-xs text-slate-500">Building total across last 30 days</p>
            </div>
            <button className="text-xs border text-blue-600 border-blue-200 bg-blue-50 px-3 py-1 rounded-md font-medium">
              📅 Last 30 Days
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
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
            {/* Item 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-medium text-slate-900">
                <span>Room 304</span>
                <span className="text-red-600">92%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 w-[92%] rounded-full"></div>
              </div>
            </div>
            {/* Item 2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-medium text-slate-900">
                <span>Room 102</span>
                <span className="text-amber-600">78%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 w-[78%] rounded-full"></div>
              </div>
            </div>
            {/* Item 3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-medium text-slate-900">
                <span>Server Room B</span>
                <span className="text-orange-700">75%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-700 w-[75%] rounded-full"></div>
              </div>
            </div>
            {/* Item 4 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-medium text-slate-900">
                <span>Room 205</span>
                <span className="text-blue-600">45%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[45%] rounded-full"></div>
              </div>
            </div>

            {/* Update: Button diubah menjadi Link */}
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
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">Room 102</td>
                  <td className="px-6 py-3 text-slate-500">Tech Solutions</td>
                  <td className="px-6 py-3 text-amber-600 font-medium">710.8</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-orange-50 text-orange-600 border border-orange-200">Warning</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">Server Room A</td>
                  <td className="px-6 py-3 text-slate-500">Internal</td>
                  <td className="px-6 py-3 text-slate-900">1240.8</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Normal</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Latest AI Insights */}
        <Card className="bg-gradient-to-b from-blue-50/50 to-white">
          <CardHeader className="border-b border-blue-100/50 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Latest AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            
            {/* Insight 1 (Red) */}
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

            {/* Insight 2 (Orange) */}
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

            {/* Insight 3 (Blue) */}
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
          </CardContent>
        </Card>
      </div>

    </div>
  )
}