# VINDCollab 🤝

> **Campus Event Partnership Platform** — Aplikasi mobile kolaborasi event kampus berbasis AI agentic, dibangun dengan React Native (Expo) dan Convex.

---

## 👥 Tim Pengembang

| Nama | Role |
|------|------|
| **Imanuel Palenewen** | Leader & Dev 1 |
| **Daniel Raturandang** | Dev 2 |
| **Vanessa Sahetapy** | Dev 3 |

---

## 📱 Deskripsi Proyek

VINDCollab adalah platform mobile untuk memfasilitasi **kolaborasi antar organisasi mahasiswa** dalam menyelenggarakan event kampus. Aplikasi ini memungkinkan organisasi saling menemukan partner yang cocok, bernegosiasi peran dan terms, mengelola task bersama, dan mengevaluasi performa setelah event selesai, semua dibantu oleh fitur AI agentic.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔍 **Event Discovery** | Temukan event terbuka dari organisasi lain |
| 🤖 **AI Partner Recommender** | Rekomendasi partner terbaik berbasis capabilities matching |
| 📋 **AI Task Breakdown** | Generate Work Breakdown Structure otomatis untuk event |
| 📊 **AI Progress Monitor** | Pantau risiko dan velocity tim secara real-time |
| 📄 **AI Post-Event Report** | Laporan evaluasi otomatis setelah event selesai |
| 💬 **Real-time Chat** | Chat room per event dan per task |
| 🤝 **Invitation & Negotiation** | Kirim undangan, counter-propose terms, dan track status |
| 📈 **Analytics Dashboard** | Visualisasi completion rate, velocity, dan phase progress |
| 🔔 **Org Profile** | Kelola profil organisasi, capabilities, dan invite code |

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Mobile Framework** | React Native + Expo (Expo Go) |
| **Routing** | Expo Router (file-based) |
| **Backend & Database** | Convex (serverless, real-time) |
| **Authentication** | `@convex-dev/auth` (password-based) |
| **AI / LLM** | Mistral AI API (`mistral-small-latest`, cascade fallback) |
| **Gesture & Animation** | React Native Gesture Handler + Reanimated |
| **Icons** | Expo Vector Icons (Ionicons) + Lucide React Native |
| **Charts** | React Native SVG (custom chart components) |
| **Secure Storage** | Expo SecureStore (session token persistence) |

---

## 🤖 AI Agentic Flow (Mistral AI)

VINDCollab menggunakan pola **Perceive → Reason → Act** untuk setiap fitur AI:

```
┌─────────────────────────────────────────────────────┐
│                  PERCEIVE (Query)                    │
│  Kumpulkan data: event, tasks, partnerships, org     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  REASON (Mistral AI)                 │
│  Model Cascade: mistral-small-latest                 │
│               → open-mistral-nemo (fallback)         │
│               → ministral-8b-latest (last resort)   │
│  Jika semua rate-limited → local heuristic fallback  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  ACT (Mutation)                      │
│  Simpan hasil ke database + kembalikan ke UI         │
└─────────────────────────────────────────────────────┘
```

### 4 Agen AI yang Tersedia

| Agen | File | Fungsi |
|------|------|--------|
| **Partner Recommender** | `convex/ai/partnerRecommender.ts` | Ranking organisasi kandidat berdasarkan kecocokan capabilities dengan kebutuhan event |
| **Task Breakdown** | `convex/ai/taskBreakdown.ts` | Generate Work Breakdown Structure (WBS) dengan fase dan task yang di-assign ke partner |
| **Progress Monitor** | `convex/ai/progressMonitor.ts` | Analisis risiko, velocity, dan deteksi task stagnant — berjalan otomatis setiap 6 jam via cron |
| **Post-Event Report** | `convex/ai/postEventReport.ts` | Generate laporan evaluasi akhir setelah event selesai |

---

## 🗺 System Flow

```
[Register/Login]
      │
      ▼
[Onboarding — Setup Org Profile]
      │
      ▼
[Home Dashboard]
  ├── My Events (event yang saya host)
  ├── Discover Events (event org lain yang OPEN)
  └── Partner Events (event yang saya ikuti sebagai partner)
      │
      ▼ (Buat atau klik event)
[Event Detail]
  ├── [AI] Recommend Partners → Kirim Invitation
  ├── Invitation Inbox → Terima/Tolak/Counter-Propose
  └── [AI] Generate Task Breakdown (setelah partner accepted)
      │
      ▼ (Event sedang berjalan)
[Task Management — Kanban Board]
  ├── TODO → IN_PROGRESS → DONE
  └── [AI] Progress Monitor (auto setiap 6 jam)
      │
      ▼ (Event selesai)
[AI Post-Event Report]
  └── Analytics Dashboard (completion, velocity, risk score)
```

---

## 🚀 Cara Menjalankan

### Prerequisites

- Node.js 18+
- npm / npx
- Akun [Convex](https://convex.dev)
- Akun [Mistral AI](https://console.mistral.ai) (untuk API key)
- Expo Go app di smartphone (Android/iOS)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Convex

```bash
npx convex dev
```

Ini akan membuat project Convex baru dan meng-generate file `convex/_generated/`.

### 3. Konfigurasi Environment Variables

Buat file `.env.local` di root project:

```env
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

Di **Convex Dashboard → Settings → Environment Variables**, tambahkan:

```
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 4. Jalankan Aplikasi

```bash
npm start
```

Scan QR code yang muncul di terminal menggunakan aplikasi **Expo Go** di smartphone.

### 5. (Opsional) Seed Data Demo

Untuk mengisi data organisasi dummy Universitas Klabat, jalankan dari Convex Dashboard:

```
Functions → seed → seedUnklab → Run
```

### 🔑 Cara Login Akun Demo (Seeded)

Jika Anda ingin login sebagai salah satu organisasi yang sudah di-seed (misal: `uvics@unklab.edu`):

1. Pilih **Sign Up** di aplikasi.
2. Masukkan email yang sesuai (misal: `uvics@unklab.edu`).
3. Masukkan **password apa saja** yang Anda inginkan.
4. Sistem akan mendeteksi email tersebut dan otomatis menghubungkan akun baru Anda dengan data organisasi yang sudah ada di database.
5. Anda akan langsung masuk ke Dashboard organisasi tersebut.

---

## 📁 Struktur Folder

```
vind-collab/
├── app/                    # Layar aplikasi (Expo Router)
│   ├── (auth)/             # Login, Register, Onboarding
│   ├── (tabs)/             # Bottom tab screens (Home, Tasks, Chat, Report, Analytics, More)
│   ├── chat/               # Chat room screen
│   ├── events/             # Event detail, create, partners
│   ├── invitations/        # Inbox, send, detail, counter-propose
│   └── org-profile.tsx     # Profil organisasi
├── components/             # Reusable components
│   ├── charts/             # Chart & analytics components
│   ├── chat/               # Chat UI components
│   ├── events/             # Event card
│   ├── invitations/        # Negotiation history
│   ├── monitor/            # Progress monitor cards
│   ├── partners/           # Partner recommend card
│   ├── tasks/              # Kanban, task cards, modals
│   └── ui/                 # Base components (Button, Input, Badge, Card)
├── constants/
│   └── Colors.ts           # Design system tokens (dark theme)
├── convex/                 # Backend (Convex functions)
│   ├── ai/                 # AI agentic modules
│   │   ├── _mistralClient.ts       # Shared Mistral cascade helper
│   │   ├── partnerRecommender.ts   # AI partner recommendation
│   │   ├── taskBreakdown.ts        # AI task generation
│   │   ├── progressMonitor.ts      # AI progress analysis
│   │   └── postEventReport.ts      # AI post-event evaluation
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Auth configuration
│   ├── events.ts           # Event CRUD
│   ├── invitations.ts      # Invitation & negotiation logic
│   ├── tasks.ts            # Task management
│   ├── chat.ts             # Chat rooms & messages
│   ├── organizations.ts    # Org profile management
│   ├── partnerships.ts     # Partnership queries
│   ├── reports.ts          # Report queries
│   ├── crons.ts            # Scheduled jobs (progress monitor setiap 6 jam)
│   └── seed.ts             # Data seeder untuk demo
└── hooks/
    └── useAuth.ts          # Auth state hook (single source of truth)
```
