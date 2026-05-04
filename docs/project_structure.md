# DayaRukun AI — Project Structure

> Monorepo sederhana · FastAPI + Next.js · Dipisah folder per concern

---

## Struktur Folder Root

```
dayarukun-ai/
├── backend/                  ← FastAPI + AI Agent (A & B)
├── frontend/                 ← Next.js (C)
├── data/                     ← Dataset & seed scripts (B)
├── docs/                     ← Dokumentasi tim
│   ├── system_overview.md
│   ├── frontend_pages.md
│   └── team_plan.md
├── .env.example
├── docker-compose.yml        ← opsional, untuk jalankan semua sekaligus
└── README.md
```

---

## Backend

```
backend/
├── app/
│   ├── main.py               ← Entry point FastAPI, register semua router
│   ├── config.py             ← Load .env (DB URL, secret key, tarif listrik)
│   │
│   ├── api/                  ← Semua REST endpoint (tanggung jawab B)
│   │   ├── __init__.py
│   │   ├── auth.py           ← POST /auth/login, POST /auth/logout
│   │   ├── rooms.py          ← GET /rooms, GET /rooms/{id}
│   │   ├── consumption.py    ← GET /consumption/summary, /latest, /rooms/{id}
│   │   ├── billing.py        ← GET /billing/{month}, POST /billing/generate
│   │   ├── alerts.py         ← GET /alerts, PATCH /alerts/{id}/read
│   │   └── agent.py          ← POST /agent/chat, POST /agent/run (tanggung jawab A)
│   │
│   ├── agent/                ← AI Agent LangChain (tanggung jawab A)
│   │   ├── __init__.py
│   │   ├── agent.py          ← Inisialisasi LangChain agent + loop utama
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── query_consumption.py   ← Tool: ambil data dari DB
│   │   │   ├── analyze_pattern.py     ← Tool: deteksi anomali (Pandas)
│   │   │   ├── calculate_bill.py      ← Tool: hitung tagihan per kamar
│   │   │   └── send_notification.py   ← Tool: tulis alert ke DB
│   │   ├── scheduler.py      ← APScheduler: jalankan agent loop tiap 1 jam
│   │   └── prompts.py        ← System prompt untuk agent & chatbot
│   │
│   ├── db/                   ← Database (tanggung jawab B)
│   │   ├── __init__.py
│   │   ├── database.py       ← Koneksi SQLAlchemy + session
│   │   ├── models.py         ← ORM models (Room, User, ConsumptionLog, dll)
│   │   └── init_db.py        ← Create tables saat pertama jalan
│   │
│   ├── schemas/              ← Pydantic schemas untuk request/response (B)
│   │   ├── __init__.py
│   │   ├── room.py
│   │   ├── consumption.py
│   │   ├── billing.py
│   │   ├── alert.py
│   │   └── auth.py
│   │
│   ├── services/             ← Business logic, dipakai oleh api/ dan agent/ (A & B)
│   │   ├── __init__.py
│   │   ├── consumption_service.py    ← Agregasi & query data konsumsi
│   │   ├── billing_service.py        ← Logika hitung tagihan
│   │   └── alert_service.py          ← Logika kirim & simpan alert
│   │
│   └── middleware/
│       └── auth.py           ← JWT middleware, cek role (B)
│
├── tests/
│   ├── test_api.py
│   └── test_agent.py
│
├── requirements.txt
└── .env                      ← (tidak di-commit, lihat .env.example)
```

### File-file Kunci Backend

**`app/main.py`**
```python
from fastapi import FastAPI
from app.api import auth, rooms, consumption, billing, alerts, agent
from app.agent.scheduler import start_scheduler

app = FastAPI(title="DayaRukun AI")

app.include_router(auth.router, prefix="/auth")
app.include_router(rooms.router, prefix="/rooms")
app.include_router(consumption.router, prefix="/consumption")
app.include_router(billing.router, prefix="/billing")
app.include_router(alerts.router, prefix="/alerts")
app.include_router(agent.router, prefix="/agent")

@app.on_event("startup")
async def startup():
    start_scheduler()  # jalankan agent loop saat server start
```

**`app/db/models.py`**
```python
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey
from app.db.database import Base

class Room(Base):
    __tablename__ = "rooms"
    room_id      = Column(String, primary_key=True)   # "R-101"
    floor        = Column(Integer)
    tenant_name  = Column(String)
    tenant_email = Column(String)
    limit_kwh    = Column(Float, default=50.0)
    tariff       = Column(Float, default=1444.70)

class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"
    log_id           = Column(String, primary_key=True)
    room_id          = Column(String, ForeignKey("rooms.room_id"))
    timestamp        = Column(DateTime)
    kwh_used         = Column(Float)
    cumulative_month = Column(Float)

class BillingRecord(Base):
    __tablename__ = "billing_records"
    billing_id   = Column(String, primary_key=True)
    room_id      = Column(String, ForeignKey("rooms.room_id"))
    period       = Column(String)   # "2024-05"
    total_kwh    = Column(Float)
    total_idr    = Column(Float)
    status       = Column(String, default="generated")

class AlertHistory(Base):
    __tablename__ = "alert_history"
    alert_id     = Column(String, primary_key=True)
    room_id      = Column(String, ForeignKey("rooms.room_id"))
    alert_type   = Column(String)   # "usage_warning" | "limit_exceeded" | "anomaly"
    message      = Column(String)
    triggered_at = Column(DateTime)
    is_read      = Column(Boolean, default=False)
```

**`app/agent/agent.py`**
```python
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from app.agent.tools import all_tools
from app.agent.prompts import AGENT_SYSTEM_PROMPT

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def get_agent() -> AgentExecutor:
    agent = create_openai_tools_agent(llm, all_tools, AGENT_SYSTEM_PROMPT)
    return AgentExecutor(agent=agent, tools=all_tools, verbose=True)

async def run_agent_loop():
    """Dipanggil scheduler tiap 1 jam"""
    executor = get_agent()
    await executor.ainvoke({
        "input": "Periksa semua kamar. Deteksi anomali. Kirim notifikasi jika perlu."
    })
```

**`app/agent/scheduler.py`**
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.agent.agent import run_agent_loop

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(run_agent_loop, "interval", hours=1)
    scheduler.start()
```

---

## Frontend

```
frontend/
├── app/                          ← Next.js App Router
│   ├── layout.tsx                ← Root layout
│   ├── page.tsx                  ← Redirect ke /login
│   ├── login/
│   │   └── page.tsx              ← Halaman login
│   │
│   ├── admin/
│   │   ├── layout.tsx            ← Sidebar + topbar admin
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── rooms/
│   │   │   ├── page.tsx          ← Daftar semua kamar
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Detail 1 kamar
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   ├── tenants/
│   │   │   └── page.tsx
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   └── chat/
│   │       └── page.tsx          ← Chatbot admin
│   │
│   └── user/
│       ├── layout.tsx            ← Sidebar + topbar user
│       ├── dashboard/
│       │   └── page.tsx
│       ├── history/
│       │   └── page.tsx
│       └── notifications/
│           └── page.tsx
│
├── components/
│   ├── ui/                       ← Komponen dasar reusable
│   │   ├── MetricCard.tsx        ← Card angka ringkas
│   │   ├── StatusBadge.tsx       ← Pill Normal / Peringatan / Melebihi
│   │   ├── GaugeBar.tsx          ← Progress bar dengan warna dinamis
│   │   └── AlertItem.tsx         ← Satu baris notifikasi/alert
│   │
│   ├── charts/                   ← Wrapper Recharts
│   │   ├── ConsumptionBarChart.tsx
│   │   ├── ConsumptionAreaChart.tsx
│   │   └── UsageGaugeCircle.tsx
│   │
│   ├── admin/                    ← Komponen khusus halaman admin
│   │   ├── RoomTable.tsx
│   │   ├── BillingTable.tsx
│   │   ├── AgentStatusBadge.tsx
│   │   └── ChatWindow.tsx        ← Komponen chatbot
│   │
│   └── user/                    ← Komponen khusus halaman user
│       ├── MonthlyGauge.tsx
│       └── TipsCard.tsx
│
├── lib/
│   ├── api.ts                    ← Fungsi fetch ke backend (base URL, headers)
│   ├── auth.ts                   ← Simpan/baca JWT dari localStorage
│   └── utils.ts                  ← Format angka, tanggal, IDR
│
├── hooks/
│   ├── useConsumption.ts         ← Fetch + polling data konsumsi
│   ├── useAlerts.ts              ← Fetch alert terbaru
│   └── useChat.ts                ← State management chatbot
│
├── types/
│   └── index.ts                  ← Type definitions (Room, Alert, Billing, dll)
│
├── public/
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── .env.local                    ← NEXT_PUBLIC_API_URL=http://localhost:8000
```

### File-file Kunci Frontend

**`lib/api.ts`**
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("token")
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
}
```

**`hooks/useConsumption.ts`**
```typescript
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

export function useConsumption(roomId?: string) {
  const [data, setData] = useState(null)

  useEffect(() => {
    const path = roomId ? `/consumption/rooms/${roomId}` : "/consumption/summary"
    const fetch = () => apiFetch(path).then(r => r.json()).then(setData)

    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000) // polling 5 menit
    return () => clearInterval(interval)
  }, [roomId])

  return data
}
```

**`hooks/useChat.ts`**
```typescript
import { useState } from "react"
import { apiFetch } from "@/lib/api"

type Message = { role: "user" | "assistant"; content: string }

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  async function send(input: string) {
    setMessages(prev => [...prev, { role: "user", content: input }])
    setLoading(true)
    const res = await apiFetch("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: "assistant", content: data.reply }])
    setLoading(false)
  }

  return { messages, loading, send }
}
```

---

## Data & Seed

```
data/
├── raw/
│   └── household_data.csv        ← Dataset Open Power System Data
├── seed.py                       ← Script seed data ke PostgreSQL
└── preprocess.py                 ← Transformasi CSV → format konsumsi per kamar
```

**`data/seed.py`** (ringkasan logika)
```python
import pandas as pd
from sqlalchemy.orm import Session

df = pd.read_csv("raw/household_data.csv", index_col=0, parse_dates=True)
df_hourly = df.resample("1H").mean()

# Petakan 10 kolom pertama → 10 kamar
rooms = [f"R-{101+i}" for i in range(10)]
for i, room_id in enumerate(rooms):
    series = df_hourly.iloc[:, i]
    for ts, kwh in series.items():
        db.add(ConsumptionLog(room_id=room_id, timestamp=ts, kwh_used=kwh, ...))
db.commit()
```

---

## Environment Variables

**`.env.example`**
```
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/dayarukun
SECRET_KEY=your-jwt-secret
OPENAI_API_KEY=sk-...

# Tarif
TARIFF_PER_KWH=1444.70
DEFAULT_LIMIT_KWH=50.0

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Cara Jalankan (Development)

```bash
# 1. Database
psql -U postgres -c "CREATE DATABASE dayarukun"

# 2. Backend
cd backend
pip install -r requirements.txt
python -m app.db.init_db       # buat tabel
python data/seed.py            # isi data
uvicorn app.main:app --reload  # jalankan server → localhost:8000

# 3. Frontend
cd frontend
npm install
npm run dev                    # → localhost:3000
```

---

## Ringkasan Kepemilikan File

| Folder/File | Siapa |
|---|---|
| `backend/app/agent/` | A |
| `backend/app/api/agent.py` | A |
| `backend/app/api/` (selain agent) | B |
| `backend/app/db/` | B |
| `backend/app/schemas/` | B |
| `backend/app/services/` | A & B |
| `backend/app/middleware/` | B |
| `data/` | B |
| `frontend/` semua | C |

---

*DayaRukun AI · Project Structure · v1.0*
