# Analytics Dashboard Guide

## Overview

Analytics Screen dalam VINDCollab adalah dashboard komprehensif untuk memantau performa dan progress event/project. Setiap diagram dirancang untuk memberikan insights mendalam tentang kondisi project.

---

## 🎯 Main Features

### 1. **Overall Completion Circle**
**Apa itu?**
- Circular progress indicator yang menampilkan persentase keseluruhan tasks yang sudah selesai

**Cara membacanya:**
- Persentase di tengah = berapa % project sudah complete
- Warna indikator:
  - 🟢 **Hijau** (70%+): Project berjalan sangat baik
  - 🟡 **Kuning** (40-70%): Progress normal, perlu monitoring
  - 🔴 **Merah** (<40%): Progress lambat, perlu action

**Contoh:** Jika menampilkan 65% COMPLETE, berarti 65% dari semua tasks sudah selesai

---

### 2. **Time Range Filters**
**Apa itu?**
- Selector untuk memilih rentang waktu analisis

**Opsi yang tersedia:**
- **7d** = Last 7 Days (1 minggu terakhir)
- **14d** = Last 14 Days (2 minggu terakhir)
- **30d** = Last 30 Days (1 bulan terakhir) - DEFAULT
- **All** = Semua data dari awal project

**Kegunaan:** Untuk melihat trend dan performa dalam periode berbeda

---

### 3. **Risk Assessment Gauge** ⚠️
**Apa itu?**
- Gauge chart yang menunjukkan risk level project (0-100)

**Cara membacanya:**
- **Skor 0-33 (Hijau - Low Risk):**
  - ✅ Project on track
  - ✅ Tidak ada blocker signifikan
  - 💡 Keep maintaining momentum

- **Skor 34-66 (Kuning - Moderate Risk):**
  - ⚠️ Ada beberapa team yang slow
  - ⚠️ Ada beberapa blocker tasks
  - 💡 Perlu improve velocity dan clear blockers

- **Skor 67-100 (Merah - High Risk):**
  - 🚨 Critical issues detected
  - 🚨 Multiple teams delayed
  - 💡 Urgent action needed, consider timeline adjustment

**Cara interaksi:**
- **TAP pada gauge** untuk melihat detail:
  - Risk score breakdown
  - Jumlah stagnant tasks
  - Jumlah teams yang delayed
  - Recommendations untuk improvement

**Contoh:** Risk Score 72/100 (HIGH RISK) = ada masalah serius yang perlu ditangani

---

### 4. **Projected Completion** 🚩
**Apa itu?**
- Estimasi kapan project akan selesai berdasarkan velocity saat ini

**Informasi yang ditampilkan:**
- Days Late: Berapa hari project akan terlambat dari deadline
- Confidence: Tingkat kepercayaan prediksi (0-100%)

**Contoh:**
- "Projected: 5 days late" = Jika velocity tetap sama, project akan selesai 5 hari lebih lambat dari deadline
- "Confidence: 78%" = 78% yakin dengan prediksi ini

---

### 5. **Task Velocity Chart** 📊
**Apa itu?**
- Bar chart yang menunjukkan berapa banyak tasks yang selesai per hari

**Cara membacanya:**
- Setiap bar = 1 hari
- Tinggi bar = jumlah tasks yang selesai hari itu
- Warna:
  - 🔵 **Biru** = Velocity tinggi (≥70% dari maksimal)
  - 🟠 **Orange** = Velocity rendah (<70%)

**Cara interaksi:**
- **TAP pada bar** untuk melihat detail hari itu:
  - Berapa tasks yang completed
  - Productivity level (High/Medium/Low)
  - Tips untuk meningkatkan velocity

**Contoh:**
- Bar di hari Senin tinggi = banyak tasks selesai Senin
- Bar di hari Rabu pendek = sedikit tasks selesai Rabu

**Insights:**
- Trend naik = team getting faster ✅
- Trend turun = team getting slower ⚠️
- Fluktuasi besar = inconsistent productivity

---

### 6. **Completion Progress Line Chart** 📈
**Apa itu?**
- Line chart yang menunjukkan tren completion percentage dari waktu ke waktu

**Cara membacanya:**
- X-axis = tanggal/periode
- Y-axis = persentase completion (0-100%)
- Garis naik = progress positif ✅
- Garis turun/flat = progress stalled ⚠️

**Cara interaksi:**
- **TAP pada titik di line** untuk melihat detail:
  - Tanggal
  - Completion rate pada tanggal itu
  - Remaining work percentage

**Contoh:**
- Garis mulai 10% → 50% = 40% completion dalam periode ini
- Garis dari 50% tetap 50% = no progress / stalled

**Insights:**
- Garis konsisten naik = steady progress ✅
- Garis dengan spike naik tiba-tiba = sprint atau extra effort 🚀
- Garis flat = blocked or no work being done ⚠️

---

### 7. **Team Performance Section** 👥
**Apa itu?**
- Menampilkan average response time dari setiap team/organization

**Informasi:**
- **Org Name** = Nama team/organization
- **Response Time** = Rata-rata waktu untuk menyelesaikan tasks (dalam jam)
- **Progress Bar** = Visualisasi response time (semakin penuh = semakin lama)

**Warna Indikator:**
- 🟢 **Hijau** = Response time cepat, team on track
- 🔴 **Merah** + "Delayed" badge = Response time lambat, team is delayed

**Contoh:**
- Team A: 8h (hijau) = rata-rata 8 jam per task ✅
- Team B: 24h (merah) = rata-rata 24 jam per task ⚠️

**Insights:**
- Team dengan response time pendek = productive
- Team dengan response time panjang = perlu bantuan/resources

---

### 8. **Phase Progress Section** 🎯
**Apa itu?**
- Progress bar untuk setiap fase/milestone project

**Informasi:**
- Nama fase
- Persentase completion
- Visualisasi progress bar

**Warna Indikator:**
- 🟢 **Hijau** = Phase 70%+ complete
- 🟡 **Kuning** = Phase 40-70% complete
- 🔴 **Merah** = Phase <40% complete

**Contoh:**
- Phase "Backend API" = 85% (hijau) = hampir selesai
- Phase "Testing" = 30% (merah) = baru dimulai

**Insights:**
- Lihat mana phases yang behind schedule
- Focus resources ke phases yang lagging

---

### 9. **Stagnant Tasks Section** ⏸️
**Apa itu?**
- List tasks yang stuck/blocked dan tidak ada progress

**Informasi untuk setiap task:**
- **Task Title** = Nama task
- **Stuck for** = Berapa lama task stuck (dalam jam)
- **Assigned Org** = Team yang bertanggung jawab

**Warna:** Orange badge menunjukkan ini adalah task bermasalah

**Contoh:**
- "Setup Database" - Stuck for: 48h - Backend Team
- = Task setup database sudah blocked 2 hari oleh Backend Team

**Insights & Actions:**
- Prioritas tinggi = task yang stuck paling lama
- Cari tahu blocker-nya
- Escalate ke team lead untuk clear the blocker

---

## 🎨 Color Coding Guide

| Warna | Arti | Status |
|-------|------|--------|
| 🟢 Hijau | Good, On Track | ✅ Normal |
| 🟡 Kuning | Caution, Moderate Risk | ⚠️ Needs Attention |
| 🔴 Merah | Critical, High Risk | 🚨 Action Needed |
| 🔵 Biru | Info, Primary Action | ℹ️ Interactive |

---

## 💡 How to Use Analytics

### 1. **Morning Check (5 min)**
```
1. Open Analytics → Select Event
2. Check Overall Completion (did it increase?)
3. Check Risk Score (is it getting better or worse?)
4. Check Stagnant Tasks (any new blockers?)
```

### 2. **Weekly Review (15 min)**
```
1. Set Time Range to "7d"
2. Review Task Velocity trend (is it consistent?)
3. Check Team Performance (any team struggling?)
4. Review Phase Progress (are we on schedule?)
5. Identify blockers from Stagnant Tasks
```

### 3. **Sprint Planning (20 min)**
```
1. Set Time Range to "30d" for full sprint view
2. Analyze what's blocking progress
3. Check which teams need support
4. Plan next sprint based on velocity trends
5. Adjust timeline if needed based on Projected Completion
```

### 4. **Risk Mitigation**
```
If Risk Score is YELLOW:
- ✅ Check Team Performance for slow teams
- ✅ Review Stagnant Tasks and clear blockers
- ✅ Reallocate resources to slow teams

If Risk Score is RED:
- 🚨 URGENT: Check Projected Completion date
- 🚨 URGENT: Identify critical blockers in Stagnant Tasks
- 🚨 URGENT: Escalate to stakeholders if timeline needs change
```

---

## 📊 Data Interpretation Examples

### Example 1: Good Health
```
Overall Completion: 65% ↑
Risk Score: 25 (GREEN - Low Risk)
Task Velocity: Consistent bars, trending up
Completion Progress: Line steadily increasing
Team Performance: All teams <12h response time
Phase Progress: All phases 60%+ complete
Stagnant Tasks: 0-2 tasks
→ Status: ✅ PROJECT ON TRACK
```

### Example 2: Warning Signs
```
Overall Completion: 45% (stuck for 2 days)
Risk Score: 55 (YELLOW - Moderate Risk)
Task Velocity: Drops significantly last 3 days
Completion Progress: Line flattening
Team Performance: 2 teams with 24h+ response time
Phase Progress: Phase 1 at 80%, Phase 2 at only 20%
Stagnant Tasks: 5 tasks, some for 48+ hours
→ Status: ⚠️ NEEDS ATTENTION - Check blockers, support slow teams
```

### Example 3: Critical Issues
```
Overall Completion: 30% (should be 70% at this point)
Risk Score: 85 (RED - High Risk)
Task Velocity: Very low and declining
Completion Progress: Line nearly flat
Team Performance: Multiple teams with 48h+ response time
Phase Progress: Phase 1 at 40%, Phase 2 not started
Stagnant Tasks: 10+ tasks, many >72 hours stuck
Projected Completion: 20 days LATE
→ Status: 🚨 CRITICAL - Immediate action required
```

---

## ⚙️ Technical Info

### New Components Added
- `InteractiveLineChart` - Interactive line chart dengan tooltip
- `InteractiveBarChart` - Interactive bar chart dengan detail
- `InteractiveGaugeChart` - Interactive gauge dengan recommendations
- `AnalyticsModal` - Modal untuk melihat detail data
- `AnalyticsInfoCard` - Info card untuk metrics

### How to Interact
- **Tap on any diagram** = See detailed breakdown
- **Select time range** = Change analysis period
- **Close modal** = Return to main dashboard

---

## 🔧 Troubleshooting

**Q: "Belum ada analisis" message?**
- A: Click "Generate Analysis" button. Sistem akan menganalisis data event Anda.

**Q: Data terlihat tidak update?**
- A: Pull to refresh atau switch event dan switch kembali.

**Q: Angka-angka tidak masuk akal?**
- A: Pastikan event sudah memiliki tasks dan team assignments.

**Q: Bagaimana interpretasi negative trend?**
- A: Jika velocity menurun atau completion flat, ada blocker/issue yang perlu clear.

---

## 📱 Mobile Optimization

Analytics screen sudah fully optimized untuk mobile:
- ✅ Responsive charts
- ✅ Tap-friendly interactive elements
- ✅ Detailed modals untuk data
- ✅ Smooth scrolling dan animations

---

## 🎓 Best Practices

1. **Check Daily**: Paling tidak cek risk score & stagnant tasks setiap hari
2. **Set Expectations**: Share baseline metrics dengan team di awal sprint
3. **Act on Blockers**: Jangan biarkan tasks stuck lebih dari 12 jam
4. **Celebrate Progress**: Acknowledge ketika velocity meningkat atau risk berkurang
5. **Adjust Timeline**: Gunakan Projected Completion untuk realistic deadline adjustments

---

Untuk pertanyaan lebih lanjut atau report issues, hubungi tim development!
