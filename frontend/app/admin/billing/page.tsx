"use client"

import { 
  Download, 
  FileText, 
  ChevronDown, 
  Filter, 
  MoreVertical, 
  ChevronRight,
  FolderClosed
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Dummy data untuk tabel invoice
const invoiceData = [
  { room: "101", kwh: 450, rate: 1500, total: 675000, status: "Paid" },
  { room: "102", kwh: 320, rate: 1500, total: 480000, status: "Unpaid" },
  { room: "103", kwh: 510, rate: 1500, total: 765000, status: "Paid" },
  { room: "104", kwh: 280, rate: 1500, total: 420000, status: "Pending" },
  { room: "105", kwh: 605, rate: 1500, total: 907500, status: "Paid" },
]

// Fungsi format Rupiah
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('Rp', 'Rp ')
}

export default function BillingPage() {
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
          <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
            October 2023
            <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
          </Button>

          {/* Export CSV */}
          <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          
          {/* Export PDF */}
          <Button variant="outline" className="text-slate-700 font-medium h-9 text-sm bg-white">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          {/* Generate Report */}
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
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Building Usage (Oct 2023)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">14,250</span>
              <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Revenue</p>
            <div className="text-3xl font-bold text-blue-700">Rp 21,375,000</div>
          </div>
        </div>
      </Card>

      {/* Split Content: Main Table (Left) and Sidebar Widgets (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Invoices Table (Takes up 2/3 width on large screens) */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-base font-semibold">Room Invoices</CardTitle>
              <div className="flex items-center gap-2">
                <button className="text-slate-400 hover:text-slate-600 p-1">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="text-slate-400 hover:text-slate-600 p-1">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50/80 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Room No</th>
                    <th className="px-6 py-4 font-semibold text-right">kWh Used</th>
                    <th className="px-6 py-4 font-semibold text-right">Rate (IDR)</th>
                    <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceData.map((invoice, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{invoice.room}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium text-right">{invoice.kwh}</td>
                      <td className="px-6 py-4 text-slate-500 text-right">1,500</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">{formatIDR(invoice.total)}</td>
                      <td className="px-6 py-4 text-center">
                        {invoice.status === 'Paid' && (
                          <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Paid
                          </span>
                        )}
                        {invoice.status === 'Unpaid' && (
                          <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-red-50 text-red-600 border border-red-100">
                            Unpaid
                          </span>
                        )}
                        {invoice.status === 'Pending' && (
                          <span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-sm bg-amber-50 text-amber-600 border border-amber-100">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition-colors">
                          <FileText className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-slate-500">
              <div>Showing 1 to 5 of 45 entries</div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 border rounded text-slate-500 hover:bg-slate-50 bg-white font-medium">Prev</button>
                <button className="px-3 py-1.5 border rounded bg-blue-600 text-white font-medium">1</button>
                <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">2</button>
                <button className="px-3 py-1.5 border rounded hover:bg-slate-50 text-slate-600 bg-white font-medium">Next</button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Summary Widgets */}
        <div className="space-y-6">
          
          {/* Collection Status Card */}
          <Card className="bg-white">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Collection Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Custom Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2">
                <div className="h-full bg-emerald-500" style={{ width: '75%' }}></div>
                <div className="h-full bg-amber-500" style={{ width: '13%' }}></div>
                <div className="h-full bg-red-500" style={{ width: '12%' }}></div>
              </div>
              
              <div className="flex justify-between text-xs font-semibold text-slate-900 mb-6">
                <span>Rp 16,031,250 Collected</span>
                <span>75%</span>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-slate-700">Paid</span>
                  </div>
                  <span className="font-semibold text-slate-900">34 <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="font-medium text-slate-700">Pending</span>
                  </div>
                  <span className="font-semibold text-slate-900">6 <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="font-medium text-slate-700">Unpaid</span>
                  </div>
                  <span className="font-semibold text-slate-900">5 <span className="text-slate-500 font-normal">Rooms</span></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing History Card */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-base font-semibold">Billing History</CardTitle>
              <button className="text-xs font-semibold text-blue-600 hover:underline">
                View All
              </button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* History Item 1 */}
              <div className="flex items-center justify-between p-3 border rounded-lg hover:border-slate-300 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-md text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                    <FolderClosed className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">September 2023</h4>
                    <p className="text-xs text-slate-500">Closed • Rp 20,150,000</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              {/* History Item 2 */}
              <div className="flex items-center justify-between p-3 border rounded-lg hover:border-slate-300 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-md text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                    <FolderClosed className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">August 2023</h4>
                    <p className="text-xs text-slate-500">Closed • Rp 22,400,000</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              {/* History Item 3 */}
              <div className="flex items-center justify-between p-3 border rounded-lg hover:border-slate-300 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-md text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                    <FolderClosed className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">July 2023</h4>
                    <p className="text-xs text-slate-500">Closed • Rp 21,800,000</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}