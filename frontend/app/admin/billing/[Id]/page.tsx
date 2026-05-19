"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, Hash, Zap, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomDetail {
  room_id: string
  room_no: string
  floor: number
  monthly_kwh: number
  estimated_cost: number
  status: string
  resident_name: string
  monthly_limit_kwh?: number
  rate_per_kwh?: number
}

interface Invoice {
  invoice_id: string
  room_id?: string
  room_no?: string
  billing_period?: string // Ganti dari period
  due_date?: string
  status: string 
  payment_proof_url?: string | null
  proof_date?: string | null
  total_amount?: number
  // Tambahkan 3 objek bersarang ini:
  tenant?: { name: string; email: string }
  usage?: { kwh_used: number; rate_per_kwh: number; meter_reading?: any }
  recommendation?: { estimated_savings: number | string; note: string }
}

interface PageData {
  room: RoomDetail
  invoice: Invoice | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("Rp", "Rp ")

/** Normalize invoice status to title-case for display */
const normalizeStatus = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

/** Current billing period in YYYY-MM format */
const currentPeriod = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchRoomDetail(roomId: string): Promise<RoomDetail> {
  // Ganti fetch standar menjadi apiFetch
  const res = await apiFetch(`/rooms/${roomId}/detail`)
  if (!res.ok) throw new Error(`Room not found: ${res.status}`)
  return res.json()
}

/**
 * Finds an invoice for the given room_id in the current (or a given) period.
 * Falls back to the list endpoint since there's no direct "invoice by room" endpoint.
 */
async function fetchInvoiceForRoom(
  roomId: string,
  period: string
): Promise<Invoice | null> {
  // Ganti fetch standar menjadi apiFetch
  const url = `/billing/invoices?period=${period}&limit=100`
  const res = await apiFetch(url)
  if (!res.ok) return null

  const json = await res.json()
  // The list endpoint returns { data: Invoice[], meta: {...} }
  const list: Invoice[] = Array.isArray(json) ? json : json.data ?? []
  const match = list.find((inv) => inv.room_id === roomId)
  if (!match) return null

  // Fetch full detail for proof_file, notes, etc.
  const detailRes = await apiFetch(`/billing/invoices/${match.invoice_id}`)
  if (!detailRes.ok) return match
  return detailRes.json()
}

// ─── Status Styles ────────────────────────────────────────────────────────────

function statusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-100"
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-100"
    case "unpaid":
      return "bg-red-50 text-red-700 border-red-100"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

function statusDescription(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return "Tagihan sudah dibayar dan diperiksa."
    case "pending":
      return "Menunggu verifikasi bukti pembayaran."
    default:
      return "Belum ada pembayaran masuk."
  }
}

// ─── Loading / Error States ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Memuat data billing...</span>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-slate-500">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-red-600">{message}</p>
      <Link
        href="/admin/billing"
        className="mt-2 text-sm text-blue-600 underline underline-offset-2"
      >
        Kembali ke Billing
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────


export default function RoomBillingDetailsPage() {
  const params = useParams()
  const invoiceId = params.id as string
  const period = currentPeriod()

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
  let cancelled = false

  async function load() {
    try {
      setLoading(true)
      setError(null)

      // 1. fetch invoice detail
      const invoiceRes = await apiFetch(`/billing/invoices/${invoiceId}`)

      if (!invoiceRes.ok) {
        throw new Error("Invoice not found")
      }

      // Handle jika dibungkus { data: { ... } }
      const rawJson = await invoiceRes.json()

      // CEK DULU DI SINI SEBELUM MASUK KE STATE
      console.log("CIEE KETAHUAN DATA DETAILNYA:", rawJson)
      const invoice: Invoice = rawJson.data || rawJson

      // 2. fetch room detail (Cegah undefined jika backend cuma kirim room_no)
      const targetRoomId = invoice.room_id || `R-${invoice.room_no}`
      
      const room = await fetchRoomDetail(targetRoomId)

      if (!cancelled) {
        setData({ room, invoice })
      }

    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  load()

  return () => {
    cancelled = true
  }
}, [invoiceId])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { room, invoice } = data

  // Derive display values — Tembus ke dalam objek bersarang (usage, tenant, recommendation)
  const displayKwh = invoice?.usage?.kwh_used ?? room.monthly_kwh ?? 0
  const displayRate = invoice?.usage?.rate_per_kwh ?? room.rate_per_kwh ?? 1500
  const displayTotal = invoice?.total_amount ?? room.estimated_cost ?? 0
  
  const displayStatus = invoice ? normalizeStatus(invoice.status) : "Unknown"
  
  // Ambil nama dari dalam objek tenant
  const displayTenant = invoice?.tenant?.name ?? room.resident_name ?? "Unknown Tenant"
  const displayPeriod = invoice?.billing_period ?? period
  const displayDueDate = invoice?.due_date ?? "-"
  
  const displayProofFile = invoice?.payment_proof_url ?? null
  const displayProofDate = invoice?.proof_date ?? null
  
  // Ambil notes dan savings dari dalam objek recommendation
  const displayNotes = invoice?.recommendation?.note ?? "Data catatan tidak tersedia untuk room ini."
  
  const displaySavings = invoice?.recommendation?.estimated_savings !== undefined 
    ? `Rp ${invoice.recommendation.estimated_savings}` 
    : "Rp 0"

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
      </div>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Room {room.room_no} Billing Details
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Lihat ringkasan tagihan, status pembayaran, bukti transfer, dan
          informasi penggunaan listrik untuk room ini.
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing Summary */}
        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Billing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tenant</p>
              <p className="font-semibold text-slate-900">{displayTenant}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Billing Period</p>
              <p>{displayPeriod}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
              <p>{displayDueDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <span
                className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold rounded border ${statusStyle(displayStatus)}`}
              >
                {displayStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage & Calculation */}
        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Usage & Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Room ID</p>
                <p className="font-semibold text-slate-900">{room.room_id}</p>
              </div>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">kWh Used</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {displayKwh.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Amount</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {formatIDR(displayTotal)}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rate per kWh</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatIDR(displayRate)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Estimated savings
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {displaySavings}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Note</p>
              <p className="mt-1 text-sm text-slate-700">{displayNotes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Detail Card */}
      <Card className="bg-white">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Detail Room Invoice
            </CardTitle>
            <p className="text-sm text-slate-500">
              Informasi pembayaran, bukti transfer, dan histori tagihan.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {displayPeriod}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              Room {room.room_no}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Status Pembayaran */}
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Status Pembayaran
              </p>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${statusStyle(displayStatus)}`}
              >
                {displayStatus}
              </div>
              <p className="text-sm text-slate-600">
                {statusDescription(displayStatus)}
              </p>
            </div>

            {/* Bukti Pembayaran */}
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Bukti Pembayaran
              </p>
              {displayProofFile ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">{displayProofFile}</p>
                  <p className="text-xs text-slate-500">
                    Dikirim:{" "}
                    {displayProofDate ?? "Menunggu terverifikasi"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Belum ada bukti pembayaran diunggah.
                </p>
              )}
            </div>

            {/* Invoice Actions */}
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Invoice Actions
              </p>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Verifikasi pembayaran
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Tinjau bukti transfer
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Simpan catatan audit
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Invoice Breakdown</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Room Number</p>
                <p className="mt-2 font-semibold text-slate-900">{room.room_id}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tenant</p>
                <p className="mt-2 font-semibold text-slate-900">{displayTenant}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Usage</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {displayKwh.toFixed(1)} kWh
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rate</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatIDR(displayRate)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700">
                  {formatIDR(displayTotal)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
                <p className="mt-2 font-semibold text-slate-900">{displayDueDate}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/admin/billing"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Kembali ke Invoice
            </Link>
            <Button className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white">
              Print Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}