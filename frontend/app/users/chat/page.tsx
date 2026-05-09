"use client"

import { 
  Bot, 
  Download, 
  Trash2, 
  Paperclip, 
  SendHorizontal, 
  Lightbulb, 
  Settings,
  AlertTriangle,
  Zap,
  TrendingDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Pertanyaan yang disarankan untuk penghuni/user
const suggestedQuestions = [
  {
    title: "Why is my bill higher this month?",
    desc: "Analyzes your usage patterns compared to last month."
  },
  {
    title: "How can I reduce my usage?",
    desc: "Provides personalized tips based on your appliances."
  },
  {
    title: "Is my AC running efficiently?",
    desc: "Checks for abnormal cooling patterns or maintenance needs."
  },
  {
    title: "Predict my final bill",
    desc: "Estimates end-of-month cost based on current habits."
  }
]

export default function UserAIChatPage() {
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-slate-500">Connected to your room data.</span>
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
              Today, 08:15 PM
            </span>
          </div>

          {/* User Message 1 */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-blue-700 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-sm">
              Why is my electricity bill so much higher this month compared to September?
            </div>
            <span className="text-[10px] text-slate-400 font-medium mr-1">You</span>
          </div>

          {/* AI Message 1 (With Tool Execution & Analysis) */}
          <div className="flex flex-col items-start gap-2 max-w-[85%]">
            {/* Tool Execution Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-mono text-[11px]">
              <Settings className="h-3 w-3 animate-spin-slow" />
              Executing Tool: <span className="text-blue-700 font-semibold">compare_usage(period="Oct vs Sep")</span>
            </div>
            
            {/* AI Response Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 w-full">
              <p className="text-sm text-slate-700 leading-relaxed">
                I've analyzed your usage data for October vs September. The primary reason for the increase is a <span className="font-bold text-slate-900">42% surge in nighttime consumption</span> (between 11 PM and 6 AM).
              </p>
              
              {/* Highlight Box inside Chat */}
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">AC Unit Behavior Anomaly</h4>
                  <p className="text-xs text-slate-600 mt-1">Your AC compressor is running continuously at night without cycling off. This usually indicates it's set too low (currently averaging 18°C) or requires a filter cleaning.</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                Adjusting the temperature to 24°C at night could save you approximately <span className="font-semibold text-emerald-600">Rp 125,000</span> on next month's bill. Would you like me to notify maintenance to clean your AC filter?
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium ml-1">Ampera AI</span>
          </div>

          {/* User Message 2 */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-blue-700 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-sm">
              Yes, please request maintenance for the filter. And how much is my current estimated bill for October?
            </div>
            <span className="text-[10px] text-slate-400 font-medium mr-1">You</span>
          </div>

          {/* AI Message 2 */}
          <div className="flex flex-col items-start gap-2 max-w-[85%] pb-4">
             {/* Tool Execution Indicator */}
             <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-mono text-[11px]">
              <Settings className="h-3 w-3" />
              Executing: <span className="text-blue-700 font-semibold">submit_ticket() & get_estimate()</span>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-sm space-y-3 w-full">
              <p className="text-sm text-slate-700">
                Maintenance request <span className="font-bold text-blue-700">#REQ-8042</span> has been submitted. They will contact you shortly to schedule the cleaning.
              </p>
              <div className="border-t border-blue-200/50 my-2"></div>
              <p className="text-sm text-slate-700">
                Based on your usage of 342.5 kWh so far, your estimated final bill for October is:
              </p>
              <div className="text-3xl font-bold text-blue-700">
                Rp 512,400
              </div>
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
              placeholder="Ask Ampera AI about your usage, bills, or tips to save energy..."
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <button className="bg-blue-700 hover:bg-blue-800 text-white p-2.5 rounded-lg transition-colors shadow-sm">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            AI can make mistakes. Check your official invoice in the Billing tab for exact amounts.
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
            <p className="text-xs text-slate-500 mt-1">Tap a question to ask the AI.</p>
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

        {/* Quick Tips */}
        <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center">
              <TrendingDown className="h-3 w-3 mr-1.5" />
              Saving Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
             <div className="flex gap-2">
                <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Turn off your water heater when leaving for work. This can save you up to <strong>15%</strong> daily.
                </p>
             </div>
             <div className="flex gap-2">
                <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Unplugging your gaming PC when not in use stops 'vampire draw'.
                </p>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}