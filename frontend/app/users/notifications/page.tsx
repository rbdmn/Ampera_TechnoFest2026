"use client"

import { useState } from "react"
import { 
  Check, 
  AlertTriangle, 
  Lightbulb, 
  Receipt, 
  Leaf, 
  WifiOff
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Dummy data sesuai desain
const initialNotifications = [
  {
    id: 1,
    type: "Alert",
    title: "Usage Limit Approaching",
    message: "Your projected energy usage for this billing cycle is set to exceed your defined threshold of 850 kWh. Consider adjusting HVAC schedules.",
    time: "10m ago",
    isUnread: true,
    icon: AlertTriangle,
    color: "red", // Menentukan warna border dan icon
    actionText: null
  },
  {
    id: 2,
    type: "Insight",
    title: "Peak Hour Optimization",
    message: "Shifting your heavy appliance usage to off-peak hours (10 PM - 6 AM) could save you an estimated 12% on your next invoice.",
    time: "2h ago",
    isUnread: true,
    icon: Lightbulb,
    color: "blue",
    actionText: "View AI Analysis"
  },
  {
    id: 3,
    type: "System",
    title: "Invoice Generated: October",
    message: "Your monthly electricity invoice for October has been generated and is ready for review. Total amount due: Rp 512,400.",
    time: "Yesterday",
    isUnread: false,
    icon: Receipt,
    color: "orange",
    actionText: "View Invoice"
  },
  {
    id: 4,
    type: "Insight",
    title: "Weekly Efficiency Summary",
    message: "Great job! Your household was 5% more efficient compared to the neighborhood average last week.",
    time: "Oct 24",
    isUnread: false,
    icon: Leaf,
    color: "blue",
    actionText: null
  },
  {
    id: 5,
    type: "Alert",
    title: "Smart Meter Disconnected",
    message: "Connection to your smart meter was temporarily lost for 15 minutes. Data interpolation was applied during this period.",
    time: "Oct 22",
    isUnread: false,
    icon: WifiOff,
    color: "red",
    actionText: null
  }
]

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("All")
  const [notifications, setNotifications] = useState(initialNotifications)

  // Fungsi untuk menandai semua sudah dibaca
  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, isUnread: false })))
  }

  // Fungsi dinamis untuk warna
  const getColorStyles = (color: string) => {
    switch (color) {
      case "red": return { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-600" }
      case "blue": return { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-600" }
      case "orange": return { border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-600" }
      default: return { border: "border-l-slate-300", bg: "bg-slate-100", text: "text-slate-600" }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Your latest alerts, insights, and system updates.</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-slate-600 bg-white">
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

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notif) => {
          const colors = getColorStyles(notif.color)
          const Icon = notif.icon

          return (
            <div 
              key={notif.id} 
              className={`relative flex items-start gap-4 p-5 bg-white border border-slate-200 shadow-sm rounded-r-xl rounded-l-sm border-l-4 ${colors.border} ${notif.isUnread ? 'bg-blue-50/10' : ''}`}
            >
              {/* Unread Indicator Dot */}
              {notif.isUnread && (
                <div className="absolute top-6 left-0 -translate-x-1.5 w-2 h-2 rounded-full bg-blue-600 border border-white"></div>
              )}

              {/* Icon */}
              <div className={`p-2.5 rounded-full shrink-0 mt-0.5 ${colors.bg} ${colors.text}`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                  <h3 className={`text-sm font-bold ${notif.isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-xs text-slate-400 whitespace-nowrap font-medium">
                    {notif.time}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {notif.message}
                </p>

                {/* Badges & Actions */}
                <div className="flex items-center gap-4">
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                    {notif.type}
                  </span>
                  
                  {notif.actionText && (
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                      {notif.actionText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More Button */}
      <div className="flex justify-center pt-4 pb-10">
        <Button variant="outline" className="text-slate-600 font-medium bg-white">
          Load Older Notifications
        </Button>
      </div>

    </div>
  )
}