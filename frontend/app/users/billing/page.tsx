"use client"

import { 
  Download, 
  FileText, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Receipt
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
          <p className="text-sm text-slate-500">View your energy consumption bills and payment history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
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
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  UNPAID
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 border rounded-xl gap-6">
                
                {/* Detail Penggunaan */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount Due</p>
                  <div className="text-4xl font-bold text-slate-900">{formatIDR(480000)}</div>
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
                  <div className="flex w-full md:w-auto gap-3">
                    <Button variant="outline" className="flex-1 md:flex-none text-slate-700 bg-white">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white shadow-sm">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Now
                    </Button>
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

        {/* RIGHT COLUMN: Payment Methods & Info */}
        <div className="space-y-6">
          
          {/* Supported Payment Methods */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                <div className="bg-blue-50 p-2 rounded-md text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Bank Transfer / VA</h4>
                  <p className="text-xs text-slate-500">BCA, Mandiri, BNI, BRI</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                <div className="bg-emerald-50 p-2 rounded-md text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">E-Wallet</h4>
                  <p className="text-xs text-slate-500">GoPay, OVO, Dana, ShopeePay</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Support / Info */}
          <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Need Help?</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    If you notice any discrepancies in your usage or have questions about this invoice, please contact the building management or ask Ampera AI for an explanation of your usage spikes.
                  </p>
                  <Button variant="link" className="px-0 text-blue-700 h-auto font-semibold mt-2 text-xs">
                    Contact Support &rarr;
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}