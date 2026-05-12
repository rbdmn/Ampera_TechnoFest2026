"use client"

import { useState, useEffect, useRef } from "react"
import { 
  AlertCircle, 
  Download, 
  Check, 
  Eye, 
  Mail,
  ChevronDown,
  AlertTriangle,
  Activity,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Dummy data sesuai dengan desain
const alertData = [
  {
    id: 1,
    status: "unread-critical",
    timestamp: "Oct 24, 14:32:01",
    room: "Room 402",
    type: "Limit Exceeded",
    message: "Peak demand threshold (15kW) exceeded for 3 consecutive hours. Immediate review required.",
  },
  {
    id: 2,
    status: "unread-warning",
    timestamp: "Oct 24, 11:15:45",
    room: "HVAC Unit B",
    type: "Usage Warning",
    message: "Unusual base load detected during unoccupied hours. Possible equipment malfunction.",
  },
  {
    id: 3,
    status: "read",
    timestamp: "Oct 23, 09:00:12",
    room: "Room 110",
    type: "Limit Exceeded",
    message: "Monthly billing threshold reached at 75% point of cycle.",
  },
  {
    id: 4,
    status: "read",
    timestamp: "Oct 22, 22:45:00",
    room: "Main Server Rm",
    type: "Anomaly",
    message: "Sudden 40% drop in consumption pattern observed.",
  },
  {
    id: 5,
    status: "read",
    timestamp: "Oct 21, 16:20:11",
    room: "Room 305",
    type: "Usage Warning",
    message: "Sustained high usage nearing tier 2 billing rates.",
  },
]

export default function AlertHistoryPage() {
  const [selectedDateRange, setSelectedDateRange] = useState("Last 7 Days")
  const [selectedType, setSelectedType] = useState("All Types")
  const [roomFilter, setRoomFilter] = useState("")
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [isTypeOpen, setIsTypeOpen] = useState(false)

  const dateRangeRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
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

  const dateRangeOptions = ["Last 7 Days", "Last 30 Days", "Last 3 Months", "All Time"]
  const typeOptions = ["All Types", "Limit Exceeded", "Usage Warning", "Anomaly"]

  // Filter logic
  const getFilteredData = () => {
    let data = [...alertData]

    // Room filter
    if (roomFilter) {
      data = data.filter(alert => 
        alert.room.toLowerCase().includes(roomFilter.toLowerCase())
      )
    }

    // Type filter
    if (selectedType !== "All Types") {
      data = data.filter(alert => alert.type === selectedType)
    }

    // Date range filter (simplified - in real app would use actual date filtering)
    if (selectedDateRange !== "All Time") {
      // For demo purposes, we'll filter based on the timestamp format
      const now = new Date()
      let daysBack = 0

      switch (selectedDateRange) {
        case "Last 7 Days":
          daysBack = 7
          break
        case "Last 30 Days":
          daysBack = 30
          break
        case "Last 3 Months":
          daysBack = 90
          break
      }

      if (daysBack > 0) {
        const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        data = data.filter(alert => {
          // Parse the timestamp (assuming format "Oct 24, 14:32:01")
          const alertDate = new Date(`2023-${alert.timestamp}`)
          return alertDate >= cutoffDate
        })
      }
    }

    return data
  }

  const filteredData = getFilteredData()
  const hasActiveFilters = roomFilter !== "" || selectedType !== "All Types" || selectedDateRange !== "Last 7 Days"

  const handleClearFilters = () => {
    setRoomFilter("")
    setSelectedType("All Types")
    setSelectedDateRange("Last 7 Days")
    setIsDateRangeOpen(false)
    setIsTypeOpen(false)
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
            <div className="font-bold text-lg leading-none">12</div>
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
                className={`text-slate-700 font-medium h-9 text-sm bg-white border-slate-300 ${selectedDateRange !== "Last 7 Days" ? "bg-blue-50 border-blue-300" : ""}`}
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              >
                <span className="text-slate-500 font-medium mr-2 text-xs uppercase tracking-wider">Date Range</span>
                <span className="font-medium text-slate-700">{selectedDateRange}</span>
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
              {isDateRangeOpen && (
                <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {dateRangeOptions.map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setSelectedDateRange(range)
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
                <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type)
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
                onChange={(e) => setRoomFilter(e.target.value)}
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
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Table Section */}
        <div className="overflow-x-auto">
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
              {filteredData.map((alert) => (
                <tr 
                  key={alert.id} 
                  className={`hover:bg-slate-50 transition-colors ${alert.status !== 'read' ? 'bg-white' : 'bg-slate-50/30'}`}
                >
                  {/* Status Indicator */}
                  <td className="px-6 py-4 flex justify-center items-center h-full">
                    {alert.status === 'unread-critical' && (
                      <div className="h-2.5 w-2.5 rounded-full bg-red-600 mt-1"></div>
                    )}
                    {alert.status === 'unread-warning' && (
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-600 mt-1"></div>
                    )}
                    {alert.status === 'read' && (
                      <Mail className="h-4 w-4 text-slate-300 mt-0.5" />
                    )}
                  </td>
                  
                  {/* Timestamp */}
                  <td className="px-6 py-4 font-mono text-xs text-slate-700 font-medium">
                    {alert.timestamp}
                  </td>
                  
                  {/* Room */}
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {alert.room}
                  </td>
                  
                  {/* Alert Type Badge */}
                  <td className="px-6 py-4">
                    {alert.type === 'Limit Exceeded' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600 border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        {alert.type}
                      </span>
                    )}
                    {alert.type === 'Usage Warning' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded bg-orange-50 text-orange-600 border border-orange-200">
                        <AlertCircle className="h-3 w-3" />
                        {alert.type}
                      </span>
                    )}
                    {alert.type === 'Anomaly' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-200">
                        <Activity className="h-3 w-3" />
                        {alert.type}
                      </span>
                    )}
                  </td>
                  
                  {/* Message */}
                  <td className="px-6 py-4 text-slate-600 text-xs leading-relaxed max-w-md">
                    {alert.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
          <div>Showing 1-{filteredData.length} of {filteredData.length} alerts</div>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 border rounded text-slate-400 hover:bg-slate-50" disabled>&lt;</button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white font-medium">1</button>
            <button className="px-3 py-1 border rounded hover:bg-slate-50 text-slate-600">2</button>
            <button className="px-3 py-1 border rounded hover:bg-slate-50 text-slate-600">3</button>
            <button className="px-2 py-1 border rounded hover:bg-slate-50 text-slate-600">&gt;</button>
          </div>
        </div>

      </Card>
    </div>
  )
}