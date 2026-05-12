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
  X
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
  DialogClose
} from "@/components/ui/dialog"

// Dummy data sesuai desain
const roomsData = [
  { id: "101", floor: "1st Floor", resident: "Alice Johnson", kwh: 245.5, cost: "$36.82", status: "Normal" },
  { id: "102", floor: "1st Floor", resident: "Robert Smith", kwh: 412.0, cost: "$61.88", status: "Warning" },
  { id: "205", floor: "2nd Floor", resident: "Unassigned", kwh: 5.2, cost: "$0.78", status: "Vacant" },
  { id: "310", floor: "3rd Floor", resident: "Elena Rodriguez", kwh: 890.4, cost: "$133.56", status: "Exceeded" },
  { id: "312", floor: "3rd Floor", resident: "David Chen", kwh: 180.1, cost: "$27.01", status: "Normal" },
]

export default function RoomManagementPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFloor, setSelectedFloor] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isFloorOpen, setIsFloorOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)

  const floorRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

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

  const floorOptions = ["all", "1st Floor", "2nd Floor", "3rd Floor"]
  const statusOptions = ["all", "Normal", "Warning", "Vacant", "Exceeded"]

  // Filter logic
  const getFilteredData = () => {
    let data = [...roomsData]

    // Search filter
    if (searchTerm) {
      data = data.filter(room => 
        room.resident.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Floor filter
    if (selectedFloor !== "all") {
      data = data.filter(room => room.floor === selectedFloor)
    }

    // Status filter
    if (selectedStatus !== "all") {
      data = data.filter(room => room.status === selectedStatus)
    }

    return data
  }

  const filteredData = getFilteredData()
  const hasActiveFilters = searchTerm !== "" || selectedFloor !== "all" || selectedStatus !== "all"

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedFloor("all")
    setSelectedStatus("all")
    setIsFloorOpen(false)
    setIsStatusOpen(false)
  }

  // Fungsi untuk render badge status dengan warna dinamis
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Normal</span>
      case 'Warning':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-orange-50 text-orange-600 border border-orange-100">Warning</span>
      case 'Vacant':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">Vacant</span>
      case 'Exceeded':
        return <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600 border border-red-100">Exceeded</span>
      default:
        return <span>{status}</span>
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

          {/* Dialog / Popup Add New Room */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add New Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
                <DialogDescription>
                  Enter the room details below. Fields marked as (Legacy) are optional.
                </DialogDescription>
              </DialogHeader>
              
              {/* Form Fields menyesuaikan DB Schema */}
              <div className="grid gap-4 py-4">
                
                {/* Baris 1: Room ID & Floor */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="room_id" className="text-xs font-semibold text-slate-700">Room ID <span className="text-red-500">*</span></Label>
                    <Input id="room_id" placeholder="e.g. 101" className="h-9" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="floor" className="text-xs font-semibold text-slate-700">Floor <span className="text-red-500">*</span></Label>
                    <Input id="floor" type="number" placeholder="e.g. 1" className="h-9" />
                  </div>
                </div>

                {/* Baris 2: Tenant Name & Email (Nullable) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tenant_name" className="text-xs font-semibold text-slate-700">Tenant Name <span className="text-slate-400 font-normal">(Optional)</span></Label>
                    <Input id="tenant_name" placeholder="e.g. Jane Doe" className="h-9" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tenant_email" className="text-xs font-semibold text-slate-700">Tenant Email <span className="text-slate-400 font-normal">(Optional)</span></Label>
                    <Input id="tenant_email" type="email" placeholder="jane@example.com" className="h-9" />
                  </div>
                </div>

                {/* Baris 3: Limits & Tariffs (Float) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthly_limit_kwh" className="text-xs font-semibold text-slate-700">Monthly Limit (kWh) <span className="text-red-500">*</span></Label>
                    <Input id="monthly_limit_kwh" type="number" step="0.01" placeholder="e.g. 450" className="h-9" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tariff_per_kwh" className="text-xs font-semibold text-slate-700">Tariff / kWh (IDR) <span className="text-red-500">*</span></Label>
                    <Input id="tariff_per_kwh" type="number" step="0.01" placeholder="e.g. 1500" className="h-9" />
                  </div>
                </div>

                {/* Baris 4: Max Occupants */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_occupants" className="text-xs font-semibold text-slate-700">Max Occupants <span className="text-red-500">*</span></Label>
                    <Input id="max_occupants" type="number" placeholder="e.g. 2" className="h-9" />
                  </div>
                </div>

              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="h-9">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white h-9">Save Room</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rooms</p>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">142</div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vacant Units</p>
            <DoorClosed className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">12</div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Warnings (Energy)</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">8</div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical (Exceeded)</p>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mt-1">3</div>
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
              placeholder="Search residents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-400"
            />
          </div>
        </CardHeader>

        {/* Data Table */}
        <div className="overflow-x-auto">
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
              {filteredData.map((room) => (
                <tr 
                  key={room.id} 
                  onClick={() => router.push(`/admin/residents/${room.id}`)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className={`px-6 py-4 font-bold ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                    {room.id}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{room.floor}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{room.resident}</td>
                  <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                    {room.kwh}
                  </td>
                  <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-600'}`}>
                    {room.cost}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {renderStatusBadge(room.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
          <div>Showing 1 to {filteredData.length} of {filteredData.length} entries</div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 border rounded text-slate-400 hover:bg-slate-50 bg-white font-medium" disabled>Prev</button>
            <button className="px-3 py-1.5 border rounded bg-blue-600 text-white font-medium">1</button>
            <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">2</button>
            <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">3</button>
            <span className="px-2">...</span>
            <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">Next</button>
          </div>
        </div>

      </Card>
    </div>
  )
}