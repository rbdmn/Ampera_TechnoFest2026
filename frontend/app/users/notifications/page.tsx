"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Check, 
  AlertTriangle, 
  Lightbulb, 
  Receipt, 
  Leaf, 
  WifiOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getEmail } from "@/lib/auth"
import { 
  getUserNotifications, 
  markAllNotificationsRead, 
  markNotificationRead, 
  type AlertOut 
} from "@/lib/api"

function typeToUi(alertType: string) {
  // Map backend alert_type -> UI
  if (alertType === "usage_warning" || alertType === "limit_exceeded") {
    return { type: "Alert", icon: AlertTriangle, color: "red" as const }
  }
  if (alertType === "anomaly") {
    return { type: "Insight", icon: Lightbulb, color: "blue" as const }
  }
  return { type: "System", icon: WifiOff, color: "orange" as const }
}

function getColorStyles(color: string) {
  switch (color) {
    case "red":
      return { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-600" }
    case "blue":
      return { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-600" }
    case "orange":
      return { border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-600" }
    default:
      return { border: "border-l-slate-300", bg: "bg-slate-100", text: "text-slate-600" }
  }
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("All")
  const [data, setData] = useState<AlertOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | undefined>(undefined)

useEffect(() => {
  if (typeof window !== "undefined") {
    setEmail(getEmail() ?? undefined)
  }
}, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)

      const typeFilter =
        activeTab === "Alerts"
          ? "alert"
          : activeTab === "Insights"
            ? "insight"
            : "all"

      const unreadOnly = activeTab === "Unread"

      const res = await getUserNotifications({ email, type: typeFilter as any, unread_only: unreadOnly, page: 1, limit: 50 })
      setData(res.data)
    } catch (e: any) {
      setError(e?.message ?? "failed_to_load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const markAllAsRead = async () => {
    await markAllNotificationsRead(email)
    await load()
  }

  const onMarkRead = async (alertId: string) => {
    await markNotificationRead(alertId)
    await load()
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Your latest alerts, insights, and system updates.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={markAllAsRead} 
          className="text-slate-600 bg-white"
          disabled={loading}
        >
          <Check className="h-4 w-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2">
        {["All", "Unread", "Alerts", "Insights"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeTab === tab 
                ? "bg-blue-600 text-white" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-sm text-slate-500">No notifications.</div>
          ) : (
            data.map((notif) => {
              const ui = typeToUi(notif.alert_type)
              const colors = getColorStyles(ui.color)
              const Icon = ui.icon

              return (
                <div 
                  key={notif.alert_id} 
                  className={`relative flex items-start gap-4 p-5 bg-white border border-slate-200 shadow-sm rounded-r-xl rounded-l-sm border-l-4 ${colors.border} ${notif.is_read ? '' : 'bg-blue-50/10'}`}
                >
                  {/* Unread Indicator Dot */}
                  {!notif.is_read && (
                    <div className="absolute top-6 left-0 -translate-x-1.5 w-2 h-2 rounded-full bg-blue-600 border border-white"></div>
                  )}

                  {/* Icon */}
                  <div className={`p-2.5 rounded-full shrink-0 mt-0.5 ${colors.bg} ${colors.text}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                      <h3 className={`text-sm font-bold ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notif.alert_type.replaceAll("_", " ")}
                      </h3>
                      <span className="text-xs text-slate-400 whitespace-nowrap font-medium">
                        {timeAgo(notif.triggered_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {notif.message}
                    </p>

                    {/* Badges & Actions */}
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                        {ui.type}
                      </span>
                      
                      {!notif.is_read && (
                        <button
                          onClick={() => onMarkRead(notif.alert_id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}