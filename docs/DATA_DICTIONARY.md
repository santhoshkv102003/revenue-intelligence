# Revenue Intelligence Inbox — Canonical Data Dictionary

This document specifies the canonical schema fields, ingestion validation rules, and field ownership boundaries.

| Field Name | Type | Required | Default | Validation & Normalization Rules | Description |
|------------|------|----------|---------|----------------------------------|-------------|
| **externalId** | String | Yes | Auto-gen (`GEN-...`) | Must be non-empty string. Indexed. | Unique ID from telephony/CRM source system (e.g. `CONV-2024-001`). |
| **source** | String | No | 'Manual Upload' | Trimmed text (e.g. `Zoom Phone`, `Gong.io`, `HubSpot`). | Source telephony, meeting recorder, or CRM system. |
| **title** | String | Yes | None | Must be non-empty string. | Human-readable conversation or meeting subject. |
| **contactName** | String | No | 'Unknown Contact' | Trimmed name string. | Primary customer attendee or buyer representative. |
| **contactEmail** | String | No | '' | Normalized to lowercase. Trimmed. | Work email address of the primary contact. |
| **company** | String | Yes | None | Must be non-empty string. Indexed. | Prospect organization or customer enterprise account name. |
| **salesRep** | String | No | 'Unassigned' | Trimmed name string. Indexed. | Assigned account executive or sales representative. |
| **conversationType** | Enum | No | 'Discovery' | `['Discovery', 'Demo', 'Negotiation', 'QBR', 'Technical Deep Dive', 'Follow-up', 'Escalation', 'General']` | Meeting structure classification. |
| **timestamp** | Date | Yes | `Date.now()` | ISO 8601 string or valid date string. Rejects invalid dates. | Recording start timestamp. |
| **durationMinutes** | Integer | No | 30 | Positive integer $> 0$. Defaults to 30 if unparseable. | Total meeting length in minutes. |
| **transcriptOrNotes** | Text | Yes | None | String $> 5$ chars. Required for analysis. | Verbatim transcript text, call audio transcription, or sales notes. |
| **opportunityId** | String | No | '' | Optional deal identifier (e.g. `OPP-2024-1001`). | CRM opportunity identifier. |
| **sourceStatus** | Enum | No | 'Completed' | `['Completed', 'Scheduled', 'Canceled']` | Status in source telephony calendar. |
| **sourceNextAction** | String | No | '' | Source captured next step. | Initial raw next step from source. |
| **sourceLastModified** | Date | No | `Date.now()` | ISO 8601 timestamp. | Upstream modification timestamp. |

---

## Field Ownership & Protection Boundaries

| Field | Source Ingestion Owns? | Sales Operations Manager Owns? | Re-import Behavior |
|-------|------------------------|--------------------------------|-------------------|
| `transcriptOrNotes` | Yes | No | Updates to new content |
| `durationMinutes` | Yes | No | Updates to new value |
| `sourceStatus` | Yes | No | Updates to new value |
| `effectivePriority` | Initial default only | **Yes (Full Ownership)** | **Preserved; Source cannot overwrite** |
| `effectivePrimaryQueue` | Initial default only | **Yes (Full Ownership)** | **Preserved; Source cannot overwrite** |
| `effectiveSentiment` | Initial default only | **Yes (Full Ownership)** | **Preserved; Source cannot overwrite** |
| `effectiveOwner` | Initial default only | **Yes (Full Ownership)** | **Preserved; Source cannot overwrite** |
| `effectiveNextAction` | Fallback only | **Yes (Full Ownership)** | **Preserved; Source cannot overwrite** |
| `manualOverrides.notes`| No | **Yes (Exclusive)** | **Preserved perpetually** |
