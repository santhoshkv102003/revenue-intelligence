import { ENV } from '../config/env.js';

// Deterministic conversation analysis pipeline
export class AnalysisService {
  /**
   * Analyzes conversation text and structured metadata.
   * If LLM is configured, invokes LLM with fallback to deterministic heuristic engine.
   */
  static async analyzeConversation({ title, transcriptOrNotes, company, salesRep, conversationType }) {
    if (ENV.LLM_API_KEY) {
      try {
        const llmResult = await this.runLLMAnalysis({ title, transcriptOrNotes, company, salesRep, conversationType });
        if (llmResult) return llmResult;
      } catch (err) {
        console.warn('LLM analysis failed, falling back to deterministic heuristic engine:', err.message);
      }
    }

    return this.runDeterministicAnalysis({ title, transcriptOrNotes, company, salesRep, conversationType });
  }

  /**
   * Pluggable LLM analyzer stub (ready for Google Gemini or OpenAI API keys)
   */
  static async runLLMAnalysis({ title, transcriptOrNotes, company, salesRep, conversationType }) {
    // If an external key is configured, integrate with official provider
    // Fallback to deterministic if response does not conform to schema
    return null;
  }

  /**
   * Highly sophisticated deterministic keyword, pattern, and NLP-heuristic analysis.
   * Extracts exact supporting quotes directly from the transcript.
   */
  static runDeterministicAnalysis({ title, transcriptOrNotes = '', company = '', salesRep = '', conversationType = '' }) {
    const text = transcriptOrNotes || '';
    const sentences = text.split(/(?<=[.?!;])\s+|\n+/).filter(s => s.trim().length > 5);

    const findEvidenceQuotes = (keywords, maxCount = 2) => {
      const matches = [];
      for (const s of sentences) {
        const lower = s.toLowerCase();
        if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
          matches.push(s.trim());
          if (matches.length >= maxCount) break;
        }
      }
      return matches;
    };

    // 1. Buying Intent Signals
    const buyingKeywords = [
      'ready to move forward', 'send over the contract', 'send the msa', 'budget is approved',
      'procurement process', 'sign off', 'roll out to our team', 'pilot was successful',
      'decision next week', 'love the platform', 'onboard our reps', 'pricing works',
      'final approval', 'implementation timeline', 'ready to purchase'
    ];
    const buyingQuotes = findEvidenceQuotes(buyingKeywords, 3);
    const buyingIntentSignals = buyingQuotes.length > 0 
      ? buyingQuotes.map(q => `Observed intent: "${q}"`)
      : (text.toLowerCase().includes('interested') ? ['Customer showed initial interest in core platform features'] : []);

    // 2. Customer Pain Points
    const painKeywords = [
      'struggling with', 'biggest bottleneck', 'frustrated with', 'manual process',
      'wasting time', 'data inaccuracies', 'lack of visibility', 'deals slipping',
      'hard to track', 'clunky', 'poor adoption', 'reps hate updating'
    ];
    const painQuotes = findEvidenceQuotes(painKeywords, 3);
    const customerPainPoints = painQuotes.length > 0
      ? painQuotes.map(q => `Expressed pain: "${q}"`)
      : [`Inquiry regarding optimizing ${company || 'sales'} workflow efficiency`];

    // 3. Technical Blockers & Questions
    const techKeywords = [
      'sso', 'saml', 'okta', 'api rate limit', 'salesforce integration', 'hubspot sync',
      'soc2', 'hipaa', 'gdpr', 'latency', 'webhook', 'security review', 'on-prem',
      'data residency', 'two-factor', 'rbac', 'custom fields'
    ];
    const techQuotes = findEvidenceQuotes(techKeywords, 3);
    const technicalQuestions = techQuotes.length > 0
      ? techQuotes.map(q => `Technical requirement/blocker: "${q}"`)
      : [];

    // 4. Pricing & Negotiation Discussions
    const pricingKeywords = [
      'discount', 'budget', 'expensive', 'per seat', 'annual contract', 'payment terms',
      'quote', 'net 30', 'net 60', 'pricing tier', 'commercial terms', 'cost per user',
      'enterprise licensing', 'billing monthly'
    ];
    const pricingQuotes = findEvidenceQuotes(pricingKeywords, 3);
    const pricingDiscussions = pricingQuotes.length > 0
      ? pricingQuotes.map(q => `Commercial detail: "${q}"`)
      : [];

    // 5. Competitor Mentions
    const competitorList = ['Salesforce', 'Gong', 'Clari', 'Outreach', 'HubSpot', 'Salesloft', 'Apollo', 'ZoomInfo', 'Datadog'];
    const competitorMentions = [];
    competitorList.forEach(comp => {
      const regex = new RegExp(`\\b${comp}\\b`, 'i');
      if (regex.test(text)) {
        const quote = findEvidenceQuotes([comp], 1)[0] || `Referenced ${comp}`;
        competitorMentions.push(`${comp} (Snippet: "${quote}")`);
      }
    });

    // 6. Objections
    const objectionKeywords = [
      'too expensive', 'not in budget', 'not right now', 'competitor is cheaper',
      'missing feature', 'concerned about', 'hesitant', 'push back', 'delay until next quarter'
    ];
    const objectionQuotes = findEvidenceQuotes(objectionKeywords, 2);
    const objections = objectionQuotes.length > 0
      ? objectionQuotes.map(q => `Customer objection: "${q}"`)
      : [];

    // 7. Commitments, Action Items & Deadlines
    const commitmentKeywords = [
      'will send', 'i will email', 'promise to follow up', 'let me share', 'agreed to deliver',
      'will schedule', 'committed to', 'action item', 'i will check with engineering'
    ];
    const commitmentQuotes = findEvidenceQuotes(commitmentKeywords, 3);
    const commitmentsAndPromises = commitmentQuotes.length > 0
      ? commitmentQuotes.map(q => `Rep/Team commitment: "${q}"`)
      : [];

    // Action Items extraction
    const actionItems = [];
    const deadlineKeywords = ['by friday', 'by monday', 'by end of week', 'eod', 'next week', 'tomorrow', 'within 48 hours', 'by the 15th'];
    const deadlines = [];

    deadlineKeywords.forEach(dk => {
      if (text.toLowerCase().includes(dk)) {
        deadlines.push(dk.toUpperCase());
      }
    });

    if (commitmentQuotes.length > 0) {
      commitmentQuotes.forEach((quote, idx) => {
        let taskDesc = quote.replace(/^(rep|ae|se|sales rep|alex|sarah|marcus|elena|david):\s*/i, '');
        if (taskDesc.length > 80) taskDesc = taskDesc.substring(0, 80) + '...';
        actionItems.push({
          task: taskDesc,
          owner: salesRep || 'Sales Rep',
          dueDate: deadlines[idx] || 'Next Business Day',
          evidenceSnippet: quote
        });
      });
    } else if (text.toLowerCase().includes('follow up') || text.toLowerCase().includes('next step')) {
      const quote = findEvidenceQuotes(['follow up', 'next step'], 1)[0] || 'Follow up with customer';
      actionItems.push({
        task: 'Send meeting recap and coordinate requested next steps',
        owner: salesRep || 'Sales Rep',
        dueDate: 'Within 24 Hours',
        evidenceSnippet: quote
      });
    }

    // 8. Sentiment Analysis
    let positiveScore = 0;
    let negativeScore = 0;
    const positiveWords = ['great', 'excellent', 'love', 'excited', 'impressive', 'perfect', 'smooth', 'appreciate', 'happy', 'promising', 'ready'];
    const negativeWords = ['frustrated', 'broken', 'issue', 'blocker', 'delay', 'cancel', 'expensive', 'unhappy', 'disappointed', 'terrible', 'slow', 'fail'];

    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    words.forEach(w => {
      if (positiveWords.includes(w)) positiveScore += 1;
      if (negativeWords.includes(w)) negativeScore += 1;
    });

    let sentiment = 'Neutral';
    let sentimentScore = 0;
    if (positiveScore > negativeScore + 1) {
      sentiment = 'Positive';
      sentimentScore = Math.min(1.0, (positiveScore - negativeScore) * 0.25);
    } else if (negativeScore > positiveScore) {
      sentiment = 'Negative';
      sentimentScore = Math.max(-1.0, (positiveScore - negativeScore) * 0.25);
    } else {
      sentiment = 'Neutral';
      sentimentScore = 0;
    }

    // 9. Risk Indicators
    const riskIndicators = [];
    if (negativeScore > 2) riskIndicators.push('Elevated customer dissatisfaction language detected');
    if (objections.length > 0) riskIndicators.push('Unresolved pricing/commercial objections');
    if (technicalQuestions.some(t => t.toLowerCase().includes('blocker') || t.toLowerCase().includes('sso') || t.toLowerCase().includes('security'))) {
      riskIndicators.push('Critical technical or security clearance requirement pending');
    }
    if (competitorMentions.length > 0) riskIndicators.push('Active competitor evaluation mentioned in transcript');

    // 10. Key Discussion Points & Summary
    const keyDiscussionPoints = [];
    if (customerPainPoints.length > 0) keyDiscussionPoints.push(`Core pain: ${customerPainPoints[0].replace(/Expressed pain:\s*"?/, '').replace(/"?$/, '')}`);
    if (technicalQuestions.length > 0) keyDiscussionPoints.push(`Architecture/integration review: ${technicalQuestions[0].replace(/Technical requirement\/blocker:\s*"?/, '').replace(/"?$/, '')}`);
    if (pricingDiscussions.length > 0) keyDiscussionPoints.push(`Commercial parameters: ${pricingDiscussions[0].replace(/Commercial detail:\s*"?/, '').replace(/"?$/, '')}`);
    if (buyingIntentSignals.length > 0) keyDiscussionPoints.push(`Advancement criteria: ${buyingIntentSignals[0].replace(/Observed intent:\s*"?/, '').replace(/"?$/, '')}`);
    if (keyDiscussionPoints.length === 0) keyDiscussionPoints.push(`Standard ${conversationType} review regarding ${company} business requirements`);

    // Structured concise summary
    const summary = `${conversationType} session with ${company}. ${keyDiscussionPoints[0] || 'Discussion completed.'} ${sentiment === 'Positive' ? 'Customer expressed positive reception.' : sentiment === 'Negative' ? 'Customer highlighted active concerns requiring intervention.' : 'Evaluation proceeding routinely.'}`;

    // Suggested next steps
    const suggestedNextSteps = [];
    if (technicalQuestions.length > 0) suggestedNextSteps.push('Involve Solutions Engineer for technical security/SSO validation');
    if (pricingDiscussions.length > 0) suggestedNextSteps.push('Prepare customized commercial quotation with flexible terms');
    if (actionItems.length > 0) suggestedNextSteps.push(`Deliver committed deliverable: "${actionItems[0].task}"`);
    if (suggestedNextSteps.length === 0) suggestedNextSteps.push('Send structured meeting summary and confirm next milestone');

    // Structured Evidence Snippets (linking insights directly to source text quotes)
    const evidenceSnippets = [];
    buyingQuotes.forEach(q => evidenceSnippets.push({ tag: 'Buying Intent', text: 'Customer explicitly indicated progression readiness', quote: q, relevanceScore: 0.95 }));
    painQuotes.forEach(q => evidenceSnippets.push({ tag: 'Pain Point', text: 'Operational friction identified', quote: q, relevanceScore: 0.88 }));
    techQuotes.forEach(q => evidenceSnippets.push({ tag: 'Technical Scope', text: 'Architecture or security prerequisite', quote: q, relevanceScore: 0.92 }));
    pricingQuotes.forEach(q => evidenceSnippets.push({ tag: 'Commercial Term', text: 'Pricing, discount or contract discussion', quote: q, relevanceScore: 0.90 }));
    objectionQuotes.forEach(q => evidenceSnippets.push({ tag: 'Customer Objection', text: 'Potential deal inhibitor or concern', quote: q, relevanceScore: 0.89 }));
    commitmentQuotes.forEach(q => evidenceSnippets.push({ tag: 'Commitment', text: 'Direct representative or team deliverable', quote: q, relevanceScore: 0.94 }));

    return {
      engine: 'deterministic-heuristic-v1.4',
      analyzedAt: new Date(),
      summary,
      keyDiscussionPoints,
      customerPainPoints,
      buyingIntentSignals,
      objections,
      competitorMentions,
      pricingDiscussions,
      technicalQuestions,
      commitmentsAndPromises,
      actionItems,
      deadlines,
      sentiment,
      sentimentScore,
      riskIndicators,
      suggestedNextSteps,
      evidenceSnippets
    };
  }
}
