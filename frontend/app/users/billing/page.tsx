"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Download, 
  FileText, 
  CreditCard,
  Check,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  XCircle
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
  DialogClose
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { getEmail } from "@/lib/auth"

const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

interface Invoice {
  invoice_id: string
  room_id: string
  period: string
  kwh_used: number
  rate: number
  total_amount: number
  status: string
  generated_at: string | null
}

interface UserDashboardOverview {
  user: { user_id: string; email: string; role: string }
  room: { room_id: string }
  range: { start: string; end: string; interval: string }
  // `totals` may include derived billing values like `bill` in some responses
  totals: { kwh: number; bill?: number }
  // optional settings returned by the API (used for rate_per_kwh)
  settings?: { rate_per_kwh?: number }
  series: Array<{ ts: string; kwh: number }>
  latest_meter_reading: {
    reading_id: string; room_id: string; reading_value_kwh: number
    usage_delta_kwh: number; period_start: string; period_end: string
    source: string; verification_status: string
  } | null
}

const statusLabel: Record<string, string> = {
  generated: "Unpaid",
  sent: "Pending",
  paid: "Paid",
}

const statusIcon: Record<string, typeof CheckCircle2> = {
  generated: XCircle,
  sent: Hourglass,
  paid: CheckCircle2,
}

const statusStyle: Record<string, string> = {
  generated: "bg-red-50 text-red-600 border-red-200",
  sent: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
}

export default function UserBillingPage() {
  const [overview, setOverview] = useState<UserDashboardOverview | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Dipindahkan dari file 1 ---
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bsi">("qris")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [currentStatus, setCurrentStatus] = useState<"UNPAID" | "Pending Approval" | "PAID">("UNPAID")
  // ------------------------------

  const amountDue = useMemo(() => {
  if (!overview) return 0

  if (overview.totals?.bill) {
    return Math.round(overview.totals.bill)
  }

  const ratePerKwh = overview.settings?.rate_per_kwh ?? 0

  return Math.round((overview.totals?.kwh ?? 0) * ratePerKwh)
}, [overview])

  const usageKwh = overview?.totals.kwh ?? 0
  const billingPeriod = overview
    ? `${new Date(overview.range.start).toLocaleDateString()} - ${new Date(overview.range.end).toLocaleDateString()}`
    : ""
  const totalPaid = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total_amount, 0)
  }, [invoices])

  // --- Dipindahkan dari file 1 ---
  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setProofFile(file)
  }

  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!proofFile) {
      alert("Mohon unggah bukti pembayaran terlebih dahulu!")
      return
    }

    const invoiceId = overview?.latest_meter_reading?.reading_id
    if (!invoiceId) return

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append("payment_method", paymentMethod)
      formData.append("proof_file", proofFile)

      const res = await apiFetch(`/billing/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      })

      if (!res.ok) {
        throw new Error("Gagal mengirimkan bukti pembayaran ke server")
      }

      setCurrentStatus("Pending Approval")
      setShowPayDialog(false)
      alert("Bukti pembayaran berhasil diajukan! Menunggu verifikasi admin.")

    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }
  // ------------------------------

  useEffect(() => {
    const email = getEmail()
    if (!email) {
      setError("User email tidak ditemukan. Silakan login kembali.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [overviewRes, invoicesRes] = await Promise.all([
          apiFetch(`/dashboard/user/overview?email=${encodeURIComponent(email)}`),
          apiFetch("/billing/my-invoices"),
        ])

        if (!overviewRes.ok) {
          const data = await overviewRes.json().catch(() => null)
          throw new Error(data?.detail || "Gagal memuat data tagihan")
        }

        const overviewData: UserDashboardOverview = await overviewRes.json()
        setOverview(overviewData)

        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json()
          setInvoices(invoicesData.data ?? [])
        }
      } catch (err: any) {
        setError(err?.message || "Terjadi kesalahan saat memuat data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-600">
        Loading billing data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
          <p className="text-sm text-slate-500">View your energy consumption bills and payment history.</p>
        </div>
        <div className="text-sm text-slate-500">
          Total Paid: <span className="font-bold text-emerald-600">{formatIDR(totalPaid)}</span>
        </div>
      </div>

      {/* Current Invoice Card */}
      <Card className="bg-white border-blue-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Current Invoice
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Billing Period: {billingPeriod}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 border rounded-xl gap-6">
            <div className="space-y-1 w-full">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Amount</p>
              <div className="text-4xl font-bold text-slate-900">{formatIDR(amountDue)}</div>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Based on <span className="font-bold text-slate-700">{usageKwh.toFixed(1)} kWh</span> usage
              </p>
            </div>
            {/* --- Dipindahkan dari file 1: tombol PDF + Pay Now --- */}
            <div className="flex items-center gap-3">
              <Button variant="outline" className="text-slate-700 bg-white" asChild>
                <a href="#" download className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  PDF
                </a>
              </Button>
              <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Bayar Invoice</DialogTitle>
                    <DialogDescription>
                      Lengkapi data pembayaran untuk mengajukan bukti. Status akan berubah menjadi Pending Approval.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-6" onSubmit={handleSubmitPayment}>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="paymentAmount">Jumlah yang harus dibayar</Label>
                        <Input id="paymentAmount" value={formatIDR(amountDue)} disabled />
                      </div>

                      <div className="grid gap-2">
                        <Label>Metode Pembayaran</Label>
                        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("qris")}
                            className={`w-full rounded-lg border px-4 py-3 text-left transition ${paymentMethod === "qris" ? "border-blue-600 bg-white" : "border-transparent bg-slate-100 hover:bg-slate-200"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">QRIS</p>
                                <p className="text-sm text-slate-500">Scan QR code untuk membayar</p>
                              </div>
                              {paymentMethod === "qris" && <Check className="h-4 w-4 text-blue-600" />}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("bsi")}
                            className={`w-full rounded-lg border px-4 py-3 text-left transition ${paymentMethod === "bsi" ? "border-blue-600 bg-white" : "border-transparent bg-slate-100 hover:bg-slate-200"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">BSI</p>
                                <p className="text-sm text-slate-500">Transfer ke nomor rekening BSI</p>
                              </div>
                              {paymentMethod === "bsi" && <Check className="h-4 w-4 text-blue-600" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Bukti Pembayaran</Label>
                        <input
                          id="paymentProof"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleProofChange}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        />
                        {proofFile && (
                          <p className="text-sm text-slate-500">Selected file: {proofFile.name}</p>
                        )}
                      </div>

                      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {paymentMethod === "qris" ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-900">QRIS Payment</p>
                            <p className="text-sm text-slate-500">Scan the QR code with your banking app and upload the receipt.</p>
                            <div className="mt-3 h-[180px] rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                              QR code preview
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-slate-900">BSI Account</p>
                            <p className="text-sm text-slate-500">Gunakan nomor rekening berikut untuk mentransfer:</p>
                            <div className="mt-3 rounded-xl bg-white p-4 border border-slate-200">
                              <p className="text-sm text-slate-500">Bank Syariah Indonesia (BSI)</p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">123-456-7890</p>
                              <p className="text-sm text-slate-500 mt-1">A.n. PT Ampera TechnoFest</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <DialogClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto">Batal</Button>
                      </DialogClose>
                      <Button type="submit" className="w-full sm:w-auto bg-blue-700 text-white hover:bg-blue-800">
                        Submit Bukti
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {/* ---------------------------------------------------- */}
          </div>
        </CardContent>
      </Card>

      {/* Billing History Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold">Billing History</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice No</th>
                <th className="px-6 py-4 font-semibold">Period</th>
                <th className="px-6 py-4 font-semibold text-center">Usage (kWh)</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No invoices found for your room.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const StatusIcon = statusIcon[inv.status] ?? AlertCircle
                  const label = statusLabel[inv.status] ?? inv.status
                  const style = statusStyle[inv.status] ?? "bg-slate-50 text-slate-600 border-slate-200"
                  return (
                    <tr key={inv.invoice_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">
                        {inv.invoice_id}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.period}</td>
                      <td className="px-6 py-4 text-slate-600 text-center">
                        {inv.kwh_used.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">
                        {formatIDR(inv.total_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-sm border ${style}`}>
                          <StatusIcon className="h-3 w-3" />
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Download PDF">
                          <FileText className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {invoices.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
            <div>Showing all {invoices.length} invoice{invoices.length > 1 ? "s" : ""}</div>
          </div>
        )}
      </Card>
    </div>
  )
}