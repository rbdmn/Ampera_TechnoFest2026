"use client"

import { useState, useEffect, useRef } from "react"
import { 
  AlertCircle, 
  Mail,
  ChevronDown,
  AlertTriangle,
  Activity,
  X,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

// --- INTERFACES ---
interface AlertItem {
  alert_id: string
  room_id: string
  alert_type: string
  message: string
  triggered_at: string
  is_read: boolean
}

interface AlertMeta {
  total_items: number
  unread_count: number
  current_page: number
}

// --- FORMATTERS ---
const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("en-US", { 
    month: "short", day: "2-digit", 
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false 
  }).replace(",", "")
}

const formatAlertType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export default function AlertHistoryPage() {
  // Data States
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [meta, setMeta] = useState<AlertMeta>({ total_items: 0, unread_count: 0, current_page: 1 })
  const [loading, setLoading] = useState(true)

  // Filter States
  const [selectedDateRange, setSelectedDateRange] = useState("Last 7 Days")
  const [selectedType, setSelectedType] = useState("All Types")
  const [roomFilter, setRoomFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Dropdown States
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const dateRangeRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)

  const dateRangeOptions = ["Last 7 Days", "Last 30 Days", "Last 3 Months", "All Time"]
  
  // 🚨 PERBAIKAN 1: Sesuaikan Opsi dengan API Backend
  const typeOptions = ["All Types", "Alert", "Insight", "System"]

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false)
      }
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setIsTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Data Function
  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", "10")

      // 1. Format Room Filter 
      if (roomFilter) {
        const formattedRoom = /^\d+$/.test(roomFilter) ? `R-${roomFilter}` : roomFilter
        params.append("room_id", formattedRoom)
      }

      // 2. Format Date Filter
      if (selectedDateRange !== "All Time") {
        const now = new Date()
        let daysBack = 0
        if (selectedDateRange === "Last 7 Days") daysBack = 7
        else if (selectedDateRange === "Last 30 Days") daysBack = 30
        else if (selectedDateRange === "Last 3 Months") daysBack = 90
        
        const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        params.append("start", cutoffDate.toISOString())
      }

      // 🚨 PERBAIKAN 2: Mapping Type yang benar sesuai API
      if (selectedType !== "All Types") {
        // Akan menghasilkan "alert", "insight", atau "system"
        params.append("type", selectedType.toLowerCase())
      }

      const res = await apiFetch(`/alerts/?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setAlerts(json.data || [])
        if (json.meta) setMeta(json.meta)
      }
    } catch (error) {
      console.error("Gagal mengambil alert:", error)
    } finally {
      setLoading(false)
    }
  }

  // Effect dengan Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts()
    }, 400) 
    return () => clearTimeout(timer)
  }, [roomFilter, selectedDateRange, selectedType, currentPage])

  const hasActiveFilters = roomFilter !== "" || selectedType !== "All Types" || selectedDateRange !== "Last 7 Days"

  const handleClearFilters = () => {
    setRoomFilter("")
    setSelectedType("All Types")
    setSelectedDateRange("Last 7 Days")
    setCurrentPage(1)
  }

  // Helper UI Renderers
  const renderAlertIcon = (type: string) => {
    if (type.includes("exceeded")) return <AlertTriangle className="h-3 w-3" />
    if (type.includes("warning")) return <AlertCircle className="h-3 w-3" />
    return <Activity className="h-3 w-3" />
  }

  const renderAlertBadgeClass = (type: string) => {
    if (type.includes("exceeded")) return "bg-red-50 text-red-600 border-red-200"
    if (type.includes("warning")) return "bg-orange-50 text-orange-600 border-orange-200"
    return "bg-blue-50 text-blue-600 border-blue-200"
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alert History</h1>
          <p className="text-sm text-slate-500">Monitor and manage system notifications across all monitored spaces.</p>
        </div>
        
        {/* Unread Alerts Badge */}
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <div className="font-bold text-lg leading-none">{meta.unread_count}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider">Unread Alerts</div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white">
        
        {/* Filter Bar */}
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b pb-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Date Range Filter */}
            <div className="relative" ref={dateRangeRef}>
              <Button 
                variant="outline" 
                className={`text-slate-700 font-medium h-9 text-sm bg-white border-slate-300 ${selectedDateRange !== "All Time" ? "bg-blue-50 border-blue-300" : ""}`}
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              >
                <span className="text-slate-500 font-medium mr-2 text-xs uppercase tracking-wider">Date Range</span>
                <span className="font-medium text-slate-700">{selectedDateRange}</span>
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
              {isDateRangeOpen && (
                <div className="absolute left-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {dateRangeOptions.map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setSelectedDateRange(range)
                        setCurrentPage(1)
                        setIsDateRangeOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${selectedDateRange === range ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter */}
            <div className="relative" ref={typeRef}>
              <Button 
                variant="outline" 
                className={`text-slate-700 font-medium h-9 text-sm bg-white border-slate-300 ${selectedType !== "All Types" ? "bg-blue-50 border-blue-300" : ""}`}
                onClick={() => setIsTypeOpen(!isTypeOpen)}
              >
                <span className="text-slate-500 font-medium mr-2 text-xs uppercase tracking-wider">Type</span>
                <span className="font-medium text-slate-700">{selectedType}</span>
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
              {isTypeOpen && (
                <div className="absolute left-0 sm:right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type)
                        setCurrentPage(1)
                        setIsTypeOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${selectedType === type ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Room Input */}
            <div className="flex items-center border rounded-md px-3 py-1.5 bg-white text-sm border-slate-300">
              <span className="text-slate-500 font-medium mr-2 text-xs uppercase tracking-wider">Room</span>
              <input 
                type="text" 
                placeholder="e.g. 402" 
                value={roomFilter}
                onChange={(e) => {
                  setRoomFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-20 outline-none text-slate-700 placeholder:text-slate-300 font-medium bg-transparent"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Table Section */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold w-12 text-center">Status</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Room</th>
                <th className="px-6 py-4 font-semibold">Alert Type</th>
                <th className="px-6 py-4 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Memuat data alerts...
                  </td>
                </tr>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr 
                    key={alert.alert_id} 
                    className={`hover:bg-slate-50 transition-colors ${!alert.is_read ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    {/* Status Indicator */}
                    <td className="px-6 py-4 flex justify-center items-center h-full">
                      {!alert.is_read ? (
                        <div className={`h-2.5 w-2.5 rounded-full mt-1 ${alert.alert_type.includes('exceeded') ? 'bg-red-600' : 'bg-orange-500'}`}></div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-slate-300 mt-0.5" />
                      )}
                    </td>
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-700 font-medium whitespace-nowrap">
                      {formatDateTime(alert.triggered_at)}
                    </td>
                    
                    {/* Room */}
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {alert.room_id}
                    </td>
                    
                    {/* Alert Type Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded border ${renderAlertBadgeClass(alert.alert_type)}`}>
                        {renderAlertIcon(alert.alert_type)}
                        {formatAlertType(alert.alert_type)}
                      </span>
                    </td>
                    
                    {/* Message */}
                    <td className="px-6 py-4 text-slate-600 text-xs leading-relaxed max-w-md">
                      {alert.message}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    Tidak ada alert yang ditemukan dengan filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
          <div>
            Showing {alerts.length > 0 ? ((currentPage - 1) * 10) + 1 : 0}-
            {Math.min(currentPage * 10, meta.total_items)} of {meta.total_items} alerts
          </div>
          <div className="flex items-center gap-1">
            <button 
              className="px-2 py-1.5 border rounded text-slate-600 hover:bg-slate-50 bg-white font-medium disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button className="px-3 py-1.5 border rounded bg-blue-600 text-white font-medium">{currentPage}</button>
            <button 
              className="px-2 py-1.5 border rounded text-slate-600 hover:bg-slate-50 bg-white font-medium disabled:opacity-50"
              disabled={currentPage * 10 >= meta.total_items}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

      </Card>
    </div>
  )
}