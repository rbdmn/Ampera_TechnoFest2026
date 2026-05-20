export type AuthRole = "admin" | "user"

function getStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

export function setAuth(token: string, role: AuthRole, email: string) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem("token", token)
  storage.setItem("role", role)
  storage.setItem("email", email)
}

export function clearAuth() {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem("token")
  storage.removeItem("role")
  storage.removeItem("email")
}

export function getEmail(): string | null {
  return getStorage()?.getItem("email") ?? null
}

export function getRole(): AuthRole | null {
  const role = getStorage()?.getItem("role")
  if (role === "admin" || role === "user") return role
  return null
}

export function isAuthed(): boolean {
  return !!getStorage()?.getItem("token")
}
