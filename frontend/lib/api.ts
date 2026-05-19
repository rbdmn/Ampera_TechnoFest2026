const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const headers = new Headers(options?.headers)

  // If body is FormData, DON'T set Content-Type (browser will set multipart boundary).
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData
  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")

  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  return res
}

// --- Users: Notifications / Feedback / Profile ---
export type AlertType = "usage_warning" | "limit_exceeded" | "anomaly"

export type AlertOut = {
  alert_id: string
  room_id: string
  alert_type: AlertType
  message: string
  triggered_at: string
  is_read: boolean
}

export async function getUserNotifications(params: {
  email?: string
  type?: "alert" | "insight" | "system" | "all"
  unread_only?: boolean
  page?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params.email) qs.set("email", params.email)
  if (params.type) qs.set("type", params.type)
  if (params.unread_only) qs.set("unread_only", "true")
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))

  const res = await apiFetch(`/alerts/notifications?${qs.toString()}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_load_notifications")
  return json as { data: AlertOut[]; meta: { total_items: number; unread_count: number; current_page: number } }
}

export async function markAllNotificationsRead(email?: string) {
  const qs = new URLSearchParams()
  if (email) qs.set("email", email)
  const res = await apiFetch(`/alerts/notifications/mark-all-read?${qs.toString()}`, { method: "POST" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_mark_all_read")
  return json as { updated: number }
}

export async function markNotificationRead(alertId: string) {
  const res = await apiFetch(`/alerts/notifications/${encodeURIComponent(alertId)}/read`, { method: "POST" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_mark_read")
  return json as { alert_id: string; is_read: boolean }
}

export async function getAdminFeedback(params: { email?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params.email) qs.set("email", params.email)
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))

  const res = await apiFetch(`/alerts/feedback?${qs.toString()}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_load_feedback")
  return json as { data: AlertOut[]; meta: { total_items: number; current_page: number } }
}

export async function uploadProfilePhoto(email: string, file: File) {
  const form = new FormData()
  form.append("file", file)

  const qs = new URLSearchParams({ email })

  const res = await apiFetch(`/auth/me/photo?${qs.toString()}`, {
    method: "POST",
    body: form,
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_upload_photo")
  return json as { profile_photo_url: string }
}

export type ProfileResponse = {
  user_id: string
  email: string
  role: "admin" | "user"
  full_name: string | null
  room_id: string | null
  profile_photo_url: string | null
}

export async function getProfile(email: string) {
  const qs = new URLSearchParams({ email })
  const res = await apiFetch(`/auth/me?${qs.toString()}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_load_profile")
  return json as ProfileResponse
}

export async function updateProfile(email: string, payload: { full_name?: string | null }) {
  const qs = new URLSearchParams({ email })
  const res = await apiFetch(`/auth/me?${qs.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_update_profile")
  return json as ProfileResponse
}

export async function changePassword(email: string, payload: { current_password: string; new_password: string; confirm_new_password: string }) {
  const qs = new URLSearchParams({ email })
  const res = await apiFetch(`/auth/me/change-password?${qs.toString()}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_change_password")
  return json as { status: string }
}
