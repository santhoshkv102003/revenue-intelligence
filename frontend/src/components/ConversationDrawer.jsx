import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Tabs,
  Typography,
  Space,
  Button,
  Tag,
  Form,
  Select,
  Input,
  Descriptions,
  Table,
  Alert,
  Divider,
  message,
  Card,
  Popconfirm,
  Badge
} from 'antd';
import {
  EditOutlined,
  ReloadOutlined,
  UndoOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { ConversationAPI } from '../services/api.js';
import QueueTag from './QueueTag.jsx';
import PriorityTag from './PriorityTag.jsx';
import SentimentTag from './SentimentTag.jsx';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export function ConversationDrawer({ conversationId, open, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchDetails = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await ConversationAPI.get(conversationId);
      setData(res.conversation);
      setCorrections(res.corrections || []);

      const conv = res.conversation;
      form.setFieldsValue({
        priority: conv.manualOverrides?.priority || conv.routing?.priority || 'Medium',
        primaryQueue: conv.manualOverrides?.primaryQueue || conv.routing?.primaryQueue || 'General Conversations',
        sentiment: conv.manualOverrides?.sentiment || conv.analysis?.sentiment || 'Neutral',
        assignedSalesRep: conv.manualOverrides?.assignedSalesRep || conv.salesRep,
        owner: conv.manualOverrides?.owner || conv.effectiveOwner,
        followUpStatus: conv.manualOverrides?.followUpStatus || conv.effectiveFollowUpStatus,
        nextAction: conv.manualOverrides?.nextAction || conv.effectiveNextAction,
        notes: conv.manualOverrides?.notes || '',
        reason: ''
      });
    } catch (err) {
      message.error(`Failed to load conversation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && conversationId) {
      fetchDetails();
    }
  }, [open, conversationId]);

  const handleSaveOverride = async (values) => {
    if (!values.reason) {
      message.warning('Please enter a brief reason for the manual change.');
      return;
    }
    setSaving(true);
    try {
      await ConversationAPI.override(conversationId, {
        priority: values.priority,
        primaryQueue: values.primaryQueue,
        sentiment: values.sentiment,
        assignedSalesRep: values.assignedSalesRep,
        owner: values.owner,
        followUpStatus: values.followUpStatus,
        nextAction: values.nextAction,
        notes: values.notes,
        reason: values.reason,
        actor: 'Sales Operations Manager'
      });
      message.success('Manual override and audit log saved successfully');
      fetchDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      message.error(`Override failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetField = async (field) => {
    try {
      await ConversationAPI.resetField(conversationId, { field });
      message.success(`Field "${field}" reset to source/heuristic value`);
      fetchDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      message.error(`Reset failed: ${err.message}`);
    }
  };

  const handleReanalyze = async () => {
    setLoading(true);
    try {
      await ConversationAPI.reanalyze(conversationId);
      message.success('Conversation re-analyzed! Manual overrides were preserved.');
      fetchDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      message.error(`Re-analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return (
      <Drawer open={open} onClose={onClose} width={800} title="Loading conversation...">
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading conversation records...</div>
      </Drawer>
    );
  }

  if (!data) return null;

  const conv = data;
  const analysis = conv.analysis || {};
  const routing = conv.routing || {};
  const overrides = conv.manualOverrides || {};

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={850}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <Space>
              <Text strong style={{ fontSize: '16px' }}>{conv.company}</Text>
              <Tag color="geekblue" className="font-mono">{conv.externalId}</Tag>
              {overrides.isOverridden && <Tag color="purple">Manual Override Active</Tag>}
            </Space>
            <div>
              <Text type="secondary" style={{ fontSize: '13px' }}>{conv.title}</Text>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReanalyze} loading={loading} size="small">
              Re-analyze
            </Button>
          </Space>
        </div>
      }
    >
      {/* Top Banner Metadata */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Contact">{conv.contactName} ({conv.contactEmail || 'No email'})</Descriptions.Item>
          <Descriptions.Item label="Sales Rep">{conv.effectiveSalesRep}</Descriptions.Item>
          <Descriptions.Item label="Date & Time">{new Date(conv.timestamp).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Duration">{conv.durationMinutes} mins</Descriptions.Item>
          <Descriptions.Item label="Source">{conv.source}</Descriptions.Item>
          <Descriptions.Item label="Effective Queue">
            <QueueTag queue={conv.effectivePrimaryQueue} />
          </Descriptions.Item>
          <Descriptions.Item label="Priority">
            <PriorityTag priority={conv.effectivePriority} score={routing.priorityScore} />
          </Descriptions.Item>
          <Descriptions.Item label="Sentiment">
            <SentimentTag sentiment={conv.effectiveSentiment} score={analysis.sentimentScore} />
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* Conflict Notice if present */}
      {routing.conflictDetected && (
        <Alert
          message="Routing Ambiguity / Competing Signals Detected"
          description={routing.conflictExplanation}
          type="warning"
          showIcon
          style={{ marginBottom: '20px', borderRadius: '8px' }}
        />
      )}

      {/* Tabs */}
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: <span><FileTextOutlined /> Transcript & Evidence</span>,
          children: (
            <div>
              <Card title="Structured Summary" size="small" style={{ marginBottom: '16px', background: '#faf5ff', borderColor: '#e9d5ff' }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {analysis.summary || 'Summary unavailable.'}
                </Paragraph>
              </Card>

              <Title level={5}>Source Transcript / Notes</Title>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '350px',
                  overflowY: 'auto',
                  fontSize: '13px'
                }}
              >
                {conv.transcriptOrNotes}
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <Title level={5}>Key Supporting Evidence Snippets</Title>
              {analysis.evidenceSnippets && analysis.evidenceSnippets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analysis.evidenceSnippets.map((snippet, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #6366f1',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Tag color="blue">{snippet.tag}</Tag>
                        <Text type="secondary" style={{ fontSize: '11px' }}>Confidence: {Math.round(snippet.relevanceScore * 100)}%</Text>
                      </div>
                      <Paragraph italic style={{ marginBottom: '4px', color: '#1e293b' }}>
                        "{snippet.quote}"
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: '12px' }}>{snippet.text}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No specific snippet tags extracted.</Text>
              )}
            </div>
          )
        },
        {
          key: '2',
          label: <span><ThunderboltOutlined /> Extracted Insights</span>,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text strong>Customer Pain Points:</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {analysis.customerPainPoints?.map((p, i) => <li key={i}>{p}</li>) || <li>None identified</li>}
                </ul>
              </div>

              <div>
                <Text strong>Buying Intent Signals:</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {analysis.buyingIntentSignals?.map((b, i) => <li key={i} style={{ color: '#166534', fontWeight: 500 }}>{b}</li>) || <li>None observed</li>}
                </ul>
              </div>

              <div>
                <Text strong>Technical Prerequisites & Blockers:</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {analysis.technicalQuestions?.map((t, i) => <li key={i} style={{ color: '#1e40af' }}>{t}</li>) || <li>No blockers raised</li>}
                </ul>
              </div>

              <div>
                <Text strong>Commercial & Pricing Details:</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {analysis.pricingDiscussions?.map((pr, i) => <li key={i}>{pr}</li>) || <li>No pricing discussions logged</li>}
                </ul>
              </div>

              <div>
                <Text strong>Competitor Mentions:</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {analysis.competitorMentions?.map((comp, i) => <li key={i}><Tag color="geekblue">{comp}</Tag></li>) || <li>No competitors mentioned</li>}
                </ul>
              </div>

              <div>
                <Text strong>Action Items & Commitments:</Text>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={analysis.actionItems?.map((a, i) => ({ ...a, key: i })) || []}
                  columns={[
                    { title: 'Task', dataIndex: 'task' },
                    { title: 'Owner', dataIndex: 'owner', width: 120 },
                    { title: 'Due Date', dataIndex: 'dueDate', width: 130 },
                    { title: 'Evidence Quote', dataIndex: 'evidenceSnippet', render: (t) => <Text italic style={{ fontSize: '11px' }}>"{t}"</Text> }
                  ]}
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div>
                <Text strong>Risk Indicators:</Text>
                <Space orientation="vertical" style={{ width: '100%', marginTop: '4px' }}>
                  {analysis.riskIndicators?.map((r, i) => (
                    <Alert key={i} type="error" showIcon message={r} style={{ padding: '6px 12px' }} />
                  )) || <Text type="secondary">No critical risks flagged</Text>}
                </Space>
              </div>
            </div>
          )
        },
        {
          key: '3',
          label: <span><AuditOutlined /> Routing & Score Breakdown</span>,
          children: (
            <div>
              <Card size="small" title="Routing Explanation" style={{ marginBottom: '16px' }}>
                <Paragraph>{routing.explanation || 'Evaluated by composite rules engine.'}</Paragraph>
                <Space>
                  <Tag color="cyan">Engine: {routing.ruleVersion || 'v1.4.0'}</Tag>
                  <Tag color="blue">Evaluated: {new Date(routing.evaluatedAt || conv.createdAt).toLocaleString()}</Tag>
                </Space>
              </Card>

              <Title level={5}>Transparent Scoring Formula (0 - 100)</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Urgency Weight</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>+{routing.scoreBreakdown?.urgency || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Customer Risk</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>+{routing.scoreBreakdown?.customerRisk || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Buying Intent</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>+{routing.scoreBreakdown?.buyingIntent || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Technical Blocker</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>+{routing.scoreBreakdown?.technicalBlocker || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Deadline Proximity</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>+{routing.scoreBreakdown?.deadlineProximity || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Commitments</Text>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>+{routing.scoreBreakdown?.commitments || 0}</div>
                </div>
              </div>

              <Title level={5}>Matched Rules & Evidence</Title>
              <Table
                size="small"
                pagination={false}
                dataSource={routing.matchedRules?.map((r, i) => ({ ...r, key: i })) || []}
                columns={[
                  { title: 'Rule ID', dataIndex: 'ruleId', width: 120, render: (t) => <Text className="font-mono">{t}</Text> },
                  { title: 'Rule Name', dataIndex: 'ruleName' },
                  { title: 'Queue Target', dataIndex: 'queue', render: (q) => <QueueTag queue={q} /> },
                  { title: 'Weight', dataIndex: 'weight', width: 80, render: (w) => `+${w}` },
                  { title: 'Evidence', dataIndex: 'snippet', render: (s) => <Text italic style={{ fontSize: '11px' }}>{s}</Text> }
                ]}
              />
            </div>
          )
        },
        {
          key: '4',
          label: (
            <span>
              <EditOutlined /> Manual Overrides & Audit {corrections.length > 0 && <Badge count={corrections.length} size="small" />}
            </span>
          ),
          children: (
            <div>
              <Alert
                message="Field Ownership Protection Enabled"
                description="Manual adjustments made here are protected and will never be overwritten when new versions of this conversation are imported."
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Form form={form} layout="vertical" onFinish={handleSaveOverride}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Form.Item name="priority" label="Priority Override">
                    <Select options={[
                      { label: 'Urgent', value: 'Urgent' },
                      { label: 'High', value: 'High' },
                      { label: 'Medium', value: 'Medium' },
                      { label: 'Low', value: 'Low' }
                    ]} />
                  </Form.Item>

                  <Form.Item name="primaryQueue" label="Routing Queue Override">
                    <Select options={[
                      { label: 'High Priority', value: 'High Priority' },
                      { label: 'Follow-up Required', value: 'Follow-up Required' },
                      { label: 'Customer Risk', value: 'Customer Risk' },
                      { label: 'Pricing and Negotiation', value: 'Pricing and Negotiation' },
                      { label: 'Technical Questions', value: 'Technical Questions' },
                      { label: 'Positive Buying Signals', value: 'Positive Buying Signals' },
                      { label: 'General Conversations', value: 'General Conversations' },
                      { label: 'Unassigned / Needs Review', value: 'Unassigned / Needs Review' }
                    ]} />
                  </Form.Item>

                  <Form.Item name="sentiment" label="Sentiment Override">
                    <Select options={[
                      { label: 'Positive', value: 'Positive' },
                      { label: 'Neutral', value: 'Neutral' },
                      { label: 'Negative', value: 'Negative' }
                    ]} />
                  </Form.Item>

                  <Form.Item name="followUpStatus" label="Follow-up Status">
                    <Select options={[
                      { label: 'Open', value: 'Open' },
                      { label: 'In Progress', value: 'In Progress' },
                      { label: 'Completed', value: 'Completed' },
                      { label: 'Dismissed', value: 'Dismissed' }
                    ]} />
                  </Form.Item>

                  <Form.Item name="assignedSalesRep" label="Assigned Sales Rep">
                    <Input />
                  </Form.Item>

                  <Form.Item name="owner" label="Conversation Owner">
                    <Input />
                  </Form.Item>
                </div>

                <Form.Item name="nextAction" label="Next Action">
                  <Input />
                </Form.Item>

                <Form.Item name="notes" label="Manager / Reviewer Notes">
                  <TextArea rows={2} placeholder="Add private manager notes..." />
                </Form.Item>

                <Form.Item name="reason" label="Reason for Change (Required for audit log)">
                  <Input placeholder="e.g. Discussed with AE; customer agreed to unblock SSO before signing" />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    Save Manual Correction
                  </Button>
                  <Space>
                    {overrides.priority && (
                      <Button size="small" icon={<UndoOutlined />} onClick={() => handleResetField('priority')}>
                        Reset Priority
                      </Button>
                    )}
                    {overrides.primaryQueue && (
                      <Button size="small" icon={<UndoOutlined />} onClick={() => handleResetField('primaryQueue')}>
                        Reset Queue
                      </Button>
                    )}
                    {overrides.sentiment && (
                      <Button size="small" icon={<UndoOutlined />} onClick={() => handleResetField('sentiment')}>
                        Reset Sentiment
                      </Button>
                    )}
                  </Space>
                </div>
              </Form>

              <Divider style={{ margin: '24px 0 16px 0' }} />

              <Title level={5}><HistoryOutlined /> Audit History</Title>
              {corrections.length > 0 ? (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={corrections.map((c, i) => ({ ...c, key: i }))}
                  columns={[
                    { title: 'Timestamp', dataIndex: 'timestamp', width: 150, render: (t) => new Date(t).toLocaleString() },
                    { title: 'Field', dataIndex: 'field', width: 120, render: (f) => <Tag color="blue">{f}</Tag> },
                    { title: 'Previous Value', dataIndex: 'previousValue', render: (v) => <Text delete type="secondary">{String(v || 'none')}</Text> },
                    { title: 'New Value', dataIndex: 'newValue', render: (v) => <Text strong>{String(v)}</Text> },
                    { title: 'Reason', dataIndex: 'reason' },
                    { title: 'Actor', dataIndex: 'actor', width: 140 }
                  ]}
                />
              ) : (
                <Text type="secondary">No manual modifications recorded yet.</Text>
              )}
            </div>
          )
        }
      ]} />
    </Drawer>
  );
}

export default ConversationDrawer;
