import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSyntheticConversations, generateUpdateAndDuplicateFile } from './seedDataGenerator.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { ImportService } from '../services/importService.js';
import { Conversation } from '../models/Conversation.js';
import { FollowUpAction } from '../models/FollowUpAction.js';
import { ImportBatch } from '../models/ImportBatch.js';
import { ManualCorrection } from '../models/ManualCorrection.js';
import { RoutingRule } from '../models/RoutingRule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function objectsToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.map(escapeCSV).join(',');
  const rows = data.map(row => headers.map(h => escapeCSV(row[h])).join(','));
  return [headerLine, ...rows].join('\n');
}

export async function writeSampleDataFiles() {
  const initialRows = generateSyntheticConversations(52);
  const updateRows = generateUpdateAndDuplicateFile(initialRows);

  try {
    const sampleDataDir = path.resolve(__dirname, '../../../sample-data');
    if (!fs.existsSync(sampleDataDir)) {
      fs.mkdirSync(sampleDataDir, { recursive: true });
    }

    // 1. sample_conversations_initial.csv
    const initialCsv = objectsToCSV(initialRows);
    fs.writeFileSync(path.join(sampleDataDir, 'sample_conversations_initial.csv'), initialCsv, 'utf8');

    // 2. sample_conversations_initial.json
    fs.writeFileSync(path.join(sampleDataDir, 'sample_conversations_initial.json'), JSON.stringify(initialRows, null, 2), 'utf8');

    // 3. sample_conversations_update_and_duplicates.csv
    const updateCsv = objectsToCSV(updateRows);
    fs.writeFileSync(path.join(sampleDataDir, 'sample_conversations_update_and_duplicates.csv'), updateCsv, 'utf8');

    // 4. data_dictionary.md
    const dataDictionary = `# Revenue Intelligence Inbox - Data Dictionary

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

1. **Primary Match**: (\`source\`, \`externalId\`). If an existing record matches both, and the SHA-256 content hash is identical, the import is skipped (Exact Duplicate). If content has changed, source fields are updated while preserving manual overrides.
2. **Ambiguous Match Fallback**: When external IDs differ, but the (\`company\`, \`contactEmail\`, and timestamp within +/- 24h) match, the record is flagged as \`AMBIGUOUS_MATCH\` and routed to the *Unassigned / Needs Review* queue for human inspection.
3. **Field Ownership**: Manual overrides (priority, routing category, sentiment, owner, next action) set by managers are never overwritten by automated re-imports.
`;

    fs.writeFileSync(path.join(sampleDataDir, 'data_dictionary.md'), dataDictionary, 'utf8');
    console.log(`Generated sample data files successfully in: ${sampleDataDir}`);
  } catch (err) {
    console.warn(`Sample data disk write skipped (${err.message}). Pre-generated files will be served.`);
  }

  return { initialRows, updateRows };
}

export async function seedDatabase() {
  console.log('Seeding Revenue Intelligence database...');
  const { initialRows } = await writeSampleDataFiles();

  // Clear existing data
  await Conversation.deleteMany({});
  await FollowUpAction.deleteMany({});
  await ImportBatch.deleteMany({});
  await ManualCorrection.deleteMany({});
  await RoutingRule.deleteMany({});

  console.log(`Importing ${initialRows.length} initial conversations via ImportService...`);
  const mapping = {
    externalId: 'externalId',
    source: 'source',
    title: 'title',
    contactName: 'contactName',
    contactEmail: 'contactEmail',
    company: 'company',
    salesRep: 'salesRep',
    conversationType: 'conversationType',
    timestamp: 'timestamp',
    durationMinutes: 'durationMinutes',
    transcriptOrNotes: 'transcriptOrNotes',
    opportunityId: 'opportunityId',
    sourceStatus: 'sourceStatus',
    sourceNextAction: 'sourceNextAction',
    sourceLastModified: 'sourceLastModified'
  };

  const initialBatch = await ImportService.commitBatch({
    rawRows: initialRows,
    mapping,
    filename: 'sample_conversations_initial.csv',
    fileType: 'CSV'
  });

  console.log(`Database seeded successfully! Batch ID: ${initialBatch.batchId}`);
  console.log(`New: ${initialBatch.newRecordsCount}, Duplicates: ${initialBatch.duplicateRecordsCount}, Updated: ${initialBatch.updatedRecordsCount}`);
  return initialBatch;
}

// Direct script execution support
if (process.argv[1] && process.argv[1].endsWith('seedRunner.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  })();
}
