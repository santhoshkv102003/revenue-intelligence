# Revenue Intelligence Inbox — 3-Minute Video Demonstration Script

**Title:** Production Walkthrough: Revenue Intelligence Inbox  
**Target Duration:** 3:00 Minutes (180 seconds)  
**Presenter:** Sales Operations Lead & Senior Full-Stack Engineer  
**Live URL:** Production Frontend Workspace (`http://localhost:3000` / Hosted Demo)

---

## Shot List & Minute-by-Minute Narration Script

```
===================================================================================
TIMECODE        SHOT DESCRIPTION                          ACTION / ON-SCREEN TARGET
===================================================================================
0:00 - 0:25     Executive Overview & Dashboard            Navigate to Overview, interact with KPI cards
0:25 - 0:55     Conversation Inbox & Evidence Inspection  Open Inbox, inspect CONV-2024-001 evidence drawer
0:55 - 1:35     Difficult Routing Decision & Override     Demonstrate competing signals, edit manual override
1:35 - 2:20     Import Center & Idempotent Deduplication  Upload initial CSV, re-upload update & duplicate file
2:20 - 2:45     Findings Workspace & Export Manifest      Show 3 verified findings, download ZIP package
2:45 - 3:00     Strategic Summary & Next Steps            Discuss rejected decision, limitations, and wrap-up
===================================================================================
```

---

### Act 1: The Problem Statement & Executive Dashboard (0:00 – 0:25)

**Visual:** Camera opens on the Revenue Intelligence Inbox dashboard. The dark navy sidebar and glassmorphism KPI cards are crisp and vibrant. Mouse hovers over "Total Conversations: 52", "Follow-ups Required: 15", and "High/Urgent Deals: 18".

**Narration:**
> *"Welcome to Revenue Intelligence Inbox. Modern sales teams record hundreds of customer calls each week, but critical buying signals, technical blockers, and promised follow-ups routinely slip through the cracks.*
> 
> *Our platform replaces subjective guesswork with an auditable, deterministic intelligence hub. Every metric here on the executive dashboard is computed directly from stored MongoDB conversation records—never hardcoded. Notice our activity trends, sentiment distribution, and rep workload breakdown.*
> 
> *When we click on any metric card—like 'High / Urgent Deals'—the platform instantly navigates to our prioritized conversation inbox."*

---

### Act 2: Conversation Inbox & Source Evidence Inspection (0:25 – 0:55)

**Visual:** Transition to the Conversation Inbox table. The presenter points out the dedicated queue tabs (`High Priority`, `Follow-up Required`, `Customer Risk`, `Technical Questions`, etc.). Click the **Review** button on row `CONV-2024-001` (Acme Enterprise). The `ConversationDrawer` smoothly animates open from the right.

**Narration:**
> *"Here in the inbox, every call is organized into dedicated queues based on explainable multi-factor scoring. Let's inspect this enterprise discovery call with Acme Enterprise.*
> 
> *Unlike generic AI summaries that invent findings, our engine highlights verbatim transcript evidence. In the Evidence tab, we see the prospect's exact words: 'Our executive team loved the demo and budget is approved for 250 seats.'*
> 
> *Beneath the transcript, our pipeline has extracted key discussion points, customer pain points, competitor mentions, and explicit team deliverables with target due dates."*

---

### Act 3: Difficult Routing Decision & Human-in-the-Loop Override (0:55 – 1:35)

**Visual:** Presenter switches to the **Routing & Score Breakdown** tab in the drawer, highlighting the `Conflict Detected` alert banner and the score calculation components (`Urgency: +20`, `Tech Blocker: +25`, `Buying Intent: +30`). Then presenter navigates to **Manual Overrides & Audit** tab, modifies priority to `Urgent`, adds notes, and clicks `Save Manual Correction`.

**Narration:**
> *"Now let's examine a difficult routing decision. Notice the warning banner: 'Competing Signals Detected'.*
> 
> *Acme Enterprise expressed strong buying intent, but also stated a mandatory blocker: their CISO requires Okta SSO SAML setup by Friday, or contract signature will stall. Our engine flags this tension, explains why it prioritized the Technical Questions queue to unblock the deal, and shows the full multi-factor score breakdown.*
> 
> *Under our Field Ownership rules, managers can manually override classifications. Let's escalate the priority to Urgent and assign an executive sponsor. The change is saved instantly with an immutable audit log recording the actor, previous value, new value, and timestamp."*

---

### Act 4: Ingestion Center & Idempotent Deduplication (1:35 – 2:20)

**Visual:** Switch to **Import Center**. Click `Load Duplicates & Updates Test File (CSV)`. The multi-step wizard moves from Upload to Auto-Detected Column Mapping, then to Step 3: Duplicate & Update Audit Preview. Presenter shows the count: 5 New Records, 10 Changed Source Updates, 10 Exact Duplicates Skipped, 2 Ambiguous Matches Flagged, and 2 Corrupted Rows Rejected.

**Narration:**
> *"Next, let's verify our ingestion and deduplication engine. We'll upload our test update file, which contains a blend of identical records, changed conversations, ambiguous matches, and new opportunities.*
> 
> *The engine auto-detects header aliases and performs deterministic matching on source system and external ID. Notice the preview audit: 10 exact duplicates are identified and will be skipped with zero data bloat—making our imports 100% idempotent.*
> 
> *For the 10 updated records, source fields will update, but our Field Ownership guarantee ensures our manual override on Acme Enterprise is strictly preserved!*
> 
> *Furthermore, two ambiguous matches with identical contacts but different IDs are isolated to our Needs Review queue, while two malformed rows are rejected with row numbers and clear reasons. Let's confirm and commit the batch."*

---

### Act 5: Findings Workspace, Exports & Manifest Verification (2:20 – 2:45)

**Visual:** Presenter navigates to **Findings**. Displays the 3 dynamic finding cards (Follow-up commitments, SSO blockers, and Commercial annual billing friction). Then navigates to **Export Center**, clicks `Generate Export Package & Manifest`, previews the SHA-256 hashes, and clicks `Download All Exports (ZIP)`.

**Narration:**
> *"Moving to our Findings Workspace, the platform computes three substantive, evidence-backed findings across our dataset:*
> 1. *A concentration of 15 uncompleted follow-up commitments;*
> 2. *Recurring Enterprise SSO and SAML security blockers stalling deals; and*
> 3. *Commercial objections centered on annual billing inflexibility rather than price.*
> 
> *In the Export Center, we can export full datasets or filtered subsets. Clicking 'Generate Export Package' creates all seven CSV and JSON files alongside a cryptographic manifest.json. Every file has an exact SHA-256 checksum matching its bytes on disk. Let's download the complete ZIP bundle."*

---

### Act 6: Documented Rejected Decision & Wrap-Up (2:45 – 3:00)

**Visual:** Presenter shows the **Documented Rejected Decision** card on the Findings page, then pans to the terminal showing 13/13 passing acceptance tests.

**Narration:**
> *"Finally, we documented a deliberate rejected alternative: automatically demoting call priority when sentiment is positive. Our data proved 28% of positive calls contain urgent technical deadlines; autonomous demotion would cause revenue drop-off.*
> 
> *All 13 acceptance criteria pass with complete automated test coverage. Revenue Intelligence Inbox provides sales leadership with the transparency, rigor, and speed needed to close high-value revenue. Thank you!"*
