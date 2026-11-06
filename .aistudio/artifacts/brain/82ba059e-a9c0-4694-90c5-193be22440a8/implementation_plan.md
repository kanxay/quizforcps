# ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ (Lao Volunteer Exam)

A comprehensive, fully responsive web application for managing online volunteer certification examinations in Laos. The system covers the entire examination lifecycle: question bank creation, exam authoring, timed online examination taking with countdown and local draft resilience, automated objective grading, teacher essay evaluation, administrative reporting, and printable certificates of completion.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices**:
> - **Initial Seed Topic**: The default seed quiz will be titled **"quizeforcps"** (Champasak Emergency Volunteer & Referral Knowledge Quiz) created under a sample teacher account, seeded only once when the database is initially empty.
> - **Exam Interface Layout**: Single scrollable page layout paired with a sticky/floating question grid navigator. Volunteers can see all questions in flow, jump to any question immediately, track answered vs. unanswered status, and keep an eye on the countdown timer.
> - **Direct Turso Client Architecture**: Pure static frontend hosted on Cloudflare Pages communicating directly with Turso using `@libsql/client/web` (no Express, no serverless functions, no Gemini API).
> - **Cache & Real-time State Synchronization**: Teachers and exams are cached in `localStorage` for immediate zero-latency rendering and updated in background from Turso. Creations and deletions write synchronously to both storage layers from a single source of truth so deleted items never reappear and added items never vanish.

---

### 1. Overview & Core Concept

- **What It Does**: Streamlines the assessment and certification process for community and emergency volunteers across Laos. It allows teachers to build structured exams with multiple question types (`single_choice`, `multiple_choice`, and `text`), enables volunteers to take exams from any phone or computer with automatic time-out submission, and allows administrators to analyze pass rates and export comprehensive reports.
- **Target Audience & Roles**:
  - **Volunteer Examinee (ຜູ້ສອບເສັງ / ອາສາສະໝັກ)**: No password required. Registers demographic details (Name, Age, Gender, Location, Organization), takes the timed test, views instant objective results, and prints the official Lao certificate of completion if passed.
  - **Teacher (ອາຈານ / ຜູ້ອອກຂໍ້ສອບ)**: Manages exam papers, adds/reorders questions with points and answer keys, inspects student submissions, and grades essay answers with feedback.
  - **Administrator (Admin)**: Monitors overall metrics (total examinees, pass/fail ratios, average score, regional distribution), manages teacher accounts with password toggles, adjusts passing thresholds, and exports full backups to UTF-8 CSV with BOM for Microsoft Excel.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Unified Authentication Modal**:
   - Role selector: **ຜູ້ສອບເສັງ (ອາສາສະໝັກ)**, **ອາຈານ (ຜູ້ອອກຂໍ້ສອບ)**, or **Admin**.
   - Examinees enter directly without a password.
   - Teachers select their name from a dynamic dropdown and manually type their password.
   - Admin enters the secure admin password (default `admin2026`).
2. **Volunteer Exam-Taking Flow**:
   - **Exam Selection**: Browses active exam cards displaying title, subject, teacher name, duration, and question count.
   - **Pre-Exam Intake Modal**: Fills personal info (Name, Age, Gender, Village, District, Province, Organization/Unit).
   - **Active Exam Room**: Sticky top bar with countdown timer and progress pill (`ຕອບແລ້ວ X/Y ຂໍ້`), floating/desktop sidebar question grid for quick jumping, auto-save draft in `localStorage` to survive disconnections, and auto-submit on timer expiration.
   - **Post-Submission Summary**: Immediate objective score breakdown, pass/fail badge against passing score, review of correct/incorrect choices, and a dedicated **Print Certificate** button (`ພິມໃບຢັ້ງຢືນ`).
3. **Teacher Exam Authoring & Grading Flow**:
   - **Exam Bank**: Create, edit, and delete exams.
   - **Interactive Question Editor**: Supports Single Choice, Multiple Choice (requires all correct choices and no wrong choices for full marks), and Text/Essay (with sample answer reference). Reorder questions smoothly.
   - **Submissions & Grading View**: Review individual volunteer answer sheets; award marks and constructive feedback for open-ended essay questions.
4. **Admin Dashboard & Settings Flow (2 Tabs)**:
   - **Tab 1 (Dashboard)**: KPI stat cards (Total examinees, exams, teachers, average score, passed, failed), dynamic multi-criteria filters (Exam, Teacher, Province, District, Date range, Pass/Fail status), interactive pure SVG trend chart, full submissions table with review and delete actions, and UTF-8 BOM CSV export.
   - **Tab 2 (Settings)**: Teacher accounts management (`+ ສ້າງ User ຂອງອາຈານ`, Edit, Delete, Show/Hide password toggle), Admin password change, pass percentage threshold adjuster, and full database backup CSV.

#### Visual Identity & Theme
- **Palette**: Deep Clinical Indigo & Royal Blue (`#1E40AF` / `#2563EB`) primary tones, slate canvas (`#F8FAFC`), crisp white elevated panels, emerald green for passing status (`#059669`), and coral crimson for failing status (`#DC2626`).
- **Typography**: Clean Lao font `Noto Sans Lao` paired with `Plus Jakarta Sans` for modern educational clarity. Monospaced tabular numerals (`tabular-nums font-mono`) for timers, scores, and dates.
- **Dedicated Print Styles**: Clean official Lao Certificate layout with national emblem motif, recipient name, exam subject, percentage score, issue date, and signature stamps.

---

### 3. Key Product Decisions & Trade-Offs

- **Client-Side Turso Web Driver (`@libsql/client/web`)**:
  - *Decision*: Browser connects directly to Turso via `@libsql/client/web` using standard HTTPS protocol.
  - *Benefit*: Complies 100% with Cloudflare Pages static hosting requirements with zero cold starts and no backend dependencies.
- **Single-Source Cache & State Management**:
  - *Decision*: Read cache from `localStorage` immediately on app load, fetch fresh records from Turso in background, and update both `localStorage` and Turso atomically whenever adding or deleting items.
  - *Benefit*: Instant screen rendering with zero UI lag while preventing deleted items from reappearing or new items from vanishing.
- **Structured Scoring Engine**:
  - *Decision*: Objective questions are graded immediately in the browser upon submission (`single_choice` and `multiple_choice`). Text questions are initialized with `essayScore = 0` and `isFullyGraded = false` until the teacher evaluates them. If an exam has only objective questions, `isFullyGraded` is immediately set to `true`.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Lao Volunteer Exam Client (SPA)                   │
│   (Vite + React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons)      │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
        Direct HTTPS RPC                         Local Storage
  (@libsql/client/web createClient)              (Sync Cache)
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│        Turso Cloud DB         │        │    Local Storage Registry     │
│   (libsql over https protocol)│        │ - Auth Session & User Role    │
│                               │        │ - In-Progress Exam Drafts     │
│  - Table: teachers            │        │ - Fast Teachers/Exams Cache   │
│  - Table: exams               │        │ - Turso Connection Fallback   │
│  - Table: submissions         │        └───────────────────────────────┘
│  - Table: settings            │
└───────────────────────────────┘
```

#### Turso Database Schema
1. `teachers`:
   - `id TEXT PRIMARY KEY` (e.g. `tch_001`)
   - `fullName TEXT NOT NULL`
   - `subject TEXT NOT NULL`
   - `department TEXT NOT NULL`
   - `password TEXT NOT NULL`
   - `createdAt TEXT NOT NULL`
2. `exams`:
   - `id TEXT PRIMARY KEY` (e.g. `exm_001`)
   - `title TEXT NOT NULL`
   - `subject TEXT NOT NULL`
   - `teacherId TEXT NOT NULL`
   - `teacherName TEXT NOT NULL`
   - `teacherDepartment TEXT NOT NULL`
   - `createdDate TEXT NOT NULL`
   - `durationMinutes INTEGER NOT NULL`
   - `description TEXT NOT NULL`
   - `questions TEXT NOT NULL` (JSON array of question definitions)
3. `submissions`:
   - `id TEXT PRIMARY KEY` (e.g. `sub_001`)
   - `examId TEXT NOT NULL`
   - `examTitle TEXT NOT NULL`
   - `subject TEXT NOT NULL`
   - `teacherName TEXT NOT NULL`
   - `studentInfo TEXT NOT NULL` (JSON object)
   - `answers TEXT NOT NULL` (JSON object with answers, teacher scores, feedback)
   - `objectiveScore REAL NOT NULL`
   - `maxObjectiveScore REAL NOT NULL`
   - `essayScore REAL NOT NULL`
   - `maxEssayScore REAL NOT NULL`
   - `totalScore REAL NOT NULL`
   - `maxTotalScore REAL NOT NULL`
   - `percentage REAL NOT NULL`
   - `passed INTEGER NOT NULL` (0 or 1)
   - `isFullyGraded INTEGER NOT NULL` (0 or 1)
   - `submittedAt TEXT NOT NULL`
4. `settings`:
   - `key TEXT PRIMARY KEY`
   - `value TEXT NOT NULL`
   - Defaults: `admin_password = 'admin2026'`, `pass_percentage = '50'`

#### Questions JSON Data Model
```typescript
interface Question {
  id: string; // e.g. "q1"
  type: 'single_choice' | 'multiple_choice' | 'text';
  text: string;
  points: number;
  options?: string[]; // 2 to 6 options for choice types
  correctAnswer?: number | number[]; // index for single, array of indices for multiple
  sampleAnswer?: string; // model answer for text/essay grading
}
```

#### Build & Cloudflare Package Requirements
- Only approved packages in `package.json`: `react`, `react-dom`, `@libsql/client`, `lucide-react`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `typescript`, `@types/react`, `@types/react-dom`.
- Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"lint": "tsc --noEmit"`.
- Root `.npmrc` with `legacy-peer-deps=true` and `wrangler.jsonc` configured for SPA asset serving.
