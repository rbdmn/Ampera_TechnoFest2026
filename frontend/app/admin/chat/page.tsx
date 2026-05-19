"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { 
  Bot, 
  Download, 
  Trash2, 
  SendHorizontal, 
  Lightbulb, 
  Settings,
  Sparkles,
  CheckCircle2,
  Send,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ChatMarkdown from "@/components/chat/ChatMarkdown"
import { toast } from "sonner"

type Message = {
  id: number
  role: "user" | "assistant"
  content: string
}

type AgentTool = {
  name: string
  description: string
}

const suggestedQuestions = [
  {
    title: "Kamar mana yang paling boros?",
    desc: "Pakai query_consumption dan analyze_pattern."
  },
  {
    title: "Siapa penghuni kamar 103?",
    desc: "Pakai query_room_details untuk cek penghuni."
  },
  {
    title: "Bandingkan kamar 101-105 berdasarkan kWh",
    desc: "Pakai compare_rooms untuk ranking kamar."
  },
  {
    title: "Hitung total tagihan April",
    desc: "Pakai get_billing_summary dan calculate_bill."
  },
  {
    title: "Tampilkan anomali penggunaan",
    desc: "Pakai list_anomalies untuk lonjakan pemakaian."
  },
  {
    title: "Buat laporan akhir hari",
    desc: "Gabungkan konsumsi, tagihan, dan anomali."
  },
  {
    title: "Kirim peringatan untuk kamar yang boros",
    desc: "Pakai send_notification jika perlu follow-up."
  },
  {
    title: "Berapa estimasi tagihan kamar 101?",
    desc: "Pakai calculate_bill dari data konsumsi kamar."
  }
]

const defaultToolLabels = [
  "query_consumption",
  "analyze_pattern",
  "calculate_bill",
]

function inferActiveTools(message: string) {
  const lowered = message.toLowerCase()
  const tools = new Set(defaultToolLabels)

  if (/(siapa|penghuni|detail|kamar\s*\d{3})/.test(lowered)) {
    tools.add("query_room_details")
  }

  if (/(banding|compare|ranking|101-105|per_capita|per orang)/.test(lowered)) {
    tools.add("compare_rooms")
  }

  if (/(tagihan|billing|bill|invoice|idr|rupiah|april)/.test(lowered)) {
    tools.add("get_billing_summary")
    tools.add("calculate_bill")
  }

  if (/(anomali|boros|lonjakan|tidak biasa|aneh)/.test(lowered)) {
    tools.add("list_anomalies")
    tools.add("analyze_pattern")
  }

  if (/(peringatan|notifikasi|kirim|ingatkan)/.test(lowered)) {
    tools.add("send_notification")
  }

  return Array.from(tools)
}

function isSendingNotification(tools: string[], _input: string): boolean {
  return tools.includes("send_notification")
}

function hasNotificationSuccess(content: string): boolean {
  return /notifikasi\s*berhasil|berhasil\s*dikirim|✅|terkirim/i.test(content)
}

function exportChat(messages: Message[]) {
  if (messages.length === 0) return
  const text = messages
    .map((m) => {
      const role = m.role === "user" ? "Anda" : "Ampera AI"
      return `[${role}]\n${m.content}\n`
    })
    .join("\n---\n\n")
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `ampera-chat-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function getTodayLabel(): string {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, "0")
  const m = now.getMinutes().toString().padStart(2, "0")
  return `Today, ${h}:${m}`
}

function messagesToHistory(messages: Message[]): { role: string; content: string }[] {
  return messages.map((m) => ({ role: m.role, content: m.content }))
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [agentTools, setAgentTools] = useState<AgentTool[]>([])
  const [activeTools, setActiveTools] = useState<string[]>(defaultToolLabels)
  const [timestamp] = useState(getTodayLabel)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchTools() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
        const response = await fetch(`${baseUrl}/agent/tools`)

        if (!response.ok) {
          throw new Error(`Tools request failed with status ${response.status}`)
        }

        const data = (await response.json()) as { tools?: AgentTool[] }
        if (!cancelled) {
          setAgentTools(data.tools ?? [])
        }
      } catch {
        if (!cancelled) {
          setAgentTools([])
        }
      }
    }

    void fetchTools()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  async function sendMessage(message: string) {
    const trimmed = message.trim()
    if (!trimmed || loading) return

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setActiveTools(inferActiveTools(trimmed))
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const response = await fetch(`${baseUrl}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history: messagesToHistory(messages),
        }),
      })

      if (!response.ok) {
        throw new Error(`Agent request failed with status ${response.status}`)
      }

      const data = (await response.json()) as { reply?: string }
      const reply = data.reply ?? "No reply returned from Ampera AI."

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply,
        },
      ])

      if (hasNotificationSuccess(reply)) {
        toast.success("Alert sent successfully", {
          description: "Notifikasi peringatan telah dikirim ke kamar terkait.",
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
          duration: 4000,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach Ampera AI."
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `Request failed: ${message}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    // Menggunakan calc(100vh - 110px) agar chatbox menempel di bawah tanpa scrolling halaman utama
    <div className="flex h-[calc(100vh-110px)] max-w-[1600px] mx-auto gap-6 min-w-0">
      
      {/* LEFT COLUMN: Main Chat Interface */}
      <Card className="flex-1 min-w-0 flex flex-col bg-white shadow-sm overflow-hidden border-slate-200">
        
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
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600" onClick={() => exportChat(messages)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setMessages([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          
          {messages.length === 0 && (
            <div className="flex justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {timestamp}
              </span>
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex flex-col items-end gap-1">
                <div className="bg-blue-700 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-sm">
                  {message.content}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mr-1">Manager</span>
              </div>
            ) : (
              <div key={message.id} className="flex flex-col items-start gap-1.5 max-w-[95%] sm:max-w-[90%] pb-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full">
                  <ChatMarkdown content={message.content} />
                </div>
                <span className="text-[10px] text-slate-400 font-medium ml-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  Ampera AI
                </span>
              </div>
            )
          )}

          {loading && (
            <div className="flex flex-col items-start gap-2 max-w-[95%] sm:max-w-[85%] pb-4">
              {isSendingNotification(activeTools, input) ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md font-mono text-[11px]">
                    <Send className="h-3 w-3 animate-bounce" />
                    <span>Sending Notification:</span>
                    <span className="text-emerald-700 font-semibold">send_notification</span>
                  </div>
                  <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-3 w-full">
                    <div className="flex items-center gap-2 text-sm text-emerald-800 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Mengirim notifikasi ke kamar...
                    </div>
                    <div className="flex gap-1.5 items-center text-xs text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
                      <span className="ml-1">Memproses...</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md font-mono text-[11px]">
                    <Settings className="h-3 w-3 animate-spin" />
                    <span>Executing Tools:</span>
                    {activeTools.map((tool) => (
                      <span key={tool} className="text-blue-700 font-semibold">
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 w-full">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Analyzing consumption data...
                    </p>
                  </div>
                </>
              )}
              <span className="text-[10px] text-slate-400 font-medium ml-1">Ampera AI</span>
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Chat Input Area */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSubmit} className="relative flex items-center border border-slate-300 rounded-xl bg-slate-50 px-2 py-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
            <input 
              type="text" 
              placeholder="Ask Ampera AI to analyze data, generate reports, or execute commands..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <button type="submit" disabled={loading || !input.trim()} className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors shadow-sm">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
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
          <CardContent className="pt-4 space-y-3 max-h-[260px] overflow-y-auto pr-2">
            {suggestedQuestions.map((q, idx) => (
              <div 
                key={idx} 
                onClick={() => void sendMessage(q.title)}
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
            {agentTools.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2 text-xs font-mono text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span title={tool.description}>{tool.name}</span>
              </div>
            ))}
            {agentTools.length === 0 && (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400"></span>
                Loading tools...
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
