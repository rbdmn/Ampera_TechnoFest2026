import Link from "next/link"
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, Hash, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const roomDetailsData: Record<string, {
  room: string
  tenant: string
  kwh: number
  rate: number
  total: number
  period: string
  dueDate: string
  status: string
  proofFile: string | null
  proofDate: string | null
  notes: string
  lastReading: string
  estimatedSavings: string
}> = {
  "101": {
    room: "101",
    tenant: "Nina S.",
    kwh: 450,
    rate: 1500,
    total: 675000,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "Nov 5, 2023",
    status: "Paid",
    proofFile: "proof_101.jpg",
    proofDate: "Oct 10, 2023",
    notes: "Payment verified by admin. No discrepancies found.",
    lastReading: "Oct 31, 2023",
    estimatedSavings: "Rp 150,000"
  },
  "102": {
    room: "102",
    tenant: "Arief B.",
    kwh: 320,
    rate: 1500,
    total: 480000,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "Nov 5, 2023",
    status: "Unpaid",
    proofFile: null,
    proofDate: null,
    notes: "Invoice belum dibayar. Harap follow-up tenant untuk konfirmasi pembayaran.",
    lastReading: "Oct 31, 2023",
    estimatedSavings: "Rp 0"
  },
  "103": {
    room: "103",
    tenant: "Siti P.",
    kwh: 510,
    rate: 1500,
    total: 765000,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "Nov 5, 2023",
    status: "Paid",
    proofFile: "proof_103.jpg",
    proofDate: "Oct 12, 2023",
    notes: "Pembayaran masuk lebih awal. Tagihan sudah selesai.",
    lastReading: "Oct 31, 2023",
    estimatedSavings: "Rp 120,000"
  },
  "104": {
    room: "104",
    tenant: "Dian R.",
    kwh: 280,
    rate: 1500,
    total: 420000,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "Nov 5, 2023",
    status: "Pending",
    proofFile: "proof_104.jpg",
    proofDate: null,
    notes: "Menunggu verifikasi bukti pembayaran dari tenant.",
    lastReading: "Oct 31, 2023",
    estimatedSavings: "Rp 50,000"
  },
  "105": {
    room: "105",
    tenant: "Rendy L.",
    kwh: 605,
    rate: 1500,
    total: 907500,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "Nov 5, 2023",
    status: "Paid",
    proofFile: "proof_105.jpg",
    proofDate: "Oct 8, 2023",
    notes: "Konsumsi tinggi, namun pembayaran sudah dikonfirmasi.",
    lastReading: "Oct 31, 2023",
    estimatedSavings: "Rp 80,000"
  }
}

const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

export default function RoomBillingDetailsPage({ params }: { params: { Id: string } }) {
  const details = roomDetailsData[params.Id] || {
    room: params.Id,
    tenant: "Unknown",
    kwh: 0,
    rate: 1500,
    total: 0,
    period: "Oct 1 - Oct 31, 2023",
    dueDate: "-",
    status: "Unknown",
    proofFile: null,
    proofDate: null,
    notes: "Data tidak tersedia untuk room ini.",
    lastReading: "-",
    estimatedSavings: "Rp 0"
  }

  const statusStyle = () => {
    switch (details.status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'Unpaid':
        return 'bg-red-50 text-red-700 border-red-100'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Link href="/admin/billing" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900">
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Room {details.room} Billing Details</h1>
        <p className="text-sm text-slate-500 max-w-2xl">Lihat ringkasan tagihan, status pembayaran, bukti transfer, dan informasi penggunaan listrik untuk room ini.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Billing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tenant</p>
              <p className="font-semibold text-slate-900">{details.tenant}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Billing Period</p>
              <p>{details.period}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
              <p>{details.dueDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold rounded border ${statusStyle()}`}>
                {details.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Usage & Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Meter Reading</p>
                <p className="font-semibold text-slate-900">{details.lastReading}</p>
              </div>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">kWh Used</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{details.kwh}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Amount</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">{formatIDR(details.total)}</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rate per kWh</p>
              <p className="mt-1 font-semibold text-slate-900">{formatIDR(details.rate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estimated savings</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{details.estimatedSavings}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Note</p>
              <p className="mt-1 text-sm text-slate-700">{details.notes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Detail Room Invoice</CardTitle>
            <p className="text-sm text-slate-500">Informasi pembayaran, bukti transfer, dan histori tagihan.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {details.period}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              Room {details.room}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status Pembayaran</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${statusStyle()}`}>
                {details.status}
              </div>
              <p className="text-sm text-slate-600">{details.status === 'Paid' ? 'Tagihan sudah dibayar dan diperiksa.' : details.status === 'Pending' ? 'Menunggu verifikasi bukti pembayaran.' : 'Belum ada pembayaran masuk.'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Bukti Pembayaran</p>
              {details.proofFile ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">{details.proofFile}</p>
                  <p className="text-xs text-slate-500">Dikirim: {details.proofDate ?? 'Menunggu terverifikasi'}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Belum ada bukti pembayaran diunggah.</p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Invoice Actions</p>
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Invoice Breakdown</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Room Number</p>
                <p className="mt-2 font-semibold text-slate-900">{details.room}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tenant</p>
                <p className="mt-2 font-semibold text-slate-900">{details.tenant}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Usage</p>
                <p className="mt-2 font-semibold text-slate-900">{details.kwh} kWh</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rate</p>
                <p className="mt-2 font-semibold text-slate-900">{formatIDR(details.rate)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700">{formatIDR(details.total)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
                <p className="mt-2 font-semibold text-slate-900">{details.dueDate}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/admin/billing" className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
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
