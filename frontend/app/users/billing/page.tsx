"use client"

import { useState } from "react"
import { 
  Download, 
  FileText, 
  CreditCard, 
  Check,
  CheckCircle2, 
  AlertCircle,
  Receipt
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

// Fungsi format Rupiah
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

// Dummy data untuk riwayat tagihan user
const billingHistory = [
  { id: "INV-2023-09", month: "September 2023", kwh: 450, amount: 675000, status: "Paid", date: "Oct 05, 2023" },
  { id: "INV-2023-08", month: "August 2023", kwh: 420, amount: 630000, status: "Paid", date: "Sep 03, 2023" },
  { id: "INV-2023-07", month: "July 2023", kwh: 380, amount: 570000, status: "Paid", date: "Aug 02, 2023" },
  { id: "INV-2023-06", month: "June 2023", kwh: 410, amount: 615000, status: "Paid", date: "Jul 04, 2023" },
]

export default function UserBillingPage() {
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bsi">("qris")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [currentStatus, setCurrentStatus] = useState<"UNPAID" | "Pending Approval" | "PAID">("UNPAID")
  const amountDue = 480000

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setProofFile(file)
  }

  const handleSubmitPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCurrentStatus("Pending Approval")
    setShowPayDialog(false)
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
          <p className="text-sm text-slate-500">View your energy consumption bills and payment history.</p>
        </div>
      </div>

        
        {/* LELFT COLUMN: Current Outstanding Bill (Takes 2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-white border-blue-200 shadow-sm relative overflow-hidden">
            {/* Aksen garis biru di atas card */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
            
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    Current Invoice
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Billing Period: Oct 01 - Oct 31, 2023</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border ${currentStatus === "UNPAID" ? "bg-red-50 text-red-600 border-red-200" : currentStatus === "Pending Approval" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  {currentStatus}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 border rounded-xl gap-6">
                
                {/* Detail Penggunaan */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount Due</p>
                  <div className="text-4xl font-bold text-slate-900">{formatIDR(amountDue)}</div>
                  <p className="text-sm font-medium text-slate-500 mt-2">
                    Based on <span className="font-bold text-slate-700">320 kWh</span> usage
                  </p>
                </div>

                {/* Info Jatuh Tempo & Action */}
                <div className="flex flex-col items-start md:items-end w-full md:w-auto gap-4">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</p>
                    <p className="text-lg font-bold text-red-600">Nov 05, 2023</p>
                  </div>
                  {currentStatus === "Pending Approval" && (
                    <p className="text-sm text-amber-700">Bukti pembayaran telah dikirim. Menunggu persetujuan admin.</p>
                  )}
                  <div className="flex w-full md:w-auto gap-3">
                    <Button variant="outline" className="flex-1 md:flex-none text-slate-700 bg-white" asChild>
                      <a href="#" download className="flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        PDF
                      </a>
                    </Button>
                    <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white shadow-sm">
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
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Table: Billing History */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Billing History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Invoice No</th>
                    <th className="px-6 py-4 font-semibold">Billing Period</th>
                    <th className="px-6 py-4 font-semibold text-center">Usage (kWh)</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billingHistory.map((invoice, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">{invoice.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{invoice.month}</td>
                      <td className="px-6 py-4 text-slate-600 text-center">{invoice.kwh}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">{formatIDR(invoice.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-sm bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Download PDF">
                          <FileText className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination for History */}
            <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
              <div>Showing 1 to 4 of 12 entries</div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 border rounded text-slate-400 bg-white font-medium" disabled>Prev</button>
                <button className="px-3 py-1.5 border rounded bg-blue-600 text-white font-medium">1</button>
                <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">2</button>
                <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">Next</button>
              </div>
            </div>
          </Card>
        </div>
    </div>
  )
}