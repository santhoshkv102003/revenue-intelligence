import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { ImportBatch } from '../models/ImportBatch.js';
import { FollowUpAction } from '../models/FollowUpAction.js';
import { AnalysisService } from './analysisService.js';
import { RoutingService } from './routingService.js';

// Canonical field definitions
export const CANONICAL_FIELDS = [
  'externalId',
  'title',
  'contactName',
  'contactEmail',
  'company',
  'salesRep',
  'conversationType',
  'timestamp',
  'durationMinutes',
  'transcriptOrNotes',
  'source',
  'opportunityId',
  'sourceStatus',
  'sourceNextAction',
  'sourceLastModified'
];

// Common header alias map for auto-detection
export const HEADER_ALIASES = {
  externalId: ['externalid', 'external_id', 'call_id', 'id', 'meeting_id', 'conversation_id', 'conversationid'],
  title: ['title', 'conversation_title', 'call_title', 'meeting_title', 'subject', 'name'],
  contactName: ['contactname', 'contact_name', 'customer_name', 'client_name', 'attendee', 'lead_name'],
  contactEmail: ['contactemail', 'contact_email', 'email', 'customer_email', 'client_email'],
  company: ['company', 'account', 'company_name', 'account_name', 'organization', 'client'],
  salesRep: ['salesrep', 'sales_rep', 'rep', 'agent', 'owner', 'assigned_to', 'rep_name', 'sales_person'],
  conversationType: ['conversationtype', 'conversation_type', 'call_type', 'meeting_type', 'type'],
  timestamp: ['timestamp', 'date', 'call_date', 'meeting_date', 'created_at', 'start_time'],
  durationMinutes: ['durationminutes', 'duration_minutes', 'duration', 'length', 'call_duration', 'minutes'],
  transcriptOrNotes: ['transcriptornotes', 'transcript_or_notes', 'transcript', 'notes', 'call_notes', 'summary_notes', 'meeting_notes', 'content'],
  source: ['source', 'platform', 'system', 'origin', 'channel'],
  opportunityId: ['opportunityid', 'opportunity_id', 'deal_id', 'opp_id', 'deal'],
  sourceStatus: ['sourcestatus', 'source_status', 'status', 'call_status'],
  sourceNextAction: ['sourcenextaction', 'source_next_action', 'next_action', 'action_item', 'next_step'],
  sourceLastModified: ['sourcelastmodified', 'source_last_modified', 'last_modified', 'updated_at']
};

export class ImportService {
  /**
   * Automatically guesses field mappings from uploaded file headers
   */
  static autoDetectMapping(fileHeaders) {
    const mapping = {};
    const normalizedHeaders = fileHeaders.map(h => ({
      original: h,
      clean: h.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    CANONICAL_FIELDS.forEach(canonical => {
      const aliases = HEADER_ALIASES[canonical] || [];
      const match = normalizedHeaders.find(nh => aliases.includes(nh.clean));
      if (match) {
        mapping[canonical] = match.original;
      }
    });

    return mapping;
  }

  /**
   * Computes SHA-256 fingerprint of core normalized source fields to detect exact duplicates
   */
  static computeNormalizedHash(row) {
    const coreStr = [
      (row.externalId || '').trim().toLowerCase(),
      (row.source || '').trim().toLowerCase(),
      (row.title || '').trim().toLowerCase(),
      (row.company || '').trim().toLowerCase(),
      (row.contactEmail || '').trim().toLowerCase(),
      (row.transcriptOrNotes || '').trim().toLowerCase(),
      (row.salesRep || '').trim().toLowerCase()
    ].join('||');

    return crypto.createHash('sha256').update(coreStr).digest('hex');
  }

  /**
   * Validates and normalizes a single raw row
   */
  static normalizeRow(rawRow, mapping, rowNumber) {
    const errors = [];
    const getVal = (canonical) => {
      const sourceCol = mapping[canonical];
      if (sourceCol && rawRow[sourceCol] !== undefined && rawRow[sourceCol] !== null) {
        return String(rawRow[sourceCol]).trim();
      }
      return '';
    };

    const externalId = getVal('externalId');
    const title = getVal('title');
    const company = getVal('company');
    const rawTimestamp = getVal('timestamp');
    const transcriptOrNotes = getVal('transcriptOrNotes');

    // Strict row validations
    if (!title && !transcriptOrNotes) {
      errors.push({ rowNumber, externalId, field: 'title', reason: 'Missing required title and conversation content' });
    }
    if (!company) {
      errors.push({ rowNumber, externalId, field: 'company', reason: 'Missing required company/account name' });
    }

    let parsedDate = new Date();
    if (rawTimestamp) {
      const d = new Date(rawTimestamp);
      if (isNaN(d.getTime())) {
        errors.push({ rowNumber, externalId, field: 'timestamp', reason: `Invalid timestamp format: "${rawTimestamp}"` });
      } else {
        parsedDate = d;
      }
    }

    let durationMinutes = parseInt(getVal('durationMinutes'), 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      durationMinutes = 30; // sensible default
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const normalized = {
      externalId: externalId || `GEN-${Date.now()}-${rowNumber}`,
      source: getVal('source') || 'Direct Upload',
      title: title || `Call with ${company}`,
      contactName: getVal('contactName') || 'Unknown Contact',
      contactEmail: getVal('contactEmail') || '',
      company,
      salesRep: getVal('salesRep') || 'Unassigned',
      conversationType: getVal('conversationType') || 'Discovery',
      timestamp: parsedDate,
      durationMinutes,
      transcriptOrNotes: transcriptOrNotes || 'No notes provided.',
      opportunityId: getVal('opportunityId') || '',
      sourceStatus: getVal('sourceStatus') || 'Completed',
      sourceNextAction: getVal('sourceNextAction') || '',
      sourceLastModified: new Date()
    };

    normalized.normalizedHash = this.computeNormalizedHash(normalized);
    return { isValid: true, normalized };
  }

  /**
   * Preview rows and detect duplicate/update classifications before committing
   */
  static async previewBatch(rawRows, mapping) {
    const summary = {
      totalRows: rawRows.length,
      newRecordsCount: 0,
      updatedRecordsCount: 0,
      duplicateRecordsCount: 0,
      ambiguousRecordsCount: 0,
      rejectedRecordsCount: 0,
      previewItems: [],
      validationErrors: []
    };

    const previewLimit = Math.min(rawRows.length, 100);

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const { isValid, normalized, errors } = this.normalizeRow(rawRows[i], mapping, rowNum);

      if (!isValid) {
        summary.rejectedRecordsCount++;
        summary.validationErrors.push(...errors);
        if (i < previewLimit) {
          summary.previewItems.push({
            rowNumber: rowNum,
            status: 'REJECTED',
            reason: errors.map(e => e.reason).join('; ')
          });
        }
        continue;
      }

      // Check matching in DB
      const matchResult = await this.matchRecord(normalized);

      if (matchResult.type === 'EXACT_DUPLICATE') {
        summary.duplicateRecordsCount++;
        if (i < previewLimit) {
          summary.previewItems.push({
            rowNumber: rowNum,
            externalId: normalized.externalId,
            company: normalized.company,
            title: normalized.title,
            status: 'EXACT_DUPLICATE',
            action: 'Will be skipped (identical to existing conversation)'
          });
        }
      } else if (matchResult.type === 'CHANGED_UPDATE') {
        summary.updatedRecordsCount++;
        if (i < previewLimit) {
          summary.previewItems.push({
            rowNumber: rowNum,
            externalId: normalized.externalId,
            company: normalized.company,
            title: normalized.title,
            status: 'CHANGED_UPDATE',
            action: 'Will update source fields (manual overrides will be preserved)',
            changes: matchResult.changes
          });
        }
      } else if (matchResult.type === 'AMBIGUOUS_MATCH') {
        summary.ambiguousRecordsCount++;
        if (i < previewLimit) {
          summary.previewItems.push({
            rowNumber: rowNum,
            externalId: normalized.externalId,
            company: normalized.company,
            title: normalized.title,
            status: 'AMBIGUOUS_MATCH',
            action: 'Will route to Needs Review queue for manager inspection'
          });
        }
      } else {
        summary.newRecordsCount++;
        if (i < previewLimit) {
          summary.previewItems.push({
            rowNumber: rowNum,
            externalId: normalized.externalId,
            company: normalized.company,
            title: normalized.title,
            status: 'NEW_RECORD',
            action: 'Will create new conversation record'
          });
        }
      }
    }

    return summary;
  }

  /**
   * Deterministic matching strategy:
   * 1. Primary: source + externalId
   * 2. Fallback: normalized company + contactEmail + timestamp within 24 hours
   * 3. Never rely solely on contact name
   */
  static async matchRecord(normalized) {
    // 1. Primary Match
    let existing = await Conversation.findOne({
      source: normalized.source,
      externalId: normalized.externalId
    });

    if (existing) {
      if (existing.normalizedHash === normalized.normalizedHash) {
        return { type: 'EXACT_DUPLICATE', existing };
      }

      // Find changed fields
      const changes = [];
      const fieldsToCheck = ['title', 'transcriptOrNotes', 'salesRep', 'conversationType', 'sourceStatus', 'sourceNextAction', 'durationMinutes'];
      fieldsToCheck.forEach(f => {
        if (String(existing[f] || '') !== String(normalized[f] || '')) {
          changes.push({ field: f, oldVal: existing[f], newVal: normalized[f] });
        }
      });

      return { type: 'CHANGED_UPDATE', existing, changes };
    }

    // 2. Fallback Check for Potential Matches
    if (normalized.contactEmail && normalized.company) {
      const timeWindow = 24 * 60 * 60 * 1000;
      const startTime = new Date(normalized.timestamp.getTime() - timeWindow);
      const endTime = new Date(normalized.timestamp.getTime() + timeWindow);

      const candidate = await Conversation.findOne({
        company: new RegExp(`^${normalized.company.trim()}$`, 'i'),
        contactEmail: normalized.contactEmail.trim().toLowerCase(),
        timestamp: { $gte: startTime, $lte: endTime }
      });

      if (candidate) {
        // Different external ID but matching company, email, and close timestamp -> Flag as AMBIGUOUS!
        return { 
          type: 'AMBIGUOUS_MATCH', 
          candidate, 
          reason: `Possible duplicate conversation with different External ID (${candidate.externalId} vs ${normalized.externalId}) for ${normalized.company} around same timestamp.` 
        };
      }
    }

    return { type: 'NEW_RECORD' };
  }

  /**
   * Commits the batch to the database with field-ownership protections and analysis
   */
  static async commitBatch({ rawRows, mapping, filename, fileType = 'CSV' }) {
    const batchId = `BATCH-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const batchStats = {
      batchId,
      filename,
      fileType,
      importedAt: new Date(),
      totalRows: rawRows.length,
      newRecordsCount: 0,
      updatedRecordsCount: 0,
      duplicateRecordsCount: 0,
      ambiguousRecordsCount: 0,
      rejectedRecordsCount: 0,
      validationErrors: [],
      recordUpdates: [],
      status: 'Committed',
      appliedMapping: mapping
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const { isValid, normalized, errors } = this.normalizeRow(rawRows[i], mapping, rowNum);

      if (!isValid) {
        batchStats.rejectedRecordsCount++;
        batchStats.validationErrors.push(...errors);
        continue;
      }

      const matchResult = await this.matchRecord(normalized);

      if (matchResult.type === 'EXACT_DUPLICATE') {
        batchStats.duplicateRecordsCount++;
        continue; // Idempotent skip
      }

      if (matchResult.type === 'CHANGED_UPDATE') {
        const existing = matchResult.existing;
        batchStats.updatedRecordsCount++;
        batchStats.recordUpdates.push({
          externalId: existing.externalId,
          source: existing.source,
          changes: matchResult.changes
        });

        // Update source fields
        existing.title = normalized.title;
        existing.contactName = normalized.contactName;
        existing.contactEmail = normalized.contactEmail;
        existing.company = normalized.company;
        existing.salesRep = normalized.salesRep;
        existing.conversationType = normalized.conversationType;
        existing.timestamp = normalized.timestamp;
        existing.durationMinutes = normalized.durationMinutes;
        existing.transcriptOrNotes = normalized.transcriptOrNotes;
        existing.sourceStatus = normalized.sourceStatus;
        existing.sourceNextAction = normalized.sourceNextAction;
        existing.normalizedHash = normalized.normalizedHash;
        existing.importBatchId = batchId;

        // Re-run analysis on updated content
        const analysis = await AnalysisService.analyzeConversation(normalized);
        const routing = RoutingService.evaluateRouting(normalized, analysis);
        existing.analysis = analysis;
        existing.routing = routing;

        // FIELD OWNERSHIP: Manual overrides are PRESERVED!
        existing.syncEffectiveFields();
        await existing.save();
        continue;
      }

      if (matchResult.type === 'AMBIGUOUS_MATCH') {
        batchStats.ambiguousRecordsCount++;
        normalized.isAmbiguousMatch = true;
        normalized.ambiguousReason = matchResult.reason;
      }

      // New Record Creation
      normalized.importBatchId = batchId;
      const analysis = await AnalysisService.analyzeConversation(normalized);
      const routing = RoutingService.evaluateRouting(normalized, analysis);

      if (normalized.isAmbiguousMatch) {
        routing.primaryQueue = 'Unassigned / Needs Review';
        if (!routing.assignedQueues.includes('Unassigned / Needs Review')) {
          routing.assignedQueues.push('Unassigned / Needs Review');
        }
        routing.conflictDetected = true;
        routing.conflictExplanation = `Ambiguous record identity flagged: ${normalized.ambiguousReason}`;
      }

      const conversation = new Conversation({
        ...normalized,
        analysis,
        routing
      });
      conversation.syncEffectiveFields();
      await conversation.save();

      // Persist follow up actions if extracted
      if (analysis.actionItems && analysis.actionItems.length > 0) {
        for (const item of analysis.actionItems) {
          await FollowUpAction.create({
            actionId: `ACT-${Date.now()}-${uuidv4().substring(0, 5)}`,
            conversationId: conversation._id,
            externalId: conversation.externalId,
            company: conversation.company,
            task: item.task,
            assignedTo: item.owner || conversation.effectiveSalesRep,
            dueDate: item.dueDate || 'Next Business Day',
            priority: conversation.effectivePriority,
            sourceSnippet: item.evidenceSnippet
          });
        }
      }

      batchStats.newRecordsCount++;
    }

    const savedBatch = await ImportBatch.create(batchStats);
    return savedBatch;
  }
}
