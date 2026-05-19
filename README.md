# ⚡ AMPERA AI · AGENTIC ENERGY PLATFORM

> Hemat energi, tagihan adil, konflik kos berkurang.
>
> Ampera AI hadir sebagai AI agent untuk membaca pola listrik, memberi insight proaktif, dan mengirim notifikasi saat pemakaian mulai tidak sehat.

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-111111?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://python.langchain.com/)
[![Ollama](https://img.shields.io/badge/Ollama-FF6A3D?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)

---

## Ringkasan

Ampera AI adalah platform manajemen energi berbasis AI Agent otonom untuk hunian bersama seperti kos dan rusunawa. Sistem ini membantu pengelola dan penghuni memantau konsumsi listrik per kamar, membagi tagihan lebih transparan, mendeteksi perilaku boros, dan mengirim peringatan otomatis sebelum pemakaian melewati batas.

---

## Fitur Utama

| Fitur | Fungsi |
|---|---|
| Autonomous Reasoning Loop | Agent membaca data konsumsi, menganalisis pola dengan `Pandas`, lalu menentukan apakah perlu alert, laporan, atau insight. |
| Hybrid Ollama Configuration | Default lokal memakai `OLLAMA_BASE_URL=http://localhost:11434` dan `OLLAMA_MODEL=llama3`, dengan fallback environment yang aman. |
| Background Automation Scheduler | Scheduler backend berjalan otomatis untuk cek threshold dan memicu aksi tanpa intervensi manual. |
| Transparent Billing Insight | Laporan harian, bulanan, dan tahunan dirapikan dalam format markdown yang mudah dibaca. |
| Fair Room Comparison | AI membedakan konsumsi total dan konsumsi per penghuni agar evaluasi kamar lebih adil. |

---

## Arsitektur Teknis

```text
ampera-ai/
├─ backend/
│  ├─ app/
│  │  ├─ api/           # REST API, chat, agent, billing, alert
│  │  ├─ agent/         # reasoning loop, prompts, tools, scheduler
│  │  ├─ db/            # model SQLAlchemy dan koneksi PostgreSQL
│  │  └─ services/      # service layer untuk alert, konsumsi, billing
│  ├─ data/             # seeding dan data demo
│  └─ requirements.txt
├─ frontend/
│  ├─ app/              # Next.js app router
│  ├─ components/       # UI, chat markdown, dashboard widgets
│  ├─ lib/              # helper API/auth
│  └─ public/           # logo dan aset visual
├─ data/                # CSV dataset dan preprocessing
└─ docs/                # system overview, setup, struktur, AI notes
```

### Alur Data

```text
PostgreSQL
  → LangChain tools (`query_consumption`, `analyze_pattern`, `calculate_bill`, `send_notification`)
  → Agent reasoning loop
  → Output chat / laporan / alert
  → Next.js dashboard
```

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind, Recharts |
| Backend | FastAPI, Python, Pydantic Settings |
| Agentic AI | LangChain, Ollama |
| Database | PostgreSQL + SQLAlchemy |
| Data Processing | Pandas |

---

## Panduan

| Topik | Link |
|---|---|
| Setup Lokal | [docs/setup-local.md](docs/setup-local.md) |
| Setup Deployment | [docs/setup-deployment.md](docs/setup-deployment.md) |
| System Overview | [docs/system_overview.md](docs/system_overview.md) |

---

Ampera AI dibangun untuk satu tujuan: membuat pembagian listrik di hunian bersama lebih transparan, lebih otomatis, dan lebih sulit memicu konflik sosial.
