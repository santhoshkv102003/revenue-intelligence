import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Select,
  DatePicker,
  Typography,
  Space,
  Button,
  Table,
  Tag,
  Divider,
  Spin
} from 'antd';
import {
  PhoneOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  BarChartOutlined,
  TeamOutlined,
  BankOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { MetricsAPI } from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import QueueTag from '../components/QueueTag.jsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SENTIMENT_COLORS = {
  Positive: '#10b981',
  Neutral: '#94a3b8',
  Negative: '#ef4444'
};

const PRIORITY_COLORS = {
  Urgent: '#dc2626',
  High: '#f97316',
  Medium: '#3b82f6',
  Low: '#64748b'
};

export function DashboardPage({ onNavigateToInbox }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filter states
  const [salesRep, setSalesRep] = useState('All');
  const [company, setCompany] = useState('All');
  const [priority, setPriority] = useState('All');
  const [source, setSource] = useState('All');
  const [dateRange, setDateRange] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = {
        salesRep,
        company,
        priority,
        source
      };
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }

      const res = await MetricsAPI.getDashboard(params);
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [salesRep, company, priority, source, dateRange]);

  const handleResetFilters = () => {
    setSalesRep('All');
    setCompany('All');
    setPriority('All');
    setSource('All');
    setDateRange(null);
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#64748b' }}>Computing dynamic revenue intelligence metrics...</div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const filterOptions = data?.filterOptions || {};

  // Sentiment chart data
  const sentimentData = [
    { name: 'Positive', value: data?.sentimentDistribution?.Positive || 0 },
    { name: 'Neutral', value: data?.sentimentDistribution?.Neutral || 0 },
    { name: 'Negative', value: data?.sentimentDistribution?.Negative || 0 }
  ].filter(d => d.value > 0);

  // Priority chart data
  const priorityData = [
    { name: 'Urgent', count: data?.priorityDistribution?.Urgent || 0, fill: PRIORITY_COLORS.Urgent },
    { name: 'High', count: data?.priorityDistribution?.High || 0, fill: PRIORITY_COLORS.High },
    { name: 'Medium', count: data?.priorityDistribution?.Medium || 0, fill: PRIORITY_COLORS.Medium },
    { name: 'Low', count: data?.priorityDistribution?.Low || 0, fill: PRIORITY_COLORS.Low }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Toolbar */}
      <Card size="small" className="glass-card" style={{ padding: '4px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space wrap size="middle">
            <span style={{ fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FilterOutlined /> Dynamic Filters:
            </span>

            <Select
              style={{ width: 170 }}
              value={salesRep}
              onChange={setSalesRep}
              options={[{ label: 'All Sales Reps', value: 'All' }, ...(filterOptions.salesReps || []).map(r => ({ label: r, value: r }))]}
            />

            <Select
              style={{ width: 180 }}
              value={company}
              onChange={setCompany}
              options={[{ label: 'All Accounts', value: 'All' }, ...(filterOptions.companies || []).map(c => ({ label: c, value: c }))]}
            />

            <Select
              style={{ width: 140 }}
              value={priority}
              onChange={setPriority}
              options={[{ label: 'All Priorities', value: 'All' }, ...(filterOptions.priorities || []).map(p => ({ label: p, value: p }))]}
            />

            <Select
              style={{ width: 150 }}
              value={source}
              onChange={setSource}
              options={[{ label: 'All Sources', value: 'All' }, ...(filterOptions.sources || []).map(s => ({ label: s, value: s }))]}
            />

            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 240 }}
            />
          </Space>

          <Space>
            <Button size="small" onClick={handleResetFilters}>
              Reset Filters
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchMetrics}>
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      {/* KPI Cards Row 1: Primary Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Conversations"
            value={summary.totalConversations}
            subtitle={`${summary.totalUniqueConversations || 0} unique external IDs`}
            icon={<PhoneOutlined />}
            color="#6366f1"
            onClick={() => onNavigateToInbox && onNavigateToInbox({ queue: 'All' })}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Follow-ups Required"
            value={summary.followUpRequiredCount}
            subtitle="Requires rep action / delivery"
            icon={<ClockCircleOutlined />}
            color="#f97316"
            isAlert={summary.followUpRequiredCount > 0}
            onClick={() => onNavigateToInbox && onNavigateToInbox({ queue: 'Follow-up Required' })}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="High / Urgent Deals"
            value={summary.highPriorityCount}
            subtitle="Multi-factor priority score ≥ 50"
            icon={<FireOutlined />}
            color="#ef4444"
            isAlert={summary.highPriorityCount > 0}
            onClick={() => onNavigateToInbox && onNavigateToInbox({ queue: 'High Priority' })}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Open Follow-up Actions"
            value={summary.openFollowUpsCount}
            subtitle="Extracted commitments pending"
            icon={<CheckCircleOutlined />}
            color="#10b981"
            onClick={() => onNavigateToInbox && onNavigateToInbox({ view: 'followups' })}
          />
        </Col>
      </Row>

      {/* Secondary Metrics Row */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Avg Duration</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{summary.avgDurationMinutes}m</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Completed</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{summary.completedMeetingsCount}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Upcoming</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{summary.upcomingMeetingsCount}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onNavigateToInbox && onNavigateToInbox({ view: 'routing', conflictOnly: true })}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Routing Conflicts</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#d97706' }}>{summary.conflictsCount || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Manual Overrides</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed' }}>{summary.manualOverridesCount || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Duplicates Skipped</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#475569' }}>{data?.importStats?.duplicateRecords || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Updated Records</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7' }}>{data?.importStats?.updatedRecords || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Rejected Rows</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#e11d48' }}>{data?.importStats?.rejectedRecords || 0}</div>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Charts & Visual Intelligence */}
      <Row gutter={[16, 16]}>
        {/* Timeline Trends */}
        <Col xs={24} lg={16}>
          <Card title="Conversation Activity Trends Over Time" size="small" className="glass-card">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.conversationTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Total Calls" />
                  <Line type="monotone" dataKey="highPriority" stroke="#ef4444" strokeWidth={2} name="High Priority" />
                  <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={1.5} name="Positive Sentiment" />
                  <Line type="monotone" dataKey="negative" stroke="#dc2626" strokeWidth={1.5} name="Negative Sentiment" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Sentiment Distribution */}
        <Col xs={24} lg={8}>
          <Card title="Sentiment Distribution" size="small" className="glass-card">
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Breakdown by Rep and Queue Distribution */}
      <Row gutter={[16, 16]}>
        {/* Conversations by Sales Rep */}
        <Col xs={24} lg={12}>
          <Card title="Conversations by Sales Representative" size="small" className="glass-card">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.conversationsByRep || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="salesRep" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#6366f1" name="Total Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="highPriority" fill="#ef4444" name="High Priority" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Queue Distribution */}
        <Col xs={24} lg={12}>
          <Card title="Routing Queue Breakdown" size="small" className="glass-card">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.queueDistribution || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#64748b" fontSize={11} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Conversations" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 4: Account Activity & Import Provenance */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Top Accounts by Conversation Volume" size="small" className="glass-card">
            <Table
              size="small"
              pagination={false}
              dataSource={(data?.conversationsByCompany || []).map((c, i) => ({ ...c, key: i }))}
              columns={[
                { title: 'Company / Account', dataIndex: 'company', render: (c) => <Text strong>{c}</Text> },
                { title: 'Call Volume', dataIndex: 'count', render: (cnt) => <Tag color="blue">{cnt} calls</Tag> },
                {
                  title: 'Customer Risk Flag',
                  dataIndex: 'riskCount',
                  render: (rc) => rc > 0 ? <Tag color="magenta">{rc} risk calls</Tag> : <Tag color="default">Clean</Tag>
                },
                {
                  title: 'Action',
                  render: (_, r) => (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => onNavigateToInbox && onNavigateToInbox({ company: r.company })}
                    >
                      Filter Inbox
                    </Button>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Data Provenance & Import History Overview" size="small" className="glass-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>Total Import Batches Processed</Text>
                <Text strong>{data?.importStats?.totalBatches || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>New Conversations Ingested</Text>
                <Tag color="green">+{data?.importStats?.newRecords || 0} records</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>Existing Records Updated (Diff Tracked)</Text>
                <Tag color="blue">{data?.importStats?.updatedRecords || 0} updated</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>Exact Duplicates Skipped (Idempotent)</Text>
                <Tag color="default">{data?.importStats?.duplicateRecords || 0} skipped</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>Ambiguous Matches Sent to Review</Text>
                <Tag color="purple">{data?.importStats?.ambiguousRecords || 0} flagged</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Text>Corrupted / Invalid Rows Rejected</Text>
                <Tag color="red">{data?.importStats?.rejectedRecords || 0} rejected</Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
