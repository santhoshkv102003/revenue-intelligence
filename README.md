# Revenue Intelligence Inbox

A production-grade sales conversation intelligence and action platform built for sales operations, sales managers, and executive leadership. It provides centralized call ingestion, automated deterministic and AI-powered intelligence extraction, explainable routing, human-in-the-loop manual overrides, dynamic executive metrics, and cryptographically verified data export packaging.

---

## 1. Technology Stack

- **Frontend:** React.js (v18), Vite (v6), Ant Design (v5), Recharts, Axios, Day.js
- **Backend:** Node.js (v24), Express.js (v4), Mongoose (v8)
- **Database:** MongoDB (zero-config local `mongodb-memory-server` out-of-the-box + hosted MongoDB Atlas via `MONGODB_URI`)
- **Data Processing:** JavaScript-based normalization, deterministic SHA-256 fingerprinting, multi-factor scoring
- **File Ingestion & Export:** Multer, `csv-parser`, `archiver` (ZIP packaging), crypto SHA-256 verification
- **Validation:** Zod schemas and row-level rejection handling
- **Testing:** Custom automated acceptance test runner verifying all 13 business criteria
- **Presentation:** Python `python-pptx` (generates native widescreen PowerPoint presentation)

---

## 2. Directory Structure

```
revenue-intelligence-inbox/
  backend/
    src/
      config/             # Database connection, MongoMemoryServer fallback, env variables
      models/             # Conversation, ImportBatch, RoutingRule, FollowUpAction, ManualCorrection, ExportJob, Finding
      services/           # Analysis, Routing, Ingestion, Metrics, Export, Findings
      routes/             # Express API endpoints (/api/conversations, /imports, /metrics, etc.)
      data/               # Seed dataset generator (52 conversations, duplicates, updates)
      tests/              # Acceptance test suite (13 criteria)
      server.js           # Express API server entry point
    package.json
  frontend/
    src/
      components/         # AppLayout, StatCard, QueueTag, PriorityTag, SentimentTag, ConversationDrawer
      pages/              # Dashboard, Inbox, ImportCenter, RoutingAudit, Findings, FollowUps, ImportHistory, ExportCenter, Settings
      services/           # Axios client API service
      App.jsx             # React root with AntD theme and routing
      main.jsx            # Entry point
      index.css           # Design tokens, typography, glassmorphism cards, micro-animations
    vite.config.js
    package.json
  sample-data/
    sample_conversations_initial.csv                  # 52 verified sales call records
    sample_conversations_initial.json                 # JSON version of sample dataset
    sample_conversations_update_and_duplicates.csv    # Test file: duplicates, changed source updates, new records, ambiguous matches, invalid rows
    data_dictionary.md                                # Canonical schema dictionary
  exports/
    # Storage directory for generated export packages, manifest.json, and ZIP bundles
  presentation/
    generate_presentation.py                          # python-pptx generation script
    Revenue_Intelligence_Inbox_Presentation.pptx      # 5-slide widescreen presentation
    presentation_preview.html                         # Browser-viewable slide preview
  recording/
    NARRATION_SCRIPT.md                               # 3-minute video demonstration script and shot list
  docs/
    ARCHITECTURE.md                                   # System architecture and data flow
    ROUTING_SPECIFICATION.md                          # Multi-factor scoring formula and conflict rules
    DATA_DICTIONARY.md                                # Canonical schema and field ownership rules
    ACCEPTANCE_TEST_REPORT.md                         # 13/13 passing automated test results
  README.md                                           # Master documentation
  .gitignore
```

---

## 3. Quick Start & Local Setup

### Prerequisites
- Node.js $\ge$ 18 (Tested on v24.11.1)
- npm $\ge$ 9
- Python $\ge$ 3.8 (Optional, for regenerating `.pptx` slides)

### Unified Single-Command Setup (Recommended)
You can now run both the backend API and frontend client with a single command from the root directory:

```bash
# 1. Install all dependencies
npm install

# 2. Run automated acceptance tests
npm test

# 3. Start both Backend & Frontend concurrently
npm run dev
```

- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

*(Zero database configuration required locally — starts an embedded in-memory MongoDB instance automatically!)*

---

## 4. Deploying to Vercel

The application is fully concatenated and optimized for single-project fullstack deployment on [Vercel](https://vercel.com):

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure fullstack deployment for Vercel"
   git push origin main
   ```

2. **Import into Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and select your GitHub repository `revenue-intelligence`.
   - Vercel automatically detects the root project settings and uses [vercel.json](file:///c:/Users/santh/Downloads/revenue%20intelligence/vercel.json).
   - **Framework Preset:** Other / Vite
   - **Build Command:** `npm run build` *(auto-configured)*
   - **Output Directory:** `frontend/dist` *(auto-configured)*

3. **Set Environment Variables in Vercel:**
   - Under **Project Settings > Environment Variables**, add:
     - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/revenue-intelligence?retryWrites=true&w=majority`).
       *(Get a free MongoDB Atlas cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) if you do not have one yet!)*
     - *(Optional)* `LLM_API_KEY`: Gemini or OpenAI API key.

4. **Click Deploy!**
   - Vercel deploys the React frontend to global edge CDN and mounts the Express API at `/api/*` via Serverless Functions.

## 5. Environment Variables

Create `.env` in the root or `backend/` if configuring external services:

| Variable | Description | Default (Local) |
|----------|-------------|-----------------|
| `PORT` | API server port | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | Falls back to in-memory MongoDB |
| `LLM_API_KEY` | Optional Google Gemini / OpenAI key | Pluggable (falls back to deterministic heuristics) |
| `NODE_ENV` | Environment mode | `development` |

---

## 6. Acceptance Test Verification

Execute the test suite at any time:
```bash
cd backend
node src/tests/acceptanceTests.js
```

### Test Results Summary (All 13 Criteria Passed)
- **TEST-01:** Initial sample file upload creates expected 45+ valid records.
- **TEST-02:** Re-importing identical files is 100% idempotent (0 new records created; duplicates skipped).
- **TEST-03:** Changed source records update existing conversations while tracking field diffs.
- **TEST-04:** New records in subsequent imports create new conversations.
- **TEST-05:** Ambiguous matches (matching contact/company, differing external ID) are isolated into `Needs Review`.
- **TEST-06:** Manual corrections survive repeated imports (Field Ownership Protection).
- **TEST-07:** Conflicting routing signals produce conflict explanations and reviewable decisions.
- **TEST-08:** Dashboard metrics strictly match actual stored database records.
- **TEST-09:** Export record counts match selected filters.
- **TEST-10:** Manifest accurately describes exported files and verified SHA-256 checksums.
- **TEST-11:** Invalid rows produce row-level validation errors and are rejected.
- **TEST-12:** Findings workspace evidence snippets link directly to verified conversation records.
- **TEST-13:** Findings workspace contains a documented rejected decision with alternative and rationale.

*Full execution log available at [docs/ACCEPTANCE_TEST_REPORT.md](file:///c:/Users/Rithika/revenue%20intelligence/docs/ACCEPTANCE_TEST_REPORT.md).*

---

## 6. Deployment Guide

### Deploy Backend to Render, Railway, or Heroku
1. Push repository to GitHub.
2. Create a Web Service connected to `/backend`.
3. Set Environment Variables:
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/revenue_inbox?retryWrites=true&w=majority`
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
4. Build Command: `npm install`
5. Start Command: `node src/server.js`

### Deploy Frontend to Vercel or Netlify
1. Create a Frontend Project connected to `/frontend`.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: Hosted backend URL (e.g., `https://revenue-inbox-api.onrender.com`)

---

## 7. Submission Package Inventory

- **Editable PowerPoint Presentation:** `presentation/Revenue_Intelligence_Inbox_Presentation.pptx`
- **Slide Preview:** `presentation/presentation_preview.html`
- **3-Minute Demonstration Script:** `recording/NARRATION_SCRIPT.md`
- **Sample Datasets:** `sample-data/sample_conversations_initial.csv`, `sample-data/sample_conversations_update_and_duplicates.csv`
- **Export Package & Manifest:** Accessible via Export Center in the application or API `/api/exports/generate`
- **Acceptance Test Report:** `docs/ACCEPTANCE_TEST_REPORT.md`
