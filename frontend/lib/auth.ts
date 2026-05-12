export type AuthRole = "admin" | "user"

export function setAuth(token: string, role: AuthRole) {
  localStorage.setItem("token", token)
  localStorage.setItem("role", role)
}

export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
}

export function getRole(): AuthRole | null {
  const role = localStorage.getItem("role")
  if (role === "admin" || role === "user") return role
  return null
}

export function isAuthed(): boolean {
  return !!localStorage.getItem("token")
}
