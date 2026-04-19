# 🧪 VINDCollab Invitation System - Testing Guide

## Verifikasi File Sudah Ada ✓

Semua file sudah dibuat:
```
✓ convex/invitations.ts          - 7 backend functions
✓ convex/schema.ts               - 2 tables baru (invitations, negotiationHistory)
✓ app/invitations/send.tsx       - SendInvitationScreen
✓ app/invitations/[id].tsx       - InvitationDetailScreen  
✓ app/invitations/counter-propose.tsx - CounterProposeScreen
✓ app/invitations/inbox.tsx      - InvitationInboxScreen
✓ components/invitations/NegotiationHistoryView.tsx - Timeline component
✓ app/_layout.tsx                - Routes sudah ditambah
✓ app/events/partners.tsx        - Invite button sudah di-hook
```

---

## 🧑‍💻 Cara Testing (Step by Step)

### Step 1: Start Development Server
```bash
cd c:/Users/ASUS/daniel/mad-final/VINDCollab
npm run dev    # atau npm start
```
Tunggu sampai:
- Expo bundler selesai
- Emulator/device terhubung
- App siap di-test

### Step 2: Test Flow - Bagian 1: Send Invitation

**Scenario:** Host ingin mengirim invitation ke partner

1. **Open app** → Login dengan akun Host
2. **Navigasi:** Home → Events → Select Event → Partners Tab
3. **Klik "Invite" button** di salah satu recommendation card
4. **Expected:** Masuk ke SendInvitationScreen dengan:
   - ✓ Event title ditampilkan di header
   - ✓ Form fields kosong dan ready
   - ✓ Back button berfungsi

5. **Isi Form:**
   - Proposed Role: Pilih salah satu (e.g., "Sponsor")
   - Resource Contribution: "Handle catering untuk 500 orang"
   - Revenue Sharing: Toggle ON → isi 20% dan "Bank Transfer"
   - Deadline: Pilih 48 hours
   - Personal Message: "Mari berkolaborasi untuk event sukses"

6. **Klik "Send Invitation"**
   - ✓ Loading state muncul
   - ✓ Success alert muncul
   - ✓ Auto-navigate kembali

**What's Happening Behind Scenes:**
- Backend create `invitations` record dengan status PENDING
- Backend create `negotiationHistory` record untuk round 1
- Partner akan menerima notifikasi (nanti akan diimplementasi)

---

### Step 3: Test Flow - Bagian 2: Receive & Review Invitation

**Scenario:** Partner menerima invitation dan review terms

1. **Switch Account:** Login dengan akun Partner
2. **Navigasi:** dari Settings / More menu → "Invitations" (sekarang ada di inbox)
3. **Expected:** InvitationInboxScreen muncul dengan:
   - ✓ Tab "Received" aktif (jumlah invitations yang diterima)
   - ✓ List menampilkan invitation dari Host
   - ✓ Setiap item menunjukkan:
     - Event title
     - Host org name
     - Proposed role badge
     - Status "PENDING"

4. **Tap invitation item**
   - ✓ Masuk ke InvitationDetailScreen
   - ✓ Tampil informasi lengkap:
     - Status badge "PENDING"
     - Event details
     - From/To organization
     - **Terms:**
       - Role: "Sponsor"
       - Resources: "Handle catering untuk 500 orang"
       - Revenue: "20% (Bank Transfer)"
     - Personal message
     - Negotiation Status: "Round 1 of 5"

---

### Step 4: Test Flow - Bagian 3: Accept / Decline

**Test Accept:**
1. Klik "Accept" button di InvitationDetailScreen
2. **Expected:**
   - ✓ Loading state muncul
   - ✓ Success message: "Invitation accepted!"
   - ✓ Auto-navigate back
   - ✓ Status di database berubah ke "ACCEPTED"
   - ✓ Chat room otomatis dibuat
   - ✓ Partnership record dibuat

**Test Decline:**
1. Kembali ke InvitationDetailScreen (buat invitation baru untuk test)
2. Klik "Decline" button
3. **Expected:**
   - ✓ Modal muncul: "Why are you declining?"
   - ✓ Input field untuk decline reason
   - ✓ Isi reason: "Partner tidak cocok dengan timeline kami"
   - ✓ Klik "Decline"
   - ✓ Status berubah ke "DECLINED"
   - ✓ Decline reason tersimpan di database

---

### Step 5: Test Flow - Bagian 4: Counter-Propose (Negosiasi)

**Scenario:** Partner ingin counter-propose terms

1. **Buat invitation baru** dari Host (send invitation baru)
2. **Switch ke Partner account** → buka invitation
3. Klik "Counter-Propose" button
4. **Expected:** CounterProposeScreen muncul dengan:
   - ✓ Warning: "Round 1 of 5"
   - ✓ Current terms ditampilkan
   - ✓ Form fields ready untuk perubahan

5. **Ubah Terms:**
   - Role: Ubah ke "Co-host"
   - Resources: "Handle venue setup + catering untuk 300 orang"
   - Revenue: Ubah ke 25% + "Quarterly Payout"
   - Notes: "Dapat reduce pax, perlu flexible budget"

6. Klik "Send Counter-Proposal"
   - ✓ Loading state
   - ✓ Success message
   - ✓ Round counter di database naik ke 2
   - ✓ Status berubah ke "NEGOTIATING"

7. **Back Host Account** → buka invitation yang sama
   - ✓ Terms sudah update dengan counter-proposal
   - ✓ Round menunjukkan "Round 2 of 5"
   - ✓ Negotiation History menampilkan round 1 dan round 2

---

### Step 6: Test Flow - Bagian 5: Maximum Rounds (Auto-Expire)

**Scenario:** Negosiasi sudah 5 rounds, harus expired

**Cara:**
1. Counter-propose 5 kali berturut-turut
2. Setiap kali, round counter naik: 1→2→3→4→5
3. Pada round ke-5, tombol "Counter-Propose" disabled dengan text "Max Rounds Reached"
4. Jika force counter-propose: **error message** "Negotiation has exceeded maximum 5 rounds"
5. Status otomatis berubah ke "EXPIRED"

---

### Step 7: View Negotiation History

**Di InvitationDetailScreen:**
1. Scroll down ke "Negotiation History"
2. **Expected:** Timeline dengan semua rounds:
   - Round 1: Initial proposal dari Host
   - Round 2: Counter dari Partner
   - Round 3: Counter dari Host
   - dst...

3. Setiap timeline item menampilkan:
   - ✓ Round number
   - ✓ Timestamp
   - ✓ Who proposed (org ID)
   - ✓ Terms yang dipropose
   - ✓ Response status (Counter/Accepted/Declined)
   - ✓ Notes/messages

---

## 📋 Checklist Testing

### Backend (Convex Functions)
- [ ] sendInvitation() - Bisa create invitation ✓
- [ ] respondToInvitation() - Accept berfungsi ✓
- [ ] respondToInvitation() - Decline dengan reason ✓
- [ ] counterPropose() - Counter-propose works ✓
- [ ] counterPropose() - Auto-expire di round 5 ✓
- [ ] getMyInvitations() - List semua invitations ✓
- [ ] getInvitationDetail() - Detail lengkap ✓
- [ ] getNegotiationHistory() - Timeline semua rounds ✓

### Frontend Navigation
- [ ] Partners screen Invite button → SendInvitationScreen ✓
- [ ] SendInvitationScreen form validation ✓
- [ ] InvitationDetailScreen display data ✓
- [ ] CounterProposeScreen form works ✓
- [ ] InvitationInboxScreen list items ✓
- [ ] NegotiationHistoryView timeline ✓
- [ ] Back buttons work ✓
- [ ] Animations smooth ✓

### Features Functionality
- [ ] 300 char limit on personal message
- [ ] Role selector has 5 options
- [ ] Deadline picker shows 24/48/72h options
- [ ] Revenue sharing toggle show/hide fields
- [ ] Status badges color-coded
- [ ] Round counter visual progress bar
- [ ] Decline reason required
- [ ] Counter-propose button disabled at round 5

---

## ⚠️ Expected Issues & Fixes

### ❌ "Organization selector is placeholder"
**Fix:** Nanti buat org picker modal (tidak urgent untuk MVP)

### ❌ "Notifikasi tidak muncul saat invitation received"
**Fix:** Push notifications belum diimplementasi (your friend akan handle)

### ❌ "Chat room tidak muncul setelah accept"
**Fix:** Chat messaging belum diimplementasi (your friend akan handle)

---

## 🎯 Verification Checklist

✅ TypeScript compiles tanpa error
✅ Semua 7 files dibuat
✅ Schema updated dengan 2 tables
✅ 7 backend functions siap
✅ 5 screens siap
✅ Navigation routes ditambah
✅ Invite button hooked ke flow

**Semuanya READY untuk testing! 🚀**
