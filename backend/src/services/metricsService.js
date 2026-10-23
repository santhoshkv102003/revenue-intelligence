import { Conversation } from '../models/Conversation.js';
import { FollowUpAction } from '../models/FollowUpAction.js';
import { ImportBatch } from '../models/ImportBatch.js';

export class MetricsService {
  /**
   * Computes dynamic dashboard metrics strictly from database records,
   * respecting any applied query filters.
   */
  static async computeDashboardMetrics(filters = {}) {
    const query = {};

    if (filters.salesRep && filters.salesRep !== 'All') {
      query.effectiveSalesRep = filters.salesRep;
    }
    if (filters.company && filters.company !== 'All') {
      query.company = filters.company;
    }
    if (filters.priority && filters.priority !== 'All') {
      query.effectivePriority = filters.priority;
    }
    if (filters.source && filters.source !== 'All') {
      query.source = filters.source;
    }
    if (filters.primaryQueue && filters.primaryQueue !== 'All') {
      query.effectivePrimaryQueue = filters.primaryQueue;
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    // 1. Core Summary Metrics
    const totalConversations = await Conversation.countDocuments(query);
    
    // Distinct external IDs
    const distinctExternalIds = await Conversation.distinct('externalId', query);
    const totalUniqueConversations = distinctExternalIds.length;

    // Follow-up required count
    const followUpRequiredCount = await Conversation.countDocuments({
      ...query,
      $or: [
        { effectivePrimaryQueue: 'Follow-up Required' },
        { effectiveFollowUpStatus: 'Open' }
      ]
    });

    // High / Urgent Priority Count
    const highPriorityCount = await Conversation.countDocuments({
      ...query,
      effectivePriority: { $in: ['High', 'Urgent'] }
    });

    // Open follow-up action items
    const openFollowUpsCount = await FollowUpAction.countDocuments({
      status: { $in: ['Open', 'In Progress'] }
    });

    // Average duration
    const durationAggregation = await Conversation.aggregate([
      { $match: query },
      { $group: { _id: null, avgDuration: { $avg: '$durationMinutes' }, totalDuration: { $sum: '$durationMinutes' } } }
    ]);
    const avgDuration = durationAggregation[0] ? Math.round(durationAggregation[0].avgDuration) : 0;

    // Completed vs Upcoming Meetings
    const completedMeetingsCount = await Conversation.countDocuments({
      ...query,
      sourceStatus: { $in: ['Completed', 'completed', 'Finished'] }
    });
    const upcomingMeetingsCount = await Conversation.countDocuments({
      ...query,
      sourceStatus: { $in: ['Scheduled', 'scheduled', 'Upcoming'] }
    });

    // 2. Sentiment Distribution
    const sentimentAgg = await Conversation.aggregate([
      { $match: query },
      { $group: { _id: '$effectiveSentiment', count: { $sum: 1 } } }
    ]);
    const sentimentDistribution = {
      Positive: 0,
      Neutral: 0,
      Negative: 0
    };
    sentimentAgg.forEach(item => {
      if (item._id && sentimentDistribution[item._id] !== undefined) {
        sentimentDistribution[item._id] = item.count;
      }
    });

    // 3. Priority Distribution
    const priorityAgg = await Conversation.aggregate([
      { $match: query },
      { $group: { _id: '$effectivePriority', count: { $sum: 1 } } }
    ]);
    const priorityDistribution = {
      Urgent: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    priorityAgg.forEach(item => {
      if (item._id && priorityDistribution[item._id] !== undefined) {
        priorityDistribution[item._id] = item.count;
      }
    });

    // 4. Queue Distribution
    const queueAgg = await Conversation.aggregate([
      { $match: query },
      { $group: { _id: '$effectivePrimaryQueue', count: { $sum: 1 } } }
    ]);
    const queueDistribution = queueAgg.map(q => ({
      name: q._id || 'Unassigned',
      count: q.count
    }));

    // 5. Breakdown by Salesperson
    const repAgg = await Conversation.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: '$effectiveSalesRep', 
          count: { $sum: 1 },
          urgentCount: { 
            $sum: { $cond: [{ $in: ['$effectivePriority', ['Urgent', 'High']] }, 1, 0] } 
          },
          avgDuration: { $avg: '$durationMinutes' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const conversationsByRep = repAgg.map(r => ({
      salesRep: r._id || 'Unassigned',
      count: r.count,
      highPriority: r.urgentCount,
      avgDuration: Math.round(r.avgDuration || 0)
    }));

    // 6. Breakdown by Company / Account
    const companyAgg = await Conversation.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: '$company', 
          count: { $sum: 1 },
          riskCount: { 
            $sum: { $cond: [{ $eq: ['$effectivePrimaryQueue', 'Customer Risk'] }, 1, 0] } 
          }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const conversationsByCompany = companyAgg.map(c => ({
      company: c._id || 'Unknown',
      count: c.count,
      riskCount: c.riskCount
    }));

    // 7. Conversation Trends Over Time
    const trendAgg = await Conversation.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          highPriority: {
            $sum: { $cond: [{ $in: ['$effectivePriority', ['Urgent', 'High']] }, 1, 0] }
          },
          positiveCount: {
            $sum: { $cond: [{ $eq: ['$effectiveSentiment', 'Positive'] }, 1, 0] }
          },
          negativeCount: {
            $sum: { $cond: [{ $eq: ['$effectiveSentiment', 'Negative'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const conversationTrends = trendAgg.map(t => ({
      date: t._id,
      count: t.count,
      highPriority: t.highPriority,
      positive: t.positiveCount,
      negative: t.negativeCount
    }));

    // 8. Import Statistics Aggregate
    const importStatsAgg = await ImportBatch.aggregate([
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          newRecords: { $sum: '$newRecordsCount' },
          updatedRecords: { $sum: '$updatedRecordsCount' },
          duplicateRecords: { $sum: '$duplicateRecordsCount' },
          ambiguousRecords: { $sum: '$ambiguousRecordsCount' },
          rejectedRecords: { $sum: '$rejectedRecordsCount' }
        }
      }
    ]);
    const importStats = importStatsAgg[0] || {
      totalBatches: 0,
      newRecords: 0,
      updatedRecords: 0,
      duplicateRecords: 0,
      ambiguousRecords: 0,
      rejectedRecords: 0
    };

    // Filter Options for Dropdowns
    const distinctReps = await Conversation.distinct('effectiveSalesRep');
    const distinctCompanies = await Conversation.distinct('company');
    const distinctSources = await Conversation.distinct('source');

    return {
      summary: {
        totalConversations,
        totalUniqueConversations,
        followUpRequiredCount,
        highPriorityCount,
        openFollowUpsCount,
        avgDurationMinutes: avgDuration,
        completedMeetingsCount,
        upcomingMeetingsCount,
        conflictsCount: await Conversation.countDocuments({ ...query, 'routing.conflictDetected': true }),
        manualOverridesCount: await Conversation.countDocuments({ ...query, 'manualOverrides.isOverridden': true })
      },
      sentimentDistribution,
      priorityDistribution,
      queueDistribution,
      conversationsByRep,
      conversationsByCompany,
      conversationTrends,
      importStats,
      filterOptions: {
        salesReps: distinctReps.filter(Boolean).sort(),
        companies: distinctCompanies.filter(Boolean).sort(),
        sources: distinctSources.filter(Boolean).sort(),
        priorities: ['Urgent', 'High', 'Medium', 'Low'],
        queues: [
          'High Priority',
          'Follow-up Required',
          'Customer Risk',
          'Pricing and Negotiation',
          'Technical Questions',
          'Positive Buying Signals',
          'General Conversations',
          'Unassigned / Needs Review'
        ]
      }
    };
  }
}
