// Explainable Routing Engine with Conflict Resolution and Transparent Scoring
export class RoutingService {
  static RULE_VERSION = 'v1.4.0-composite';

  /**
   * Evaluates analysis results and metadata to determine queue assignments,
   * priority score, rule evidence, and conflict explanations.
   */
  static evaluateRouting(conversationData, analysisResult) {
    const assignedQueues = new Set();
    const matchedRules = [];
    let urgencyScore = 0;
    let customerRiskScore = 0;
    let buyingIntentScore = 0;
    let technicalBlockerScore = 0;
    let deadlineProximityScore = 0;
    let commitmentsScore = 0;

    const transcript = (conversationData.transcriptOrNotes || '').toLowerCase();
    const analysis = analysisResult || {};
    const painPoints = analysis.customerPainPoints || [];
    const buyingSignals = analysis.buyingIntentSignals || [];
    const objections = analysis.objections || [];
    const technicalQuestions = analysis.technicalQuestions || [];
    const pricingDiscussions = analysis.pricingDiscussions || [];
    const commitments = analysis.commitmentsAndPromises || [];
    const actionItems = analysis.actionItems || [];
    const deadlines = analysis.deadlines || [];
    const sentiment = analysis.sentiment || 'Neutral';

    // Rule 1: Customer Risk
    const churnKeywords = ['cancel', 'churn', 'unacceptable', 'disappointed', 'terrible experience', 'escalate', 'breach of contract', 'legal team', 'unhappy with support'];
    const hasRiskKeywords = churnKeywords.some(kw => transcript.includes(kw));
    if (hasRiskKeywords || sentiment === 'Negative' || objections.length >= 2) {
      assignedQueues.add('Customer Risk');
      const snippet = hasRiskKeywords ? `Customer dissatisfaction language detected in transcript` : `Multiple customer objections/negative sentiment logged`;
      matchedRules.push({
        ruleId: 'RULE-RISK-01',
        ruleName: 'Customer Dissatisfaction & Churn Risk',
        queue: 'Customer Risk',
        weight: 35,
        snippet
      });
      customerRiskScore = hasRiskKeywords ? 35 : 20;
    }

    // Rule 2: Positive Buying Signals
    if (buyingSignals.length > 0 || transcript.includes('ready to sign') || transcript.includes('send over the contract') || transcript.includes('procurement')) {
      assignedQueues.add('Positive Buying Signals');
      matchedRules.push({
        ruleId: 'RULE-BUY-01',
        ruleName: 'Commercial Progression & Buying Intent',
        queue: 'Positive Buying Signals',
        weight: 30,
        snippet: buyingSignals[0] || 'Direct purchasing intent or contract request'
      });
      buyingIntentScore = 30;
    }

    // Rule 3: Technical Questions & Blockers
    if (technicalQuestions.length > 0 || transcript.includes('sso') || transcript.includes('api rate limit') || transcript.includes('integration') || transcript.includes('security review')) {
      assignedQueues.add('Technical Questions');
      matchedRules.push({
        ruleId: 'RULE-TECH-01',
        ruleName: 'Architecture, Security & Integration Prerequisites',
        queue: 'Technical Questions',
        weight: 25,
        snippet: technicalQuestions[0] || 'Technical architecture or security inquiry'
      });
      technicalBlockerScore = 25;
    }

    // Rule 4: Pricing and Negotiation
    if (pricingDiscussions.length > 0 || transcript.includes('discount') || transcript.includes('budget') || transcript.includes('net 30') || transcript.includes('per seat')) {
      assignedQueues.add('Pricing and Negotiation');
      matchedRules.push({
        ruleId: 'RULE-PRICE-01',
        ruleName: 'Commercial Terms & Discount Negotiation',
        queue: 'Pricing and Negotiation',
        weight: 25,
        snippet: pricingDiscussions[0] || 'Pricing tier or contract terms discussed'
      });
    }

    // Rule 5: Follow-up Required
    if (commitments.length > 0 || actionItems.length > 0 || transcript.includes('promised') || transcript.includes('i will send')) {
      assignedQueues.add('Follow-up Required');
      matchedRules.push({
        ruleId: 'RULE-FOL-01',
        ruleName: 'Explicit Team Commitments & Pending Deliverables',
        queue: 'Follow-up Required',
        weight: 20,
        snippet: (actionItems[0] && actionItems[0].task) || commitments[0] || 'Follow-up deliverable identified'
      });
      commitmentsScore = 20;
    }

    // Rule 6: Deadline Proximity & Urgency
    if (deadlines.length > 0 || transcript.includes('urgent') || transcript.includes('eod') || transcript.includes('asap') || transcript.includes('by tomorrow')) {
      deadlineProximityScore = 25;
      urgencyScore = 20;
    }

    // High Priority Evaluation
    const totalPriorityScore = Math.min(100, (
      urgencyScore +
      customerRiskScore +
      buyingIntentScore +
      technicalBlockerScore +
      deadlineProximityScore +
      commitmentsScore
    ));

    let priority = 'Medium';
    if (totalPriorityScore >= 75) {
      priority = 'Urgent';
      assignedQueues.add('High Priority');
    } else if (totalPriorityScore >= 50) {
      priority = 'High';
      assignedQueues.add('High Priority');
    } else if (totalPriorityScore < 25) {
      priority = 'Low';
    }

    // Conflict Resolution Handling
    let conflictDetected = false;
    let conflictExplanation = '';
    let primaryQueue = 'General Conversations';

    // Competing Signals: e.g. Positive Buying Signal vs Critical Technical Blocker or Customer Risk
    const hasBuying = assignedQueues.has('Positive Buying Signals');
    const hasTech = assignedQueues.has('Technical Questions');
    const hasRisk = assignedQueues.has('Customer Risk');
    const hasFollowUp = assignedQueues.has('Follow-up Required');
    const hasPricing = assignedQueues.has('Pricing and Negotiation');

    if (hasBuying && hasTech) {
      conflictDetected = true;
      conflictExplanation = 'Competing signals: Customer showed strong buying intent but requires critical technical/integration validation (e.g. SSO/API). High revenue opportunity at risk if technical verification stalls.';
      primaryQueue = 'Technical Questions'; // Escalate technical clearance to unblock the deal
    } else if (hasBuying && hasRisk) {
      conflictDetected = true;
      conflictExplanation = 'High-tension conflict: Customer wants to adopt product but reported severe past friction or support dissatisfaction. Risk of churn before contract execution.';
      primaryQueue = 'Customer Risk';
    } else if (hasRisk) {
      primaryQueue = 'Customer Risk';
    } else if (hasBuying) {
      primaryQueue = 'Positive Buying Signals';
    } else if (hasTech) {
      primaryQueue = 'Technical Questions';
    } else if (hasPricing) {
      primaryQueue = 'Pricing and Negotiation';
    } else if (hasFollowUp) {
      primaryQueue = 'Follow-up Required';
    } else {
      primaryQueue = assignedQueues.size > 0 ? Array.from(assignedQueues)[0] : 'General Conversations';
    }

    if (assignedQueues.size === 0) {
      assignedQueues.add('Unassigned / Needs Review');
      primaryQueue = 'Unassigned / Needs Review';
    }

    // Transparent Explanation String
    const queueListStr = Array.from(assignedQueues).join(', ');
    const explanation = `Assigned to [${primaryQueue}] with ${priority} priority (Score: ${totalPriorityScore}/100). Matched ${matchedRules.length} rule(s): ${matchedRules.map(r => r.ruleName).join('; ')}.${conflictDetected ? ' Note: ' + conflictExplanation : ''}`;

    return {
      primaryQueue,
      assignedQueues: Array.from(assignedQueues),
      priority,
      priorityScore: totalPriorityScore,
      routingScore: totalPriorityScore,
      scoreBreakdown: {
        urgency: urgencyScore,
        customerRisk: customerRiskScore,
        buyingIntent: buyingIntentScore,
        technicalBlocker: technicalBlockerScore,
        deadlineProximity: deadlineProximityScore,
        commitments: commitmentsScore
      },
      matchedRules,
      ruleVersion: this.RULE_VERSION,
      explanation,
      conflictDetected,
      conflictExplanation,
      evaluatedAt: new Date()
    };
  }
}
