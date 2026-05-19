import { apiFetch } from "./api"
import { getEmail } from "./auth"

export type UserProfile = {
  user_id: string
  email: string
  full_name: string | null
  role: "admin" | "user"
  room_id: string | null
  profile_photo_url?: string | null
}

export async function getMyProfile() {
  const email = getEmail() ?? undefined
  if (!email) throw new Error("missing_email_in_storage")

  const qs = new URLSearchParams()
  qs.set("email", email)

  const res = await apiFetch(`/auth/me?${qs.toString()}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? "failed_to_load_profile")

  return {
    user_id: json?.user_id ?? null,
    email: json?.email ?? null,
    full_name: json?.full_name ?? null,
    role: json?.role ?? "user",
    room_id: json?.room_id ?? null,
    profile_photo_url: json?.profile_photo_url ?? null,
  } as UserProfile
}
