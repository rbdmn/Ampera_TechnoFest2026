"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  DoorClosed, 
  AlertTriangle, 
  AlertCircle,
  Download,
  Plus,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Search,
  X,
  Loader2
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { apiFetch } from "@/lib/api"

// --- Interfaces sesuai respons dari API backend ---
interface RoomTableData {
  room_id: string
  room_no: string
  floor: number
  resident_name: string | null
  monthly_kwh: number
  estimated_cost: number
  status: string // "Normal" | "Warning" | "Exceeded" | "Vacant"
}

interface RoomSummary {
  total_rooms: number
  vacant_units: number
  warnings_count: number
  critical_count: number
}

// Helper untuk format mata uang
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

export default function RoomManagementPage() {
  const router = useRouter()
  
  // States
  const [rooms, setRooms] = useState<RoomTableData[]>([])
  const [summary, setSummary] = useState<RoomSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFloor, setSelectedFloor] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isFloorOpen, setIsFloorOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)

  const floorRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  // Pagination states (Dari API meta)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (floorRef.current && !floorRef.current.contains(event.target as Node)) {
        setIsFloorOpen(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fungsi Fetch Data dari Backend
  const fetchRoomData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Summary Data
      const summaryRes = await apiFetch('/rooms/summary')
      if (summaryRes.ok) {
        setSummary(await summaryRes.json())
      }

      // 2. Fetch Table Data (dengan filter)
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", "10")
      
      if (searchTerm) params.append("search", searchTerm)
      if (selectedStatus !== "all") params.append("status", selectedStatus)
      if (selectedFloor !== "all") {
        // Ambil angkanya saja, misal "1st Floor" -> "1"
        const floorNum = selectedFloor.replace(/\D/g, '')
        params.append("floor", floorNum)
      }

      const tableRes = await apiFetch(`/rooms/table?${params.toString()}`)
      if (tableRes.ok) {
        const json = await tableRes.json()
        setRooms(json.data || [])
        if (json.meta) {
          setTotalItems(json.meta.total_items)
        }
      }
    } catch (error) {
      console.error("Gagal mengambil data kamar:", error)
    } finally {
      setLoading(false)
    }
  }

  // Trigger fetch saat filter berubah (menggunakan debounce khusus untuk pencarian agar tidak spam API)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoomData()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedFloor, selectedStatus, currentPage])

  const floorOptions = ["all", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"]
  const statusOptions = ["all", "Normal", "Warning", "Vacant", "Exceeded"]

  const hasActiveFilters = searchTerm !== "" || selectedFloor !== "all" || selectedStatus !== "all"

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedFloor("all")
    setSelectedStatus("all")
    setCurrentPage(1)
    setIsFloorOpen(false)
    setIsStatusOpen(false)
  }

  // Submit Handler untuk Add New Room
  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    // Sesuai payload endpoint POST /rooms/
    const payload = {
      room_no: formData.get("room_no"),
      floor: parseInt(formData.get("floor") as string),
      max_occupants: parseInt(formData.get("max_occupants") as string),
      monthly_limit_kwh: parseFloat(formData.get("monthly_limit_kwh") as string),
      tariff_per_kwh: parseFloat(formData.get("tariff_per_kwh") as string)
    }

    try {
      const res = await apiFetch("/rooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Gagal menambahkan kamar")
      }

      alert("Kamar berhasil ditambahkan!")
      setIsDialogOpen(false)
      fetchRoomData() // Refresh tabel dan summary
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render badge status dengan warna dinamis
  const renderStatusBadge = (status: string) => {
    const cleanStatus = (status || "").toLowerCase()
    switch (cleanStatus) {
      case 'normal':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Normal</span>
      case 'warning':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-orange-50 text-orange-600 border border-orange-100">Warning</span>
      case 'vacant':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">Vacant</span>
      case 'exceeded':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600 border border-red-100">Exceeded</span>
      default:
        return <span className="capitalize">{status}</span>
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
          <p className="text-sm text-slate-500">Monitor energy usage and occupancy status across all units.</p>
        </div>
        
        {/* Actions Container */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          {/* Dialog Add New Room */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add New Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleAddRoom}>
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                  <DialogDescription>
                    Enter the room details below. Fields marked as (Legacy) are optional.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                {/* Row 1: Room No & Floor */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="room_no" className="text-xs font-semibold text-slate-700">Room No <span className="text-red-500">*</span></Label>
                    <Input id="room_no" name="room_no" placeholder="e.g. 101" required className="h-9" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="floor" className="text-xs font-semibold text-slate-700">Floor <span className="text-red-500">*</span></Label>
                    <Input id="floor" name="floor" type="number" placeholder="e.g. 1" required className="h-9" />
                  </div>
                </div>

                {/* Row 2: Limit & Tariff */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthly_limit_kwh" className="text-xs font-semibold text-slate-700">Limit (kWh) <span className="text-red-500">*</span></Label>
                    <Input id="monthly_limit_kwh" name="monthly_limit_kwh" type="number" step="0.1" defaultValue="500" required className="h-9" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tariff_per_kwh" className="text-xs font-semibold text-slate-700">Tariff (IDR) <span className="text-red-500">*</span></Label>
                    <Input id="tariff_per_kwh" name="tariff_per_kwh" type="number" step="0.1" defaultValue="1444.7" required className="h-9" />
                  </div>
                </div>

                {/* Row 3: Max Occupants */}
                <div className="grid grid-cols-1">
                  <div className="grid gap-2">
                    <Label htmlFor="max_occupants" className="text-xs font-semibold text-slate-700">Max Occupants <span className="text-red-500">*</span></Label>
                    <Input id="max_occupants" name="max_occupants" type="number" defaultValue="2" required className="h-9" />
                  </div>
                </div>
              </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" className="h-9" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white h-9">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Room
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* 4 Top Metric Cards (Dynamic dari API) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rooms</p>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {summary ? summary.total_rooms : "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vacant Units</p>
            <DoorClosed className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {summary ? summary.vacant_units : "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Warnings (Energy)</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {summary ? summary.warnings_count : "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical (Exceeded)</p>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {summary ? summary.critical_count : "..."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="bg-white">
        
        {/* Table Toolbar / Filters */}
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b pb-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Floor Filter */}
            <div className="relative" ref={floorRef}>
              <Button 
                variant="outline" 
                className={`text-slate-700 font-medium h-9 text-sm bg-white ${selectedFloor !== "all" ? "bg-blue-50 border-blue-300" : ""}`}
                onClick={() => setIsFloorOpen(!isFloorOpen)}
              >
                {selectedFloor === "all" ? "All Floors" : selectedFloor}
                <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
              </Button>
              {isFloorOpen && (
                  <div className="absolute left-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {floorOptions.map((floor) => (
                      <button
                      key={floor}
                      onClick={() => {
                        setSelectedFloor(floor)
                        setCurrentPage(1)
                        setIsFloorOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${selectedFloor === floor ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {floor === "all" ? "All Floors" : floor}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Status Filter */}
            <div className="relative" ref={statusRef}>
              <Button 
                variant="outline" 
                className={`text-slate-700 font-medium h-9 text-sm bg-white ${selectedStatus !== "all" ? "bg-blue-50 border-blue-300" : ""}`}
                onClick={() => setIsStatusOpen(!isStatusOpen)}
              >
                {selectedStatus === "all" ? "All Statuses" : selectedStatus}
                <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
              </Button>
              {isStatusOpen && (
                <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status)
                        setCurrentPage(1)
                        setIsStatusOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${selectedStatus === status ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {status === "all" ? "All Statuses" : status}
                    </button>
                  ))}
                </div>
              )}
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

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Room ID or Tenant..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-400"
            />
          </div>
        </CardHeader>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Room No</th>
                <th className="px-6 py-4 font-semibold">Floor</th>
                <th className="px-6 py-4 font-semibold">Resident Name</th>
                <th className="px-6 py-4 font-semibold text-right">Monthly kWh</th>
                <th className="px-6 py-4 font-semibold text-right">Estimated Cost</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Memuat data kamar...
                  </td>
                </tr>
              ) : rooms.length > 0 ? (
                rooms.map((room) => (
                  <tr 
                    key={room.room_id} 
                    onClick={() => router.push(`/admin/residents/${room.room_id}`)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className={`px-6 py-4 font-bold ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                      {room.room_no}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{room.floor}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{room.resident_name || "-"}</td>
                    <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                      {room.monthly_kwh?.toFixed(1) || 0}
                    </td>
                    <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-600'}`}>
                      {formatIDR(room.estimated_cost || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {renderStatusBadge(room.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Tidak ada data kamar yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
          <div>Showing {rooms.length > 0 ? ((currentPage - 1) * 10) + 1 : 0} to {Math.min(currentPage * 10, totalItems)} of {totalItems} entries</div>
          <div className="flex items-center gap-1">
            <button 
              className="px-3 py-1.5 border rounded text-slate-600 hover:bg-slate-50 bg-white font-medium disabled:opacity-50" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button className="px-3 py-1.5 border rounded bg-blue-600 text-white font-medium">{currentPage}</button>
            <button 
              className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium disabled:opacity-50"
              disabled={currentPage * 10 >= totalItems}
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