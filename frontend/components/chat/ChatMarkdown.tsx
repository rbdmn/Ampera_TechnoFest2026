"use client"

import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Home,
  Zap,
  Coins,
  FileText,
  Sparkles,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function pickIcon(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes("ringkasan") || lower.includes("kesimpulan")) return FileText
  if (lower.includes("tagihan") || lower.includes("billing") || lower.includes("total")) return Coins
  if (lower.includes("boros") || lower.includes("konsumsi") || lower.includes("pemakaian")) return Zap
  if (lower.includes("kamar") || lower.includes("rank") || lower.includes("kontribusi")) return Home
  if (lower.includes("anomali") || lower.includes("peringatan") || lower.includes("alert")) return AlertTriangle
  if (lower.includes("hemat") || lower.includes("tips") || lower.includes("saran")) return Lightbulb
  return TrendingUp
}

function formatRupiah(text: string): string {
  return text.replace(/Rp\s*(\d+(?:[.,]\d+)?)/g, (_, num) => {
    const cleaned = num.replace(/[.,]/g, "")
    const n = Number.parseInt(cleaned, 10)
    if (Number.isNaN(n)) return _
    return `Rp ${n.toLocaleString("id-ID")}`
  })
}

function AITable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null
  const headers = rows[0]
  const dataRows = rows.slice(1)

  return (
    <div className="my-2 rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i} className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataRows.map((row, ri) => {
            const rowText = row.join(" ")
            const isDestructive = /boros|warning|alert|exceeded|melebihi/i.test(rowText)
            const isHighlight = /total|rata/i.test(rowText)
            return (
              <TableRow
                key={ri}
                className={cn(
                  isDestructive && "bg-red-50/50 hover:bg-red-50/80",
                  isHighlight && "bg-blue-50/50 font-semibold hover:bg-blue-50/80"
                )}
              >
                {row.map((cell, ci) => (
                  <TableCell key={ci} className="text-xs py-2">
                    <CellContent text={cell} />
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function CellContent({ text }: { text: string }) {
  const clean = text.replace(/\*+/g, "")
  const rupiahMatch = clean.match(/^Rp\s*([\d.,]+)/)
  if (rupiahMatch) {
    const value = rupiahMatch[1].replace(/[.,]/g, "")
    const num = Number.parseInt(value, 10)
    const formatted = Number.isNaN(num)
      ? rupiahMatch[0]
      : `Rp ${num.toLocaleString("id-ID")}`
    const variant = num > 100000 ? "destructive" : num > 50000 ? "default" : "secondary"
    return <Badge variant={variant} className="text-[11px] px-1.5">{formatted}</Badge>
  }

  const kwhMatch = clean.match(/^([\d.]+)\s*kWh/i)
  if (kwhMatch) {
    return (
      <Badge variant="outline" className="text-[11px] px-1.5">
        {clean}
      </Badge>
    )
  }

  if (/(boros|warning|exceeded|melebihi)/i.test(clean)) {
    return <span className="font-bold text-red-600">{clean}</span>
  }

  return <span>{clean}</span>
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ""
}

function toArray(node: React.ReactNode): React.ReactNode[] {
  if (Array.isArray(node)) return node
  return [node]
}

function parseTableLines(text: string): string[][] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return null

  const tableLines: string[] = []
  let started = false

  for (const line of lines) {
    if (line.startsWith("|") && line.endsWith("|") && line.includes("|")) {
      if (!started) {
        started = true
      }
      tableLines.push(line)
    } else if (started) {
      break
    }
  }

  if (tableLines.length < 2) return null

  const nonSep = tableLines.filter((l) => {
    const inner = l.replace(/^\|/, "").replace(/\|$/, "")
    return !/^[\s\-:|]+$/.test(inner)
  })

  const rows = nonSep.map((line) =>
    line
      .split("|")
      .map((c) => c.trim().replace(/\*\*/g, ""))
      .filter(Boolean)
  )

  rows.forEach((row) => {
    while (row.length < 4) row.push("")
  })

  return rows
}

type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "table"; rows: string[][] }

function preprocessContent(content: string): ContentSegment[] {
  let text = content

  text = formatRupiah(text)

  text = text.replace(
    /^(Ringkasan|Kesimpulan)$/gm,
    "## $1"
  )
  text = text.replace(
    /^(Rincian\s*Kamar|Detail\s*Kamar|Kamar\s*(?:dengan\s*)?Kontribusi|Ranking|Perbandingan|Data\s*Kamar)$/gm,
    "## $1"
  )
  text = text.replace(
    /^(Saran\s*(?:Hemat\s*)?Energi|Tips|Rekomendasi)$/gm,
    "## $1"
  )
  text = text.replace(
    /^(Tagihan|Billing|Total\s*Tagihan)$/gm,
    "## $1"
  )
  text = text.replace(
    /^(Anomali|Peringatan|Notifikasi|Alert)/gm,
    "## $1"
  )

  text = text.replace(/^💡\s*/gm, "> 💡 ")

  text = text.replace(/\|\s*\|\s*/g, " |\n| ")

  const paragraphs = text.split(/\n\s*\n/).filter(Boolean)
  const segments: ContentSegment[] = []

  const pushMarkdown = (value: string) => {
    const content = value.trim()
    if (!content) return
    const last = segments[segments.length - 1]
    if (last?.type === "markdown") {
      last.content = `${last.content}\n\n${content}`
      return
    }
    segments.push({ type: "markdown", content })
  }

  for (const para of paragraphs) {
    const lines = para
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const tableLines = lines.filter(
      (l) =>
        l.startsWith("|") &&
        l.endsWith("|") &&
        l.split("|").filter(Boolean).length >= 2
    )

    if (tableLines.length >= 2) {
      const rows = parseTableLines(tableLines.join("\n"))
      if (rows && rows.length >= 2) {
        const nonTableLines = lines.filter((l) => !tableLines.includes(l))
        if (nonTableLines.length > 0) {
          pushMarkdown(nonTableLines.join("\n"))
        }
        segments.push({ type: "table", rows })
        continue
      }
    }

    pushMarkdown(para)
  }

  return segments
}

export default function ChatMarkdown({ content }: { content: string }) {
  const segments = useMemo(() => preprocessContent(content), [content])

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        if (segment.type === "table") {
          return <AITable key={`table-${index}`} rows={segment.rows} />
        }

        return (
          <ReactMarkdown
            key={`markdown-${index}`}
            components={{
          h2: ({ children }) => {
            const text = extractText(children)
            const Icon = pickIcon(text)
            return (
              <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-blue-100">
                <div className="bg-blue-600/10 p-1 rounded-md">
                  <Icon className="h-4 w-4 text-blue-700" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 m-0">{children}</h2>
              </div>
            )
          },

          h3: ({ children }) => {
            const text = extractText(children)
            const Icon = pickIcon(text)
            return (
              <div className="flex items-center gap-1.5 mt-3 mb-1">
                <Icon className="h-3.5 w-3.5 text-slate-500" />
                <h3 className="text-xs font-semibold text-slate-700">{children}</h3>
              </div>
            )
          },

          p: ({ children }) => {
            const childArray = toArray(children)
            const firstChild = childArray[0]

            if (
              typeof firstChild === "string" &&
              (/^💡/.test(firstChild) || /^⚡/.test(firstChild))
            ) {
              return (
                <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-amber-900 leading-relaxed">{children}</div>
                </div>
              )
            }
            return (
              <p className="text-xs text-slate-700 leading-relaxed my-1">{children}</p>
            )
          },

          strong: ({ children }) => {
            const text = extractText(children)

            const rupiahMatch = text.match(/^Rp\s*([\d.,]+)/)
            if (rupiahMatch) {
              const value = rupiahMatch[1].replace(/[.,]/g, "")
              const num = Number.parseInt(value, 10)
              const formatted = Number.isNaN(num)
                ? rupiahMatch[0]
                : `Rp ${num.toLocaleString("id-ID")}`
              const variant = num > 100000 ? "destructive" : num > 50000 ? "default" : "secondary"
              return <Badge variant={variant} className="text-[11px] px-1.5">{formatted}</Badge>
            }

            const kwhMatch = text.match(/^([\d.]+)\s*kWh/i)
            if (kwhMatch) {
              return (
                <Badge variant="outline" className="text-[11px] px-1.5">{children}</Badge>
              )
            }

            const isNumber = /^[\d.,%]+$/.test(text.trim())
            if (isNumber) {
              return <span className="font-bold text-slate-900">{children}</span>
            }

            if (/(boros|warning|exceeded|melebihi|anomali)/i.test(text)) {
              return <span className="font-bold text-red-600">{children}</span>
            }

            if (/(hemat|aman|normal|baik)/i.test(text)) {
              return <span className="font-bold text-emerald-600">{children}</span>
            }

            return <span className="font-semibold text-slate-900">{children}</span>
          },

          ul: ({ children }) => (
            <ul className="list-none space-y-1.5 my-1.5">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-1.5 text-xs text-slate-700">{children}</ol>
          ),

          li: ({ children }) => {
            const text = extractText(children)
            const isDestructive = /boros|warning|melebihi/i.test(text)
            const isPositive = /hemat|aman|normal/i.test(text)
            return (
              <li className="flex items-start gap-2 text-xs text-slate-700">
                {isDestructive ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                ) : isPositive ? (
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/60" />
                )}
                <span>{children}</span>
              </li>
            )
          },

          blockquote: ({ children }) => {
            const childArray = toArray(children)
            const text = childArray.map((c) => (typeof c === "string" ? c : "")).join(" ").trim()

            if (/(hemat|tips|saran|ingat|coba)/i.test(text)) {
              return (
                <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-amber-900 leading-relaxed">{text}</div>
                </div>
              )
            }

            return (
              <div className="border-l-4 border-blue-400 bg-blue-50/50 pl-3 py-1 my-1.5 rounded-r-md text-xs text-slate-600 italic">
                {children}
              </div>
            )
          },

          hr: () => <div className="border-t border-slate-100 my-3" />,

          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono text-slate-800">
              {children}
            </code>
          ),
            }}
          >
            {segment.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
