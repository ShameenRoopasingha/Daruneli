# දරුනැළි (Daruneli) - PHM Digital Field Companion 🩺

> **Offline-First Public Health Midwife (PHM) Clinical Field Assistant & Child Health Development Record (CHDR) Application for Sri Lanka**

[![Expo](https://img.shields.io/badge/Expo-v58.0-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/expo--sqlite-Offline--First-003B57.svg)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Supabase](https://img.shields.io/badge/Supabase-Sync%20Ready-3ECF8E.svg)](https://supabase.com/)

---

## 🌟 Overview

**දරුනැළි (Darunali)** is an offline-first mobile application purpose-built for Sri Lankan Public Health Midwives (PHMs). It digitizes field records, eliminates administrative paperwork burdens, tracks maternal and infant risks in real-time, visualizes standardized clinical growth charts, automates the Advance Programme timetable, and exports official Ministry of Health returns (Form H-509).

---

## 🩺 Standardized Clinical Visualization Suite

All clinical charts operate **100% offline** via `react-native-svg` with high-contrast medical palettes, explicit dark typography (`#0F172A`, `#334155`), and strict `DD/MM/YYYY` Sri Lankan date standards:

1. **Gestational Age Wheel Tool (ගර්භ කාල ගණක චක්‍රය)**:
   - Interactive 40-week gestation wheel calculating POA (weeks + days), EDD (Naegele's rule), trimester stage, and Sri Lanka FHB milestone schedules.
2. **Symphysis-Fundal Height (SFH) 16–40w Chart**:
   - 10th, 50th, and 90th centiles with automated SGA (`<10th`), LGA (`>90th`), and static growth alert detection.
3. **Maternal Weight Gain & Booking BMI Corridors**:
   - Classification into Underweight (`<18.5`), Normal (`18.5–24.9`), Overweight (`25–29.9`), and Obese (`≥30`) corridors with recommended gestational weight gain trajectories.
4. **Cardiff Count-to-10 Fetal Movement Chart**:
   - Daily tracking of hours taken to reach 10 kicks, featuring a 12-hour safe threshold and emergency reduced-movement banners.
5. **Postnatal Modified Early Obstetric Warning Score (MEOWS)**:
   - Vital check strip for Days 1, 3, 5, 7, 10, 14, 21, 28, and 42 postpartum tracking BP, pulse, respiratory rate, temperature, and lochia bleeding with **White**, **Yellow**, and **Red** alert action guidelines.
6. **WHO Child Health Development Record (CHDR)**:
   - Growth curves for Weight-for-Age (WFA), Height-for-Age (HFA), and Weight-for-Height (WFH) for boys and girls from 0 to 60 months, matching physical Sri Lankan CHDR cards.
7. **Fenton Preterm Growth Curve (<37 weeks)**:
   - Sex-specific 10th, 50th, and 90th centile tracking along Postmenstrual Age (PMA 22–50 weeks) for premature infants.
8. **PHM Area Wall Charts**:
   - Visual overview of Maternal Risk distribution, Infant Nutrition breakdown (SAM / MAM / Normal) by GN division, and National Immunization Schedule coverage rates.

---

## 📅 Advance Programme & Timetable Engine

- **Master Template Rules**: Define recurring weekly schedules by day of week (`1_3`, `2_4`, `FIRST`, `LAST`, `ALL`) for Home Visits, Antenatal Clinics, Child Welfare & EPI Clinics, MOH Office Days, and Rest.
- **Smart Auto-Balancing**: Detects overloaded home visit days exceeding the configurable daily cap (options: 6, 8, 10, 12 visits/day) and automatically proposes balanced catch-up days while locking urgent/red visits.
- **Manual Rescheduling & Overrides**: Postpone visits (+7 days) or swap individual dates for Poya/public holidays with full confirmation safety dialogs.

---

## ⚡ Key Architecture & Features

- **Offline-First SQLite**: Local database with atomic transactions via `expo-sqlite`, ensuring complete usability in remote rural field areas without network connectivity.
- **Bi-Directional Supabase Sync**: Intelligent dirty-row tracking (`is_dirty`), conflict resolution, and automatic cloud synchronization when network connectivity is detected.
- **Form H-509 Monthly Summary**: Automated aggregation of all monthly field indicators with one-tap PDF export and direct print support.
- **QR Code Scanner**: Fast camera scanning of mother clinic cards and child CHDR cards with field simulation test mode.
- **Clinical Decision Confirmation**: All critical clinical decisions (vaccine administration, childbirth recording, task completion, schedule overrides, and critical vital alerts) require confirmation dialogs to prevent accidental taps.
- **Bilingual Support**: Fully localized in **Sinhala (සිංහල)** and **English**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo CLI (`npx expo`)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/ShameenRoopasingha/Daruneli.git
cd Daruneli

# Install SDK-compatible dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Starting the Development Server

```bash
# Start the Expo development server
npx expo start

# Run on Android emulator or physical device
npx expo run:android
```

### Verification & Quality Checks

```bash
# Run TypeScript type check
npx tsc --noEmit

# Run Expo Linter
npx expo lint
```

---

## 🏛️ Standards & References
- **Family Health Bureau (FHB)**, Ministry of Health, Sri Lanka
- **World Health Organization (WHO)** Child Growth Standards
- **Fenton 2013** Preterm Growth Charts for Boys & Girls
- **Sri Lanka National Expanded Programme on Immunization (EPI)**
