const BASE = process.env.NEXT_PUBLIC_API_URL

export async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const headers = new Headers(options?.headers)
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  return res
}
