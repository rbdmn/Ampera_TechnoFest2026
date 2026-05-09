"use client"

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
  MoreHorizontal
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
          <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add New Room
          </Button>
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
            <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
              All Floors
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
            </Button>
            
            {/* Status Filter */}
            <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
              All Statuses
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter residents..." 
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
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomsData.map((room) => (
                <tr 
                  key={room.id} 
                  onClick={() => router.push(`/admin/residents/${room.id}`)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  {/* Room No (Teks Merah jika Exceeded) */}
                  <td className={`px-6 py-4 font-bold ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                    {room.id}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{room.floor}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{room.resident}</td>
                  
                  {/* kWh (Teks Merah jika Exceeded) */}
                  <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-900'}`}>
                    {room.kwh}
                  </td>
                  
                  {/* Cost (Teks Merah jika Exceeded) */}
                  <td className={`px-6 py-4 font-medium text-right ${room.status === 'Exceeded' ? 'text-red-600' : 'text-slate-600'}`}>
                    {room.cost}
                  </td>
                  
                  <td className="px-6 py-4 text-center">
                    {renderStatusBadge(room.status)}
                  </td>
                  
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation() /* Mencegah baris terklik saat klik icon aksi */}>
                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-5 w-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
          <div>Showing 1 to 5 of 142 entries</div>
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