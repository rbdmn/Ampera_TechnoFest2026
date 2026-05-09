"use client"

import { 
  Bot, 
  Download, 
  Trash2, 
  Paperclip, 
  SendHorizontal, 
  Lightbulb, 
  TerminalSquare, 
  Eye,
  Settings
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Dummy data untuk Suggested Questions
const suggestedQuestions = [
  {
    title: "Which room is most wasteful?",
    desc: "Identifies high anomaly consumption zones."
  },
  {
    title: "Calculate April total bill",
    desc: "Generates aggregate financial data for a period."
  },
  {
    title: "Show usage anomalies",
    desc: "Lists all sensors reporting > 2 standard deviations."
  },
  {
    title: "Generate end-of-day report",
    desc: "Compiles summary statistics into a downloadable format."
  }
]

export default function AIChatPage() {
  return (
    // Menggunakan calc(100vh - 110px) agar chatbox menempel di bawah tanpa scrolling halaman utama
    <div className="flex h-[calc(100vh-110px)] max-w-[1600px] mx-auto gap-6">
      
      {/* LEFT COLUMN: Main Chat Interface */}
      <Card className="flex-1 flex flex-col bg-white shadow-sm overflow-hidden border-slate-200">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">Ampera AI Assistant</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                <span className="text-[11px] font-medium text-slate-500">System connected. Ready to analyze data.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* Timestamp */}
          <div className="flex justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Today, 10:42 AM
            </span>
          </div>

          {/* User Message 1 */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-blue-700 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-sm">
              Which room is most wasteful in Building A right now?
            </div>
            <span className="text-[10px] text-slate-400 font-medium mr-1">Manager</span>
          </div>

          {/* AI Message 1 (With Tool Execution & Table) */}
          <div className="flex flex-col items-start gap-2 max-w-[85%]">
            {/* Tool Execution Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-mono text-[11px]">
              <Settings className="h-3 w-3 animate-spin-slow" />
              Executing Tool: <span className="text-blue-700 font-semibold">query_consumption(target="Building A", metric="current_load", rank="desc")</span>
            </div>
            
            {/* AI Response Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 w-full">
              <p className="text-sm text-slate-700 leading-relaxed">
                Based on the current telemetry data, the HVAC Control Room (Level 2) is showing anomalous high consumption, likely indicating a malfunctioning chiller unit. Here is the current top 3 breakdown:
              </p>
              
              {/* Data Table within Chat */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Room</th>
                      <th className="px-4 py-2 font-semibold text-right">Current Load (kW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-slate-900">HVAC Control Room</td>
                      <td className="px-4 py-2.5 font-bold text-red-600 text-right">142.5</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">Server Room Alpha</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 text-right">85.2</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">Room 304</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 text-right">12.1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <Button variant="outline" size="sm" className="text-xs font-medium bg-slate-50 h-8">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Room Details
              </Button>
            </div>
            <span className="text-[10px] text-slate-400 font-medium ml-1">Ampera AI</span>
          </div>

          {/* User Message 2 */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-blue-700 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-sm">
              Calculate April total bill for Resident Unit 402.
            </div>
            <span className="text-[10px] text-slate-400 font-medium mr-1">Manager</span>
          </div>

          {/* AI Message 2 (With Tool Execution & Highlighted Metric) */}
          <div className="flex flex-col items-start gap-2 max-w-[85%] pb-4">
            {/* Tool Execution Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-mono text-[11px]">
              <Settings className="h-3 w-3" />
              Executing Tool: <span className="text-blue-700 font-semibold">calculate_invoice(unit="402", period="2024-04")</span>
            </div>
            
            {/* AI Response Card */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-sm space-y-3 w-full">
              <p className="text-sm text-slate-700">
                The total calculated bill for Unit 402 for the billing period of April 2024 is:
              </p>
              <div className="text-3xl font-bold text-blue-700">
                $128.45
              </div>
              <p className="text-xs text-slate-500">
                This includes 845 kWh of standard usage and applicable grid delivery fees. Would you like me to generate the PDF invoice for dispatch?
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium ml-1">Ampera AI</span>
          </div>

        </div>

        {/* Chat Input Area */}
        <div className="p-4 bg-white border-t">
          <div className="relative flex items-center border border-slate-300 rounded-xl bg-slate-50 px-2 py-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <Paperclip className="h-5 w-5" />
            </button>
            <input 
              type="text" 
              placeholder="Ask Ampera AI to analyze data, generate reports, or execute commands..."
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <button className="bg-blue-700 hover:bg-blue-800 text-white p-2.5 rounded-lg transition-colors shadow-sm">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            Ampera AI can make mistakes. Verify important financial data.
          </p>
        </div>
      </Card>

      {/* RIGHT COLUMN: Sidebar Insights (Hidden on small screens) */}
      <div className="hidden xl:flex flex-col w-[320px] gap-6">
        
        {/* Suggested Questions */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Suggested Questions
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">Click an example below to instantly query the system.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {suggestedQuestions.map((q, idx) => (
              <div 
                key={idx} 
                className="p-3 border rounded-lg bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all group"
              >
                <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 mb-1">{q.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">{q.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agent Capabilities */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Agent Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Sensor Querying
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Invoice Calculation
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Anomaly Detection
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400"></span>
              Auto-Disconnect (Disabled)
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}