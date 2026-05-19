export type AuthRole = "admin" | "user"

export function setAuth(token: string, role: AuthRole, email: string) {
  localStorage.setItem("token", token)
  localStorage.setItem("role", role)
  localStorage.setItem("email", email)
}

export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
  localStorage.removeItem("email")
}

export function getEmail(): string | null {
  return localStorage.getItem("email")
}

export function getRole(): AuthRole | null {
  const role = localStorage.getItem("role")
  if (role === "admin" || role === "user") return role
  return null
}

export function isAuthed(): boolean {
  return !!localStorage.getItem("token")
}
