"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { 
  Download, 
  FileText, 
  ChevronDown, 
  Filter, 
  ChevronRight,
  Search,
  Eye,
  Check,
  X,
  Clock,
  Image,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

interface Invoice {
  invoice_id: string
  room_no: string
  period: string
  kwh_used: number
  rate: number
  total_amount: number
  status: string // 'paid', 'unpaid', 'pending'
  payment_proof_url?: string | null
  updated_at?: string
}

// Fungsi format Rupiah
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

// Helper: Generate 6 bulan terakhir dengan format YYYY-MM
const generateMonthOptions = () => {
  const options = []
  const d = new Date()
  for (let i = 0; i < 6; i++) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    options.push({ value: `${year}-${month}`, label })
    d.setMonth(d.getMonth() - 1)
  }
  return options
}

export default function BillingPage() {
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  
  // STATE MANAGEMENT
  const [selectedPeriod, setSelectedPeriod] = useState(monthOptions[0].value) // Default bulan ini
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // FILTER STATE
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"none" | "kwh_used" | "amount">("none")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "unpaid">("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isMonthOpen, setIsMonthOpen] = useState(false)

  // MODAL STATE
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [paymentAction, setPaymentAction] = useState<"approve" | "reject" | null>(null)

  // FETCH DATA
  const fetchBillingData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/billing/invoices?period=${selectedPeriod}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.detail || "Gagal memuat data tagihan")
      }
      const data = await res.json()

      // TAMBAHKAN INI UNTUK MENGINTIP DATA ASLI DARI BACKEND
      console.log("DATA DARI BACKEND:", data) 
      
      // Jika backend mengirim dalam format { data: [...] }
      const invoiceList = data.data || data || []
      setInvoices(invoiceList)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData()
  }, [selectedPeriod])

  // LOGIC: Filter dan Sort Data
  const getFilteredAndSortedData = () => {
    let data = [...invoices]

    if (searchTerm) {
      data = data.filter(item => 
        (item.room_no || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== "all") {
      data = data.filter(item => (item.status || "").toLowerCase() === filterStatus)
    }

    if (sortBy === "kwh_used") {
      data.sort((a, b) => (b.kwh_used || 0) - (a.kwh_used || 0))
    } else if (sortBy === "amount") {
      data.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0))
    }

    return data
  }

  const filteredData = getFilteredAndSortedData()
  
  // LOGIC: Kalkulasi Widget Summary Berdasarkan Data API
  const monthlyUsage = invoices.reduce((sum, item) => sum + (item.kwh_used || 0), 0)
  const monthlyRevenue = invoices.reduce((sum, item) => sum + (item.total_amount || 0), 0)
  const collectedRevenue = invoices.filter(i => i.status.toLowerCase() === 'paid').reduce((sum, item) => sum + (item.total_amount || 0), 0)
  
  const countPaid = invoices.filter(i => i.status.toLowerCase() === 'paid').length
  const countPending = invoices.filter(i => i.status.toLowerCase() === 'pending').length
  const countUnpaid = invoices.filter(i => i.status.toLowerCase() === 'unpaid').length
  const totalInvoices = invoices.length || 1 // Avoid division by zero
  
  const percentPaid = Math.round((countPaid / totalInvoices) * 100)
  const percentPending = Math.round((countPending / totalInvoices) * 100)
  const percentUnpaid = Math.round((countUnpaid / totalInvoices) * 100)

  const hasActiveFilters = searchTerm !== "" || sortBy !== "none" || filterStatus !== "all"

  // HANDLER: Modal Action
  const handleViewProof = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPreviewModal(true)
    setPaymentAction(null)
  }

  // API Call untuk Approve/Reject (PATCH /billing/invoices/{id}/status)
  const updateInvoiceStatus = async (status: "paid" | "unpaid") => {
    if (!selectedInvoice) return
    setPaymentAction(status === "paid" ? "approve" : "reject")
    
    try {
      const res = await apiFetch(`/billing/invoices/${selectedInvoice.invoice_id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: status })
      })

      if (!res.ok) throw new Error("Gagal mengupdate status")
      
      alert(`Payment ${status === "paid" ? "approved" : "rejected"} for Room ${selectedInvoice.room_no}`)
      setShowPreviewModal(false)
      fetchBillingData() // Refresh data setelah update sukses
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan")
    } finally {
      setPaymentAction(null)
    }
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSortBy("none")
    setFilterStatus("all")
    setIsFilterOpen(false)
  }

  const selectedMonthLabel = monthOptions.find(m => m.value === selectedPeriod)?.label || selectedPeriod

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Reports</h1>
          <p className="text-sm text-slate-500">Manage monthly energy invoicing and payment status.</p>
        </div>
        
        {/* Actions Container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="relative">
            <Button 
              variant="outline" 
              className="text-slate-700 font-medium h-9 text-sm bg-white min-w-[140px] justify-between"
              onClick={() => setIsMonthOpen(!isMonthOpen)}
            >
              <span className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                {selectedMonthLabel}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
            </Button>
            {isMonthOpen && (
              <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {monthOptions.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => {
                      setSelectedPeriod(month.value)
                      setIsMonthOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${selectedPeriod === month.value ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
            <FileText className="mr-2 h-4 w-4" />
            Generate Monthly Report
          </Button>
        </div>
      </div>

      {/* Top Summary Card */}
      <Card className="bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-6">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Building Usage ({selectedMonthLabel})</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{loading ? "..." : monthlyUsage.toLocaleString("en-US", {maximumFractionDigits: 1})}</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Revenue</p>
            <div className="text-3xl font-bold text-blue-700">{loading ? "..." : formatIDR(monthlyRevenue)}</div>
          </div>
        </div>
      </Card>

      {/* Main Table and Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Invoices Table */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-base font-semibold">Room Invoices</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button 
                    variant="outline" size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`text-sm ${hasActiveFilters ? "bg-blue-50 border-blue-300" : ""}`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {hasActiveFilters && (
                      <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                        {(searchTerm ? 1 : 0) + (sortBy !== "none" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0)}
                      </span>
                    )}
                  </Button>

                  {/* Filter Dropdown */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-10 p-4 space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Search</h4>
                        <Search className="pointer-events-none absolute left-3 top-10 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search room id..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Sort Options */}
                      <div className="border-t pt-4">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Sort By</h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="sort" checked={sortBy === "none"} onChange={() => setSortBy("none")} className="w-4 h-4" />
                            <span className="text-sm text-slate-700">Default</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="sort" checked={sortBy === "kwh_used"} onChange={() => setSortBy("kwh_used")} className="w-4 h-4" />
                            <span className="text-sm text-slate-700">kWh Tertinggi</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="sort" checked={sortBy === "amount"} onChange={() => setSortBy("amount")} className="w-4 h-4" />
                            <span className="text-sm text-slate-700">Total Amount Tertinggi</span>
                          </label>
                        </div>
                      </div>

                      {/* Status Filter */}
                      <div className="border-t pt-4">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Filter Status</h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="status" checked={filterStatus === "all"} onChange={() => setFilterStatus("all")} className="w-4 h-4"/>
                            <span className="text-sm text-slate-700">All Status</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="status" checked={filterStatus === "paid"} onChange={() => setFilterStatus("paid")} className="w-4 h-4"/>
                            <span className="text-sm text-emerald-700 font-medium">Paid</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="status" checked={filterStatus === "pending"} onChange={() => setFilterStatus("pending")} className="w-4 h-4"/>
                            <span className="text-sm text-amber-700 font-medium">Pending</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input type="radio" name="status" checked={filterStatus === "unpaid"} onChange={() => setFilterStatus("unpaid")} className="w-4 h-4"/>
                            <span className="text-sm text-red-700 font-medium">Unpaid</span>
                          </label>
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="border-t pt-4">
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleClearFilters}>
                            <X className="h-3 w-3 mr-1" />
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50/80 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Room ID</th>
                    <th className="px-6 py-4 font-semibold text-right">kWh Used</th>
                    <th className="px-6 py-4 font-semibold text-right">Rate (IDR)</th>
                    <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Payment Proof</th>
                    <th className="px-6 py-4 font-semibold text-center">Detail</th>
                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-500">Memuat data tagihan...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={8} className="text-center py-8 text-red-500">{error}</td></tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((invoice, index) => {
                      const statusClean = (invoice.status || "unpaid").toLowerCase()
                      return (
                        <tr key={invoice.invoice_id || index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{invoice.room_no}</td>
                          <td className="px-6 py-4 text-slate-700 font-medium text-right">{invoice.kwh_used?.toFixed(1) || "-"}</td>
                          <td className="px-6 py-4 text-slate-500 text-right">{invoice.rate?.toLocaleString() || "-"}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 text-right">{formatIDR(invoice.total_amount)}</td>
                          <td className="px-6 py-4 text-center">
                            {statusClean === 'paid' && (
                              <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-emerald-50 text-emerald-600 border border-emerald-100">Paid</span>
                            )}
                            {statusClean === 'unpaid' && (
                              <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-red-50 text-red-600 border border-red-100">Unpaid</span>
                            )}
                            {statusClean === 'pending' && (
                              <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-amber-50 text-amber-600 border border-amber-100">
                                <Clock className="h-3 w-3 mr-1" /> Pending
                              </span>
                            )}
                            {/* Tambahkan fallback kalau status tidak dikenal */}
                            {!['paid', 'unpaid', 'pending'].includes(statusClean) && (
                              <span className="text-xs text-slate-400 capitalize">{statusClean}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {invoice.payment_proof_url ? (
                              <button 
                                onClick={() => handleViewProof(invoice)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors inline-flex items-center gap-1"
                              >
                                <Image className="h-4 w-4" />
                                <span className="text-xs font-medium">View</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">No proof</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/admin/billing/${invoice.invoice_id}`}
                              className="inline-flex items-center justify-center rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              Details
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {statusClean === 'pending' && (
                                <button 
                                  onClick={() => handleViewProof(invoice)}
                                  className="text-amber-600 hover:text-amber-800 p-1.5 rounded bg-amber-50 transition-colors"
                                  title="Review Verification"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              {statusClean !== 'pending' && (
                                <button className="text-slate-300 p-1.5 rounded cursor-not-allowed" disabled>
                                  <FileText className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        <p className="font-medium">No invoices found</p>
                        <p className="text-xs">Data mungkin kosong atau tidak lolos filter</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Summary Widgets */}
        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Collection Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Custom Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${percentPaid}%` }}></div>
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${percentPending}%` }}></div>
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${percentUnpaid}%` }}></div>
              </div>
              
              <div className="flex justify-between text-xs font-semibold text-slate-900 mb-6">
                <span>{formatIDR(collectedRevenue)} Collected</span>
                <span>{percentPaid || 0}%</span>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-slate-700">Paid</span>
                  </div>
                  <span className="font-semibold text-slate-900">{countPaid} <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="font-medium text-slate-700">Pending Verify</span>
                  </div>
                  <span className="font-semibold text-slate-900">{countPending} <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="font-medium text-slate-700">Unpaid</span>
                  </div>
                  <span className="font-semibold text-slate-900">{countUnpaid} <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Proof Preview Modal */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-white shadow-xl">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">
                Verification - Room {selectedInvoice.room_no}
              </CardTitle>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">Room / Invoice ID</p>
                  <p className="font-bold text-slate-900">{selectedInvoice.room_no}</p>
                  <p className="text-xs text-slate-400">{selectedInvoice.invoice_id}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">kWh Used</p>
                  <p className="font-bold text-slate-900">{selectedInvoice.kwh_used?.toFixed(1) || "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Amount</p>
                  <p className="font-bold text-emerald-600 text-lg">{formatIDR(selectedInvoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">Current Status</p>
                  <p className="font-bold uppercase text-[10px]">
                    {selectedInvoice.status}
                  </p>
                </div>
              </div>

              {/* Payment Proof Image */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex flex-col items-center justify-center min-h-[300px]">
                {selectedInvoice.payment_proof_url ? (
                  // Idealnya menggunakan next/image jika domain terdaftar, atau img tag biasa:
                  <img 
                    src={selectedInvoice.payment_proof_url.startsWith('http') ? selectedInvoice.payment_proof_url : `http://localhost:8000${selectedInvoice.payment_proof_url}`} 
                    alt="Payment Proof" 
                    className="max-w-full max-h-[400px] object-contain"
                  />
                ) : (
                  <>
                    <Image className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-600 font-medium">No Payment Proof Uploaded</p>
                  </>
                )}
              </div>

              {/* Action Buttons - Only show for Pending status */}
              {(selectedInvoice.status || "").toLowerCase() === 'pending' && (
                <div className="space-y-3 border-t pt-6">
                  <p className="text-sm font-bold text-slate-700">Verification Action</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => updateInvoiceStatus("paid")}
                      disabled={paymentAction !== null}
                      className={`${
                        paymentAction === "approve"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      } text-white`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {paymentAction === "approve" ? "Approving..." : "Approve Payment"}
                    </Button>
                    <Button
                      onClick={() => updateInvoiceStatus("unpaid")}
                      disabled={paymentAction !== null}
                      className={`${
                        paymentAction === "reject"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white`}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {paymentAction === "reject" ? "Rejecting..." : "Reject (Mark Unpaid)"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}