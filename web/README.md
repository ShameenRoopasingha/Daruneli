# Daruneli / Suwa • MOH & PHNS Supervision Web Dashboard (Phase 3B)

A dedicated Next.js (App Router + Tailwind CSS + Recharts + Supabase) clinical supervision portal for **Medical Officers of Health (MOH)** and **Public Health Nursing Sisters (PHNS)** in Sri Lanka.

---

## 🌟 Key Capabilities
1. **Division Executive Overview (`/`):**
   - 6 Top KPIs (Active areas & 24h sync health, active pregnancies, critical open escalations, 0–5y children, nutrition watchlist, EPI vaccine coverage).
   - Interactive Stacked Bar Chart: Maternal Risk Distribution (`RED` / `YELLOW` / `GREEN`) by area.
   - Interactive Bar Chart: Child Weighing & Vaccine Coverage % by area.
   - Sortable PHM Area Division Scorecard table.
2. **High-Risk Escalation Radar (`/escalations`):**
   - Aggregated safety queue of severe preeclampsia / BP >= 140/90, postnatal MEOWS triggers, reduced fetal movement, overdue RED-risk visits, and severe acute malnutrition (SAM).
   - Slide-over clinical inspection drawer with vitals history, GPS Google Maps navigation, HTML5 audio player for field voice notes, and supervisor directive submission.
3. **Consolidated H509 Monthly Returns (`/reports`):**
   - Official 5-section Family Health Bureau (FHB) report.
   - Dynamic scope toggle: **Entire MOH Division (Combined)** or any **Individual PHM Area**.
   - Print-ready A4 PDF stylesheet (`window.print()`) with official bilingual header and signature lines.
   - UTF-8 BOM CSV export for Microsoft Excel.
4. **Field Supervision & Advance Programmes (`/supervision`):**
   - Mon–Sat Weekly Advance Timetables & Approved Exceptions/Leave.
   - Inter-area Mother Relocations & Temporary Delivery Out (`mother_transfers`).
   - Automated Daily SMS Reminder Audit Logs (`sms_reminder_logs`).
5. **Areas & Staff Directory (`/areas`):**
   - PHM areas and Grama Niladhari (GN) coverage mapping.
   - Add Area modal (for MOH role) and "Invite / Assign New PHM" workflow with backend Route Handler.
6. **Offline Demo Mode:**
   - Automatically activates if Supabase credentials are not provided in `web/.env.local`, pre-loaded with realistic Maharagama MOH division clinical records.

---

## 🚀 Quick Start (Local Run)

```bash
cd web
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

- To test immediately without Supabase credentials, click **"🚀 Enter Offline Demo Dashboard"** on the login screen.
- To connect to your live Supabase database, copy `.env.local.example` to `.env.local` and add your project URL and keys.

---

## 🔐 Promoting a Test User to MOH / PHNS Role in Supabase

Run the following SQL snippet in your Supabase SQL Editor:

```sql
-- Promote a registered user to Medical Officer of Health (MOH)
UPDATE profiles
SET role = 'MOH'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@health.gov.lk');

-- Or promote to Public Health Nursing Sister (PHNS)
UPDATE profiles
SET role = 'PHNS'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-phns@health.gov.lk');
```

---

## 📁 Directory Structure
```text
web/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Responsive Sidebar + Top Header layout
│   │   │   ├── page.tsx           # Division Executive Overview (Page 1)
│   │   │   ├── escalations/       # High-Risk Escalation Radar (Page 2)
│   │   │   ├── reports/           # Combined H509 Monthly Reports (Page 3)
│   │   │   ├── supervision/       # Weekly Timetables & Transfers (Page 4)
│   │   │   └── areas/             # PHM Areas & Staff Directory (Page 5)
│   │   ├── api/admin/create-phm/  # Server-only admin route for PHM provisioning
│   │   ├── login/                 # Supervisor authentication
│   │   ├── globals.css            # Tailwind + @media print A4 stylesheet
│   │   └── layout.tsx             # Root layout with LanguageProvider
│   ├── components/                # Reusable UI components
│   └── lib/                       # Types, mock data, data services, i18n
├── package.json
└── tailwind.config.js
```
