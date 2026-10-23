# Revenue Intelligence Inbox — System Architecture & Design Specification

## 1. System Overview

**Revenue Intelligence Inbox** is a mission-critical full-stack platform designed for sales operations, sales managers, and executive leadership. It provides centralized ingestion, automated conversation intelligence extraction, explainable routing, human-in-the-loop manual corrections, and cryptographically verified data export packaging.

```
+-----------------------------------------------------------------------------------+
|                              REACT FRONTEND (Vite)                                |
|  - Executive Dashboard (Recharts Dynamic Metrics & Trends)                        |
|  - Inbox Workspace (9 Dedicated Queues, Search, Sort, Bulk Operations)            |
|  - Conversation Drawer (Highlighted Transcripts, Insights, Overrides, Audit Trail) |
|  - Import Center (Multi-step Wizard, Column Mapping, Previews, Commit Report)     |
|  - Routing Audit (Explainable Formula Inspector, Score Breakdown, Conflicts)      |
|  - Findings Workspace (3 Evidence-backed Findings + 1 Documented Rejected Dec.)   |
|  - Export Center (Verified manifest.json with SHA-256 Checksums, ZIP Bundling)   |
+------------------------------------------^----------------------------------------+
                                           | REST APIs (Axios)
+------------------------------------------v----------------------------------------+
|                            NODE.JS & EXPRESS BACKEND                              |
|  - Express Server & Middleware (CORS, Multer Stream Parser, JSON/CSV Validation)  |
|  - ImportService (Idempotency Engine, Deterministic Matching, Field Ownership)    |
|  - AnalysisService (Dual-Engine: Pluggable LLM with Deterministic Regex Fallback)  |
|  - RoutingService (Explainable Scoring Formula, Competing Signals Conflict Engine)|
|  - MetricsService (Real-time DB Aggregations, Filter-Aware Computations)          |
|  - ExportService (Cryptographic SHA-256 Hasher, Archiver ZIP Builder, Manifest)   |
|  - FindingsService (Dynamic Observation Engine with Verbatim Quote Linkages)      |
+------------------------------------------^----------------------------------------+
                                           | Mongoose ODM
+------------------------------------------v----------------------------------------+
|                          PERSISTENT MONGODB DATABASE                              |
|  - Local In-Memory Server (MongoMemoryServer) for zero-dependency local runs       |
|  - Production MongoDB Atlas Compatible via MONGODB_URI environment variable        |
|  - Collections: conversations, importbatches, followups, manualcorrections,       |
|                 routingrules, exportjobs, findings                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Ingestion & Deduplication Pipeline

### Deterministic Matching Strategy
To guarantee idempotency and avoid silent data corruption:
1. **Primary Key Match**: Matching on `source` (e.g., Zoom Phone, Gong.io) + `externalId` (e.g., `CONV-2024-001`).
2. **Fallback Identifier Match**: Matching on normalized `company` + `contactEmail` + timestamp window (+/- 24 hours).
3. **Ambiguous Conflict Policy**: When a record has identical company and contact details but a distinct external ID, the engine flags it as `AMBIGUOUS_MATCH` and routes it to the *Unassigned / Needs Review* queue for human inspection. Records are never merged blindly.

### Record Classification During Imports
- **Exact Duplicate**: Content fingerprint hash is identical to stored record. The import is skipped (idempotent, 0 new records created).
- **Changed Source Update**: Content has changed in source telephony/CRM. The source fields are updated, analysis is refreshed, and field diffs (`oldVal` vs `newVal`) are logged.
- **New Conversation**: Created and analyzed.
- **Invalid Row**: Missing required fields (`title`, `company`, or invalid timestamp format) are rejected with row numbers and exact reasons.

---

## 3. Field Ownership Rules (Protection of Manual Corrections)

A foundational architectural requirement is that automated re-imports must never overwrite human judgment:
- When a sales manager modifies `priority`, `primaryQueue`, `sentiment`, `owner`, or `notes`, the change is stored under `manualOverrides`.
- An immutable entry is appended to `ManualCorrection` with previous value, new value, actor, reason, and timestamp.
- When an updated version of that conversation is imported from telephony, source transcript and duration update, but the effective priority, effective queue, and assigned owner remain strictly locked to the manager's override.

---

## 4. Pluggable Conversation Analysis Pipeline

The analysis pipeline processes unstructured transcripts and call summaries:
1. **Pluggable Architecture**: If `LLM_API_KEY` is provided, structured LLM inference is invoked. If omitted, the engine uses our deterministic NLP keyword, regex, and linguistic heuristics engine.
2. **Evidence Linking**: Every pain point, buying signal, technical question, pricing detail, objection, and commitment extracted is linked directly to literal verbatim sentences in the transcript with a relevance score (0.85–0.98). Zero synthetic quotes or hallucinations are generated.
3. **Storage Separation**: Analysis outputs are stored in a dedicated sub-document (`conversation.analysis`) separate from immutable source fields, allowing re-analysis without source data loss.

---

## 5. Explainable Routing & Scoring Formula

The routing engine scores conversations from 0 to 100 based on verifiable weights:

$$\text{Priority Score} = \min(100, W_{\text{urgency}} + W_{\text{risk}} + W_{\text{intent}} + W_{\text{blocker}} + W_{\text{deadline}} + W_{\text{commitments}})$$

- **Urgent**: Score $\ge 75$
- **High**: Score $\ge 50$
- **Medium**: Score $\ge 25$
- **Low**: Score $< 25$

### Competing Signals Resolution
When a conversation exhibits high buying intent alongside a blocking integration requirement (e.g., Okta SSO SAML or security clearance), the engine:
1. Flags `conflictDetected = true`.
2. Generates an articulate explanation of the competing forces.
3. Prioritizes the primary queue to unblock the transaction (e.g. `Technical Questions`), while preserving secondary queue tags.
