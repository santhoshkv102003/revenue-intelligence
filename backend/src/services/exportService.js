import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { FollowUpAction } from '../models/FollowUpAction.js';
import { ImportBatch } from '../models/ImportBatch.js';
import { ManualCorrection } from '../models/ManualCorrection.js';
import { ExportJob } from '../models/ExportJob.js';
import { FindingsService } from './findingsService.js';
import { RoutingService } from './routingService.js';
import { ENV } from '../config/env.js';

export class ExportService {
  /**
   * Helper to format an array of objects into CSV string
   */
  static objectsToCSV(data, headers) {
    if (!data || data.length === 0) {
      return headers ? headers.join(',') + '\n' : '';
    }

    const fieldKeys = headers || Object.keys(data[0]);
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = fieldKeys.map(escapeCSV).join(',');
    const rows = data.map(item => {
      return fieldKeys.map(key => escapeCSV(item[key])).join(',');
    });

    return [headerLine, ...rows].join('\n');
  }

  /**
   * Calculates SHA-256 checksum of a buffer or string
   */
  static computeChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generates all required export files based on applied filters and saves them
   */
  static async generateExportPackage(filters = {}) {
    const exportId = `EXP-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const exportTimestamp = new Date().toISOString();

    // Query builder
    const query = {};
    if (filters.salesRep && filters.salesRep !== 'All') query.effectiveSalesRep = filters.salesRep;
    if (filters.company && filters.company !== 'All') query.company = filters.company;
    if (filters.priority && filters.priority !== 'All') query.effectivePriority = filters.priority;
    if (filters.source && filters.source !== 'All') query.source = filters.source;
    if (filters.primaryQueue && filters.primaryQueue !== 'All') query.effectivePrimaryQueue = filters.primaryQueue;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const totalInDB = await Conversation.countDocuments({});
    const matchingConversations = await Conversation.find(query).sort({ timestamp: -1 });
    const excludedCount = totalInDB - matchingConversations.length;

    // Distinct batch IDs involved
    const batchIds = [...new Set(matchingConversations.map(c => c.importBatchId).filter(Boolean))];

    // 1. conversations.json & conversations.csv
    const convRows = matchingConversations.map(c => ({
      externalId: c.externalId,
      source: c.source,
      title: c.title,
      company: c.company,
      contactName: c.contactName,
      contactEmail: c.contactEmail,
      salesRep: c.effectiveSalesRep,
      conversationType: c.conversationType,
      timestamp: c.timestamp ? c.timestamp.toISOString() : '',
      durationMinutes: c.durationMinutes,
      effectivePriority: c.effectivePriority,
      effectivePrimaryQueue: c.effectivePrimaryQueue,
      effectiveSentiment: c.effectiveSentiment,
      effectiveOwner: c.effectiveOwner,
      effectiveFollowUpStatus: c.effectiveFollowUpStatus,
      effectiveNextAction: c.effectiveNextAction,
      conflictDetected: c.routing.conflictDetected ? 'YES' : 'NO',
      summary: c.analysis.summary,
      keyPainPoint: (c.analysis.customerPainPoints && c.analysis.customerPainPoints[0]) || '',
      buyingIntent: (c.analysis.buyingIntentSignals && c.analysis.buyingIntentSignals[0]) || '',
      technicalBlocker: (c.analysis.technicalQuestions && c.analysis.technicalQuestions[0]) || '',
      reviewStatus: c.reviewStatus
    }));

    const conversationsCsv = this.objectsToCSV(convRows);
    const conversationsJson = JSON.stringify(matchingConversations, null, 2);

    // 2. routing_audit.csv
    const routingRows = matchingConversations.map(c => ({
      externalId: c.externalId,
      company: c.company,
      primaryQueue: c.routing.primaryQueue,
      effectiveQueue: c.effectivePrimaryQueue,
      calculatedPriority: c.routing.priority,
      effectivePriority: c.effectivePriority,
      priorityScore: c.routing.priorityScore,
      ruleVersion: c.routing.ruleVersion,
      matchedRulesCount: c.routing.matchedRules ? c.routing.matchedRules.length : 0,
      conflictDetected: c.routing.conflictDetected ? 'TRUE' : 'FALSE',
      conflictExplanation: c.routing.conflictExplanation || 'None',
      isManuallyOverridden: c.manualOverrides.isOverridden ? 'TRUE' : 'FALSE',
      overrideReason: c.manualOverrides.overrideReason || '',
      evaluatedAt: c.routing.evaluatedAt ? c.routing.evaluatedAt.toISOString() : ''
    }));
    const routingAuditCsv = this.objectsToCSV(routingRows);

    // 3. follow_up_actions.csv
    const followUps = await FollowUpAction.find({
      company: filters.company && filters.company !== 'All' ? filters.company : { $exists: true }
    });
    const followUpRows = followUps.map(f => ({
      actionId: f.actionId,
      externalId: f.externalId,
      company: f.company,
      task: f.task,
      assignedTo: f.assignedTo,
      dueDate: f.dueDate,
      status: f.status,
      priority: f.priority,
      sourceSnippet: f.sourceSnippet,
      createdAt: f.createdAt ? f.createdAt.toISOString() : ''
    }));
    const followUpActionsCsv = this.objectsToCSV(followUpRows);

    // 4. import_summary.csv
    const batches = await ImportBatch.find({}).sort({ importedAt: -1 });
    const batchRows = batches.map(b => ({
      batchId: b.batchId,
      filename: b.filename,
      importedAt: b.importedAt ? b.importedAt.toISOString() : '',
      totalRows: b.totalRows,
      newRecordsCount: b.newRecordsCount,
      updatedRecordsCount: b.updatedRecordsCount,
      duplicateRecordsCount: b.duplicateRecordsCount,
      ambiguousRecordsCount: b.ambiguousRecordsCount,
      rejectedRecordsCount: b.rejectedRecordsCount,
      status: b.status
    }));
    const importSummaryCsv = this.objectsToCSV(batchRows);

    // 5. corrections_audit.csv
    const corrections = await ManualCorrection.find({}).sort({ timestamp: -1 });
    const correctionRows = corrections.map(m => ({
      correctionId: m.correctionId,
      externalId: m.externalId,
      field: m.field,
      previousValue: JSON.stringify(m.previousValue),
      newValue: JSON.stringify(m.newValue),
      reason: m.reason,
      actor: m.actor,
      timestamp: m.timestamp ? m.timestamp.toISOString() : ''
    }));
    const correctionsAuditCsv = this.objectsToCSV(correctionRows);

    // 6. findings.json
    const findingsList = await FindingsService.computeFindings();
    const findingsJson = JSON.stringify(findingsList, null, 2);

    // File records map
    const fileEntries = [
      { filename: 'conversations.csv', content: conversationsCsv, count: convRows.length },
      { filename: 'conversations.json', content: conversationsJson, count: matchingConversations.length },
      { filename: 'routing_audit.csv', content: routingAuditCsv, count: routingRows.length },
      { filename: 'follow_up_actions.csv', content: followUpActionsCsv, count: followUpRows.length },
      { filename: 'import_summary.csv', content: importSummaryCsv, count: batchRows.length },
      { filename: 'corrections_audit.csv', content: correctionsAuditCsv, count: correctionRows.length },
      { filename: 'findings.json', content: findingsJson, count: findingsList.length }
    ];

    // Compute exact SHA-256 checksums and record counts
    const sha256Checksums = {};
    const filesMetadata = [];

    fileEntries.forEach(entry => {
      const hash = this.computeChecksum(entry.content);
      sha256Checksums[entry.filename] = hash;
      filesMetadata.push({
        filename: entry.filename,
        recordCount: entry.count,
        sha256: hash,
        sizeBytes: Buffer.byteLength(entry.content, 'utf8')
      });
    });

    // 7. manifest.json
    const manifestData = {
      exportId,
      exportTimestamp,
      applicationVersion: '1.0.0',
      exportedFilenames: fileEntries.map(e => e.filename),
      recordCounts: filesMetadata.reduce((acc, f) => { acc[f.filename] = f.recordCount; return acc; }, {}),
      appliedFilters: filters,
      sourceImportBatchIds: batchIds,
      dataSchemaVersion: '1.4.0',
      analysisAndRoutingRuleVersions: RoutingService.RULE_VERSION,
      processingStatus: 'Completed',
      warningsAndExcludedRecordCounts: {
        excludedDueToFilter: excludedCount,
        validationWarnings: 0
      },
      sha256Checksums
    };

    const manifestJson = JSON.stringify(manifestData, null, 2);
    const manifestHash = this.computeChecksum(manifestJson);
    filesMetadata.push({
      filename: 'manifest.json',
      recordCount: Object.keys(manifestData).length,
      sha256: manifestHash,
      sizeBytes: Buffer.byteLength(manifestJson, 'utf8')
    });

    // Save files to disk in backend exports_storage
    const storageDir = path.resolve(ENV.EXPORT_DIR, exportId);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    fileEntries.forEach(entry => {
      fs.writeFileSync(path.join(storageDir, entry.filename), entry.content, 'utf8');
    });
    fs.writeFileSync(path.join(storageDir, 'manifest.json'), manifestJson, 'utf8');

    // Generate README.txt for the ZIP package
    const readmeContent = `Revenue Intelligence Inbox - Export Package
==================================================
Export ID: ${exportId}
Export Date: ${exportTimestamp}
Application Version: 1.0.0
Schema Version: 1.4.0
Rule Version: ${RoutingService.RULE_VERSION}

Contents:
- conversations.csv: Exported conversations (${convRows.length} records)
- conversations.json: Complete structured metadata and transcripts
- routing_audit.csv: Explainable queue decisions and score breakdowns
- follow_up_actions.csv: Active commitments and action items
- import_summary.csv: Provenance and batch duplicate/update statistics
- corrections_audit.csv: Human-in-the-loop manual override history
- findings.json: Executive insights and documented rejected decisions
- manifest.json: Verified SHA-256 checksums and filter criteria

Filters Applied:
${JSON.stringify(filters, null, 2)}
`;
    fs.writeFileSync(path.join(storageDir, 'README.txt'), readmeContent, 'utf8');

    // Build ZIP package
    const zipFilename = `${exportId}_all_exports.zip`;
    const zipFilePath = path.join(storageDir, zipFilename);
    await this.createZipArchive(storageDir, zipFilePath, [...fileEntries.map(e => e.filename), 'manifest.json', 'README.txt']);

    // Persist ExportJob
    const exportJob = await ExportJob.create({
      exportId,
      createdAt: new Date(),
      filterCriteria: filters,
      filesGenerated: filesMetadata,
      totalRecords: convRows.length,
      manifestData,
      zipFilename,
      status: 'Completed'
    });

    return {
      exportId,
      manifestData,
      filesMetadata,
      zipFilename,
      exportJobId: exportJob._id
    };
  }

  /**
   * Archives files into a ZIP archive using archiver
   */
  static createZipArchive(sourceDir, zipFilePath, fileList) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(zipFilePath));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      fileList.forEach(file => {
        const filePath = path.join(sourceDir, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
        }
      });
      archive.finalize();
    });
  }
}
