import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Select,
  Checkbox,
  Tag,
  Input,
  Alert,
  Button,
  Descriptions,
  Tooltip
} from 'antd';
import {
  AuditOutlined,
  SearchOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { RoutingAPI } from '../services/api.js';
import QueueTag from '../components/QueueTag.jsx';
import PriorityTag from '../components/PriorityTag.jsx';

const { Title, Text, Paragraph } = Typography;

export function RoutingAuditPage() {
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [total, setTotal] = useState(0);
  const [ruleVersion, setRuleVersion] = useState('v1.4.0-composite');
  const [queueFilter, setQueueFilter] = useState('All');
  const [conflictOnly, setConflictOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await RoutingAPI.getAudit({
        queue: queueFilter,
        conflictOnly: conflictOnly ? 'true' : 'false',
        search,
        page,
        limit: 25
      });
      setDecisions(res.decisions || []);
      setTotal(res.pagination?.total || 0);
      if (res.ruleVersion) setRuleVersion(res.ruleVersion);
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [queueFilter, conflictOnly, search, page]);

  const columns = [
    {
      title: 'Conversation',
      key: 'conv',
      render: (_, r) => (
        <div>
          <Space>
            <Text strong>{r.company}</Text>
            <Text className="font-mono" style={{ color: '#6366f1', fontSize: '11px' }}>{r.externalId}</Text>
          </Space>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.title}</div>
        </div>
      )
    },
    {
      title: 'Calculated Queue',
      dataIndex: ['routing', 'primaryQueue'],
      key: 'calcQueue',
      render: (q) => <QueueTag queue={q} />
    },
    {
      title: 'Effective Queue',
      dataIndex: 'effectivePrimaryQueue',
      key: 'effQueue',
      render: (q, r) => (
        <Space>
          <QueueTag queue={q} />
          {r.manualOverrides?.isOverridden && r.manualOverrides?.primaryQueue && (
            <Tag color="purple" style={{ fontSize: '10px' }}>Overridden</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Priority Score',
      dataIndex: ['routing', 'priorityScore'],
      key: 'score',
      render: (score, r) => (
        <Space>
          <Text strong style={{ fontSize: '14px' }}>{score}/100</Text>
          <PriorityTag priority={r.effectivePriority} />
        </Space>
      )
    },
    {
      title: 'Competing Signals / Conflict',
      key: 'conflict',
      render: (_, r) => {
        if (r.routing?.conflictDetected) {
          return (
            <Tooltip title={r.routing.conflictExplanation}>
              <Tag color="warning" icon={<WarningOutlined />} style={{ cursor: 'pointer' }}>
                Conflict Detected
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color="default">Single Signal</Tag>;
      }
    },
    {
      title: 'Rules Matched',
      key: 'rules',
      render: (_, r) => (
        <Tag color="blue">{r.routing?.matchedRules?.length || 0} matched</Tag>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              <AuditOutlined /> Explainable Routing & Scoring Engine Audit
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Auditable transparent priority scoring, multi-rule evaluation, and automated conflict explanations.
            </Text>
          </div>
          <Space>
            <Tag color="cyan">Active Engine: {ruleVersion}</Tag>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchAudit}>Refresh</Button>
          </Space>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card size="small" className="glass-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space wrap size="middle">
            <Input
              placeholder="Search by ID, company, or explanation..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />

            <Select
              style={{ width: 200 }}
              value={queueFilter}
              onChange={setQueueFilter}
              options={[
                { label: 'All Queues', value: 'All' },
                { label: 'High Priority', value: 'High Priority' },
                { label: 'Follow-up Required', value: 'Follow-up Required' },
                { label: 'Customer Risk', value: 'Customer Risk' },
                { label: 'Pricing and Negotiation', value: 'Pricing and Negotiation' },
                { label: 'Technical Questions', value: 'Technical Questions' },
                { label: 'Positive Buying Signals', value: 'Positive Buying Signals' },
                { label: 'General Conversations', value: 'General Conversations' },
                { label: 'Unassigned / Needs Review', value: 'Unassigned / Needs Review' }
              ]}
            />

            <Checkbox
              checked={conflictOnly}
              onChange={(e) => setConflictOnly(e.target.checked)}
            >
              <span style={{ fontWeight: 600, color: '#b45309' }}>
                Show Competing Signal Conflicts Only
              </span>
            </Checkbox>
          </Space>
        </div>
      </Card>

      {/* Main Table with Expandable Row for Deep Inspection */}
      <Card size="small" className="glass-card">
        <Table
          columns={columns}
          dataSource={decisions.map(d => ({ ...d, key: d._id }))}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 25,
            total,
            onChange: (p) => setPage(p)
          }}
          expandable={{
            expandedRowRender: (record) => {
              const r = record.routing || {};
              const breakdown = r.scoreBreakdown || {};
              return (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {r.conflictDetected && (
                    <Alert
                      message="Conflict Explanation"
                      description={r.conflictExplanation}
                      type="warning"
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />
                  )}

                  <Paragraph style={{ marginBottom: '12px' }}>
                    <Text strong>Audit Explanation: </Text>
                    {r.explanation}
                  </Paragraph>

                  <Title level={5} style={{ fontSize: '13px', marginBottom: '8px' }}>
                    Multi-Factor Score Components:
                  </Title>
                  <Space wrap size="small" style={{ marginBottom: '16px' }}>
                    <Tag color="red">Urgency: +{breakdown.urgency || 0}</Tag>
                    <Tag color="magenta">Customer Risk: +{breakdown.customerRisk || 0}</Tag>
                    <Tag color="green">Buying Intent: +{breakdown.buyingIntent || 0}</Tag>
                    <Tag color="blue">Technical Blocker: +{breakdown.technicalBlocker || 0}</Tag>
                    <Tag color="orange">Deadline Proximity: +{breakdown.deadlineProximity || 0}</Tag>
                    <Tag color="cyan">Commitments: +{breakdown.commitments || 0}</Tag>
                  </Space>

                  <Title level={5} style={{ fontSize: '13px', marginBottom: '8px' }}>
                    Matched Rule Snippets:
                  </Title>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={r.matchedRules?.map((m, i) => ({ ...m, key: i })) || []}
                    columns={[
                      { title: 'Rule ID', dataIndex: 'ruleId', width: 120, render: (t) => <Text className="font-mono">{t}</Text> },
                      { title: 'Rule Name', dataIndex: 'ruleName' },
                      { title: 'Queue Target', dataIndex: 'queue', render: (q) => <QueueTag queue={q} /> },
                      { title: 'Weight', dataIndex: 'weight', width: 80, render: (w) => `+${w}` },
                      { title: 'Evidence Snippet', dataIndex: 'snippet', render: (s) => <Text italic style={{ fontSize: '11px' }}>"{s}"</Text> }
                    ]}
                  />

                  {record.manualOverrides?.isOverridden && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: '6px' }}>
                      <Text strong style={{ color: '#6b21a8' }}>Active Human-in-the-Loop Override: </Text>
                      <Text style={{ color: '#4c1d95' }}>
                        Reason: "{record.manualOverrides.overrideReason || 'Manager override'}" by {record.manualOverrides.lastOverriddenBy || 'Admin'}
                      </Text>
                    </div>
                  )}
                </div>
              );
            }
          }}
        />
      </Card>
    </div>
  );
}

export default RoutingAuditPage;
