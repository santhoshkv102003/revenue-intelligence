import fs from 'fs';
import path from 'path';

export const REPS = ['Sarah Chen', 'Alex Miller', 'Marcus Vance', 'Elena Rostova', 'David Kim'];
export const SOURCES = ['Zoom Phone', 'Gong.io', 'Google Meet', 'HubSpot Meetings', 'Salesforce Phone'];
export const TYPES = ['Discovery', 'Demo', 'Negotiation', 'QBR', 'Technical Deep Dive', 'Follow-up', 'Escalation'];

export const COMPANIES_DATA = [
  { name: 'Acme Enterprise', domain: 'acme.com', contact: 'Johnathan Briggs', email: 'jbriggs@acme.com' },
  { name: 'CloudScale Systems', domain: 'cloudscale.io', contact: 'Deepa Narang', email: 'dnarang@cloudscale.io' },
  { name: 'Finovate Tech', domain: 'finovate.ai', contact: 'Robert Vance', email: 'rvance@finovate.ai' },
  { name: 'HealthPulse Labs', domain: 'healthpulse.org', contact: 'Dr. Evelyn Reed', email: 'ereed@healthpulse.org' },
  { name: 'RetailFlow Global', domain: 'retailflow.com', contact: 'Carlos Mendez', email: 'cmendez@retailflow.com' },
  { name: 'Nexus Logistics', domain: 'nexuslog.net', contact: 'Amanda Torres', email: 'atorres@nexuslog.net' },
  { name: 'CyberShield InfoSec', domain: 'cybershield.io', contact: 'Vikram Joshi', email: 'vjoshi@cybershield.io' },
  { name: 'AeroDynamics Pro', domain: 'aerodyn.com', contact: 'Jessica Bradley', email: 'jbradley@aerodyn.com' },
  { name: 'DataMesh Solutions', domain: 'datamesh.co', contact: 'Liam O’Connor', email: 'liam@datamesh.co' },
  { name: 'GreenEnergy Grid', domain: 'greenenergy.org', contact: 'Sophia Patel', email: 'spatel@greenenergy.org' },
  { name: 'Apex Media Group', domain: 'apexmedia.com', contact: 'Harrison Ford', email: 'hford@apexmedia.com' },
  { name: 'Optima Health Tech', domain: 'optimahealth.com', contact: 'Rachel Zhang', email: 'rzhang@optimahealth.com' }
];

export const TRANSCRIPT_TEMPLATES = [
  // 1. Strong Buying Intent + Technical Blocker (CONFLICTING SIGNAL)
  {
    title: 'Executive Architecture Review & Contract Readiness',
    type: 'Technical Deep Dive',
    text: "Prospect: 'Our executive team loved the platform demo and the budget is approved for 250 enterprise seats. We are completely ready to sign off and roll out to our team in Q4. However, our CISO raised a mandatory blocker: we require Okta SSO SAML integration and verified SOC2 documentation before legal can sign the MSA. If we do not receive the SAML setup guide by Friday, the contract signature will be delayed.' Rep: 'I will send over our SOC2 Type II report and have our solutions engineer deliver the SSO technical specs tomorrow morning.'"
  },
  // 2. Pure Positive Buying Signals
  {
    title: 'Procurement Negotiation & MSA Finalization',
    type: 'Negotiation',
    text: "Prospect: 'We compared your solution against Gong and Clari, and your pricing tier works much better for our distributed sales force. The pilot was successful across all 40 trial reps. Procurement process is initiated and we just need you to send over the contract and MSA by Monday.' Rep: 'Fantastic to hear. I will prepare the formal contract with the agreed net 30 payment terms and email it to procurement today.'"
  },
  // 3. Customer Risk & Escalation (Negative sentiment / cancellation threat)
  {
    title: 'Critical Support Escalation & Renewal Risk',
    type: 'Escalation',
    text: "Customer: 'We have been experiencing continuous sync latency with our Salesforce integration for three weeks. Our reps are frustrated with the manual process and data inaccuracies. If this issue is not resolved by engineering by Friday, we will cancel our subscription and explore Outreach. This has been a terrible experience for our team.' Rep: 'I sincerely apologize for the frustration. I am escalating this directly to our VP of Engineering and promise to follow up with an update within 24 hours.'"
  },
  // 4. Pricing & Commercial Objection
  {
    title: 'Commercial Terms Review & Discount Pushback',
    type: 'Negotiation',
    text: "Prospect: 'We reviewed the quote for 100 seats. While the features look promising, $85 per seat per month is too expensive and exceeds our allocated Q3 software budget. Our CFO is pushing back unless you can offer a 20% discount or allow quarterly billing instead of upfront annual contract payment.' Rep: 'I understand the budget constraints. Let me check with our sales director about approving quarterly invoicing with a structured discount tier.'"
  },
  // 5. Follow-up Required & Custom Demo Commitment
  {
    title: 'Mid-Market Discovery & Custom Sandbox Request',
    type: 'Discovery',
    text: "Prospect: 'Our biggest bottleneck right now is pipeline visibility and reps forgetting next steps after calls. We want to see how your automated action item extractor handles our custom Gong recordings.' Rep: 'I will prepare a custom sandbox environment loaded with sample telephony data and promised to follow up with a live walkthrough session next Tuesday at 2 PM.'"
  },
  // 6. Technical SSO / Security Clearance
  {
    title: 'Enterprise Infosec Compliance & Data Residency',
    type: 'Technical Deep Dive',
    text: "Prospect: 'As a healthcare organization, HIPAA compliance and data residency in AWS US-East are non-negotiable. What is your API rate limit for bulk webhooks, and how do you handle role-based access control?' Rep: 'We provide full HIPAA BAA agreements, dedicated VPC data isolation, and 10,000 API requests per minute. I will share our comprehensive infosec whitepaper by end of day.'"
  },
  // 7. General Discovery Session
  {
    title: 'Initial Workflow Discovery & Solution Fit',
    type: 'Discovery',
    text: "Prospect: 'We currently manage 15 Account Executives and are looking for modern coaching intelligence tools to reduce ramp time.' Rep: 'Walked through conversational insights, automated scorecard tracking, and objection detection. Customer was receptive and agreed to a follow-up demonstration next week with team leads.'"
  },
  // 8. Positive Feedback & Executive Expansion
  {
    title: 'Quarterly Business Review & Seat Expansion',
    type: 'QBR',
    text: "Customer: 'The platform adoption has been impressive over the past quarter. Win rates increased by 14% across the pilot team. We are ready to move forward with adding another 75 seats for our EMEA business development team.' Rep: 'Thrilled with these results. I will send over the expansion addendum with prorated billing for your remaining contract term.'"
  }
];

export function generateSyntheticConversations(count = 52) {
  const conversations = [];
  const baseDate = new Date('2024-10-01T09:00:00Z');

  for (let i = 1; i <= count; i++) {
    const idNum = String(i).padStart(3, '0');
    const externalId = `CONV-2024-${idNum}`;
    const companyObj = COMPANIES_DATA[(i - 1) % COMPANIES_DATA.length];
    const rep = REPS[(i - 1) % REPS.length];
    const source = SOURCES[(i - 1) % SOURCES.length];
    const template = TRANSCRIPT_TEMPLATES[(i - 1) % TRANSCRIPT_TEMPLATES.length];

    // Distribute timestamps over previous 25 days
    const callDate = new Date(baseDate.getTime() + (i * 11 * 60 * 60 * 1000) + ((i % 5) * 45 * 60 * 1000));
    const duration = 20 + ((i * 7) % 45); // 20 to 65 minutes

    let title = `${template.title} - ${companyObj.name}`;
    let transcript = template.text;

    // Add company-specific flavor
    transcript = transcript.replace(/Acme Enterprise/g, companyObj.name);

    conversations.push({
      externalId,
      source,
      title,
      contactName: companyObj.contact,
      contactEmail: companyObj.email,
      company: companyObj.name,
      salesRep: rep,
      conversationType: template.type,
      timestamp: callDate.toISOString(),
      durationMinutes: duration,
      transcriptOrNotes: transcript,
      opportunityId: `OPP-2024-${1000 + i}`,
      sourceStatus: i % 7 === 0 ? 'Scheduled' : 'Completed',
      sourceNextAction: i % 2 === 0 ? 'Send proposal and follow-up materials' : 'Schedule technical validation session',
      sourceLastModified: callDate.toISOString()
    });
  }

  return conversations;
}

export function generateUpdateAndDuplicateFile(initialConversations) {
  const resultRows = [];

  // 1. Exact Duplicates (10 rows identical to initialConversations)
  for (let i = 0; i < 10; i++) {
    resultRows.push({ ...initialConversations[i] });
  }

  // 2. Changed source fields for existing records (10 rows)
  for (let i = 10; i < 20; i++) {
    const orig = initialConversations[i];
    resultRows.push({
      ...orig,
      title: `${orig.title} (Updated Commercial Terms)`,
      durationMinutes: orig.durationMinutes + 15,
      transcriptOrNotes: `${orig.transcriptOrNotes} UPDATE: Customer confirmed budget sign-off and requested updated payment terms Net 45.`,
      sourceStatus: 'Completed',
      sourceNextAction: 'Execute updated agreement by Friday',
      sourceLastModified: new Date().toISOString()
    });
  }

  // 3. Brand New Records (5 rows)
  for (let i = 1; i <= 5; i++) {
    const extId = `CONV-2024-NEW-${i}`;
    resultRows.push({
      externalId: extId,
      source: 'Gong.io',
      title: `Brand New Discovery Call - VentureTech ${i}`,
      contactName: `Alice Walker ${i}`,
      contactEmail: `awalker${i}@venturetech.co`,
      company: `VentureTech Innovations ${i}`,
      salesRep: REPS[i % REPS.length],
      conversationType: 'Discovery',
      timestamp: new Date().toISOString(),
      durationMinutes: 42,
      transcriptOrNotes: "Customer: 'We are expanding rapidly and need AI-powered inbox prioritization for our 50 reps. Ready to sign if setup can happen this month.' Rep: 'I will send over our standard implementation agreement.'",
      opportunityId: `OPP-NEW-${i}`,
      sourceStatus: 'Completed',
      sourceNextAction: 'Send onboarding packet',
      sourceLastModified: new Date().toISOString()
    });
  }

  // 4. Ambiguous Match (2 rows - different external ID, but same company, email, and close timestamp!)
  resultRows.push({
    externalId: 'CONV-2024-ALT-991',
    source: 'HubSpot Meetings',
    title: 'Duplicate Session Synced Under Alternate HubSpot ID',
    contactName: initialConversations[0].contactName,
    contactEmail: initialConversations[0].contactEmail,
    company: initialConversations[0].company,
    salesRep: initialConversations[0].salesRep,
    conversationType: 'Technical Deep Dive',
    timestamp: initialConversations[0].timestamp,
    durationMinutes: initialConversations[0].durationMinutes,
    transcriptOrNotes: initialConversations[0].transcriptOrNotes,
    opportunityId: 'OPP-DUP-991',
    sourceStatus: 'Completed',
    sourceNextAction: 'Verify duplicate record identity',
    sourceLastModified: new Date().toISOString()
  });

  resultRows.push({
    externalId: 'CONV-2024-ALT-992',
    source: 'Zoom Phone',
    title: 'Inbound Call with CloudScale Systems',
    contactName: initialConversations[1].contactName,
    contactEmail: initialConversations[1].contactEmail,
    company: initialConversations[1].company,
    salesRep: initialConversations[1].salesRep,
    conversationType: 'Discovery',
    timestamp: initialConversations[1].timestamp,
    durationMinutes: 35,
    transcriptOrNotes: 'Customer called to ask about pricing tier details again.',
    opportunityId: 'OPP-DUP-992',
    sourceStatus: 'Completed',
    sourceNextAction: 'Review potential duplicate with sales rep',
    sourceLastModified: new Date().toISOString()
  });

  // 5. Invalid Rows (2 rows to test row-level validation rejection)
  resultRows.push({
    externalId: 'INVALID-001',
    source: 'Manual Upload',
    title: '', // Missing title
    company: '', // Missing company!
    contactName: 'Missing Company Person',
    contactEmail: 'badrow@example.com',
    salesRep: 'Sarah Chen',
    conversationType: 'Discovery',
    timestamp: 'corrupted-date-xyz', // Invalid date!
    durationMinutes: -10,
    transcriptOrNotes: '', // Missing transcript
    opportunityId: '',
    sourceStatus: 'Failed',
    sourceNextAction: '',
    sourceLastModified: ''
  });

  resultRows.push({
    externalId: 'INVALID-002',
    source: 'Salesforce Phone',
    title: 'Corrupted Row Without Company Or Content',
    company: '', // Missing required company
    contactName: 'Jane Doe',
    contactEmail: 'jane@bad.com',
    salesRep: 'Alex Miller',
    conversationType: 'Discovery',
    timestamp: '2024-10-15',
    durationMinutes: 15,
    transcriptOrNotes: '',
    opportunityId: '',
    sourceStatus: '',
    sourceNextAction: '',
    sourceLastModified: ''
  });

  return resultRows;
}
