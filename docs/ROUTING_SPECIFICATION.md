# Explainable Routing & Scoring Engine Specification (v1.4.0-composite)

## 1. Objectives

The Routing Engine translates unstructured transcripts and sales metadata into:
1. Primary Queue Assignment
2. Secondary Queue Labels
3. Multi-Factor Priority Score (0–100)
4. Qualitative Priority Classification (Urgent, High, Medium, Low)
5. Competing Signals & Conflict Explanation
6. Audit Trace linking decisions to rules and verbatim text snippets

---

## 2. Dedicated Queues

| Queue Name | Primary Trigger | Target Business Objective |
|------------|-----------------|---------------------------|
| **High Priority** | Total Priority Score $\ge 50$ (Urgent if $\ge 75$) | Immediate executive attention on near-term pipeline |
| **Follow-up Required** | Explicit promises, action items, or deadlines | Eliminate post-call momentum decay |
| **Customer Risk** | Cancellation threats, churn, severe complaints, or negative sentiment | Customer retention & CS escalation |
| **Pricing and Negotiation** | Discount requests, budget pushback, per-seat terms | Commercial qualification & deal structuring |
| **Technical Questions** | SSO, SAML, API limits, architecture, security review | Solutions engineering deployment |
| **Positive Buying Signals** | Contract requests, procurement start, budget approval | Accelerated closing velocity |
| **General Conversations** | Standard discovery, introductory calls | Routine pipeline progression |
| **Unassigned / Needs Review** | Ambiguous match or conflicting signals requiring manager triage | Quality control & manual resolution |
| **Recently Updated** | Modified or re-imported within last 7 days | Operational delta visibility |

---

## 3. Scoring Matrix & Rule Definitions

Each conversation is scored against 6 orthogonal weighted dimensions:

### 1. Urgency Dimension (Max: 20 pts)
- **Triggers**: Explicit time-sensitive markers ("urgent", "ASAP", "by tomorrow", "EOD", "within 48 hours").
- **Weight**: $+20$ points.

### 2. Customer Risk Dimension (Max: 35 pts)
- **Triggers**: Churn threats ("cancel", "churn", "terrible experience", "unacceptable", "breach of contract").
- **Weight**: $+35$ points if direct cancellation threat; $+20$ points if negative sentiment or multiple objections.

### 3. Buying Intent Dimension (Max: 30 pts)
- **Triggers**: Purchasing milestones ("ready to sign", "send over contract", "MSA", "budget approved", "pilot successful", "procurement").
- **Weight**: $+30$ points.

### 4. Technical Blocker Dimension (Max: 25 pts)
- **Triggers**: Architectural barriers ("SSO", "SAML", "Okta", "API rate limit", "security review", "HIPAA", "SOC2").
- **Weight**: $+25$ points.

### 5. Deadline Proximity Dimension (Max: 25 pts)
- **Triggers**: Specific deadline dates ("by Friday", "end of week", "by the 15th", "EOQ").
- **Weight**: $+25$ points.

### 6. Team Commitments Dimension (Max: 20 pts)
- **Triggers**: Sales rep promises ("I will send", "promise to follow up", "agreed to deliver").
- **Weight**: $+20$ points.

---

## 4. Conflict Resolution & Competing Signals

Sales conversations are frequently multi-dimensional. A common scenario is:
- **Prospect enthusiastically wants to buy** (High Buying Intent $\rightarrow$ $+30$ pts)
- **Prospect cannot sign without SSO documentation** (Technical Blocker $\rightarrow$ $+25$ pts)

### Resolution Logic:
1. Both rules match and contribute to the total score ($55/100 \rightarrow$ High Priority).
2. The engine detects the opposing forces and sets `conflictDetected = true`.
3. It generates a human-readable explanation:
   > *"Competing signals: Customer showed strong buying intent but requires critical technical/integration validation (e.g. SSO/API). High revenue opportunity at risk if technical verification stalls."*
4. It sets the primary queue to **Technical Questions** so that technical clearance is prioritized to unblock the commercial deal, while keeping **Positive Buying Signals** as an active secondary queue.
