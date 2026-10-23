# Revenue Intelligence Inbox - Data Dictionary

| Column Name | Data Type | Requirement | Description | Example |
|-------------|-----------|-------------|-------------|---------|
| externalId | String | Required | Unique identifier from telephony or CRM source system | CONV-2024-001 |
| source | String | Optional | Source telephony/meeting platform | Zoom Phone, Gong.io, HubSpot |
| title | String | Required | Descriptive subject of the conversation | Executive Architecture Review |
| contactName | String | Optional | Primary buyer / attendee contact name | Johnathan Briggs |
| contactEmail | String | Optional | Work email address of primary contact | jbriggs@acme.com |
| company | String | Required | Account or enterprise company name | Acme Enterprise |
| salesRep | String | Optional | Assigned sales representative or account executive | Sarah Chen |
| conversationType | Enum | Optional | Call type (Discovery, Demo, Negotiation, QBR, Technical Deep Dive, Follow-up, Escalation) | Technical Deep Dive |
| timestamp | ISO 8601 | Required | Call start date and time | 2024-10-15T14:30:00Z |
| durationMinutes | Integer | Optional | Total duration of the call in minutes | 45 |
| transcriptOrNotes | Text | Required | Raw meeting transcript or verbatim sales notes | "Prospect: 'Ready to sign...'" |
| opportunityId | String | Optional | Linked CRM Opportunity / Deal identifier | OPP-2024-1001 |
| sourceStatus | Enum | Optional | Status in source system (Completed, Scheduled, Canceled) | Completed |
| sourceNextAction | String | Optional | Action item captured in source system | Send proposal |
| sourceLastModified | ISO 8601 | Optional | Source system modification timestamp | 2024-10-15T15:15:00Z |

## Idempotent Record Matching Strategy

1. **Primary Match**: (`source`, `externalId`). If an existing record matches both, and the SHA-256 content hash is identical, the import is skipped (Exact Duplicate). If content has changed, source fields are updated while preserving manual overrides.
2. **Ambiguous Match Fallback**: When external IDs differ, but the (`company`, `contactEmail`, and timestamp within +/- 24h) match, the record is flagged as `AMBIGUOUS_MATCH` and routed to the *Unassigned / Needs Review* queue for human inspection.
3. **Field Ownership**: Manual overrides (priority, routing category, sentiment, owner, next action) set by managers are never overwritten by automated re-imports.
