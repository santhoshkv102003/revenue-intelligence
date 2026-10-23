import React, { useState, useEffect } from 'react';
import {
  Table,
  Tabs,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Card,
  Modal,
  message,
  Tooltip,
  Dropdown
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  UserSwitchOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ConversationAPI } from '../services/api.js';
import QueueTag from '../components/QueueTag.jsx';
import PriorityTag from '../components/PriorityTag.jsx';
import SentimentTag from '../components/SentimentTag.jsx';
import ConversationDrawer from '../components/ConversationDrawer.jsx';

const { Text } = Typography;

export const QUEUES = [
  'All',
  'High Priority',
  'Follow-up Required',
  'Customer Risk',
  'Pricing and Negotiation',
  'Technical Questions',
  'Positive Buying Signals',
  'General Conversations',
  'Unassigned / Needs Review',
  'Recently Updated'
];

export function InboxPage({ initialFilters = {} }) {
  const [activeQueue, setActiveQueue] = useState(initialFilters.queue || 'All');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [salesRep, setSalesRep] = useState(initialFilters.salesRep || 'All');
  const [company, setCompany] = useState(initialFilters.company || 'All');
  const [priority, setPriority] = useState(initialFilters.priority || 'All');
  const [sentiment, setSentiment] = useState(initialFilters.sentiment || 'All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected row keys for bulk operations
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Drawer detail state
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bulk Modal state
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkAction, setBulkAction] = useState('setPriority');
  const [bulkValue, setBulkValue] = useState('High');

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await ConversationAPI.list({
        queue: activeQueue,
        search,
        salesRep,
        company,
        priority,
        sentiment,
        sortBy,
        sortOrder,
        page,
        limit: pageSize
      });
      setConversations(res.conversations || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      message.error(`Failed to load conversations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeQueue, search, salesRep, company, priority, sentiment, sortBy, sortOrder, page, pageSize]);

  // Bulk operation execute
  const handleExecuteBulk = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await ConversationAPI.bulk({
        conversationIds: selectedRowKeys,
        action: bulkAction,
        value: bulkValue,
        actor: 'Sales Operations Manager'
      });
      message.success(`Bulk updated ${selectedRowKeys.length} conversations`);
      setSelectedRowKeys([]);
      setBulkModalVisible(false);
      fetchConversations();
    } catch (err) {
      message.error(`Bulk operation failed: ${err.message}`);
    }
  };

  const columns = [
    {
      title: 'Company / Title',
      dataIndex: 'company',
      key: 'company',
      render: (c, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong style={{ fontSize: '14px', color: '#0f172a' }}>{c}</Text>
            {record.routing?.conflictDetected && (
              <Tooltip title={`Competing Signals: ${record.routing.conflictExplanation}`}>
                <Tag color="warning" icon={<WarningOutlined />} style={{ fontSize: '11px', cursor: 'pointer' }}>
                  Conflict
                </Tag>
              </Tooltip>
            )}
            {record.isAmbiguousMatch && (
              <Tooltip title={record.ambiguousReason || 'Ambiguous match flagged'}>
                <Tag color="purple">Ambiguous Match</Tag>
              </Tooltip>
            )}
            {record.manualOverrides?.isOverridden && (
              <Tooltip title={`Manual override: ${record.manualOverrides.overrideReason || 'Adjusted by manager'}`}>
                <Tag color="blue" style={{ fontSize: '10px' }}>Overridden</Tag>
              </Tooltip>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            <span className="font-mono" style={{ color: '#6366f1' }}>{record.externalId}</span> • {record.title}
          </div>
        </div>
      )
    },
    {
      title: 'Sales Rep & Contact',
      key: 'rep_contact',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px' }}>{record.effectiveSalesRep}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {record.contactName} ({record.contactEmail || 'No email'})
          </div>
        </div>
      )
    },
    {
      title: 'Call Type & Date',
      key: 'type_date',
      render: (_, record) => (
        <div>
          <Tag color="default" style={{ fontSize: '11px', borderRadius: '4px' }}>{record.conversationType}</Tag>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            {new Date(record.timestamp).toLocaleDateString()} ({record.durationMinutes}m)
          </div>
        </div>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'effectivePriority',
      key: 'priority',
      render: (p, record) => <PriorityTag priority={p} score={record.routing?.priorityScore} />
    },
    {
      title: 'Queue',
      dataIndex: 'effectivePrimaryQueue',
      key: 'queue',
      render: (q) => <QueueTag queue={q} />
    },
    {
      title: 'Sentiment',
      dataIndex: 'effectiveSentiment',
      key: 'sentiment',
      render: (s, record) => <SentimentTag sentiment={s} score={record.analysis?.sentimentScore} />
    },
    {
      title: 'Next Action',
      dataIndex: 'effectiveNextAction',
      key: 'nextAction',
      render: (action) => (
        <Tooltip title={action}>
          <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
            {action || 'No action recorded'}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Owner',
      dataIndex: 'effectiveOwner',
      key: 'owner',
      render: (o) => <Text style={{ fontSize: '12px' }}>{o}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedConvId(record._id);
              setDrawerOpen(true);
            }}
          >
            Review
          </Button>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys)
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Queue Tabs */}
      <Card size="small" className="glass-card" style={{ padding: '0 8px' }}>
        <Tabs
          activeKey={activeQueue}
          onChange={(key) => {
            setActiveQueue(key);
            setPage(1);
          }}
          items={QUEUES.map(q => ({
            key: q,
            label: (
              <span style={{ fontWeight: 600, fontSize: '13px' }}>
                {q}
              </span>
            )
          }))}
        />
      </Card>

      {/* Search & Filter Toolbar */}
      <Card size="small" className="glass-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap size="middle">
            <Input
              placeholder="Search conversations, accounts, transcripts..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />

            <Select
              style={{ width: 140 }}
              value={priority}
              onChange={setPriority}
              options={[
                { label: 'All Priorities', value: 'All' },
                { label: 'Urgent', value: 'Urgent' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' }
              ]}
            />

            <Select
              style={{ width: 140 }}
              value={sentiment}
              onChange={setSentiment}
              options={[
                { label: 'All Sentiments', value: 'All' },
                { label: 'Positive', value: 'Positive' },
                { label: 'Neutral', value: 'Neutral' },
                { label: 'Negative', value: 'Negative' }
              ]}
            />

            <Select
              style={{ width: 160 }}
              value={sortBy}
              onChange={setSortBy}
              options={[
                { label: 'Sort by Date', value: 'timestamp' },
                { label: 'Sort by Priority Score', value: 'routing.priorityScore' },
                { label: 'Sort by Duration', value: 'durationMinutes' }
              ]}
            />
          </Space>

          {/* Bulk Operations */}
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                onClick={() => setBulkModalVisible(true)}
                style={{ background: '#6366f1' }}
              >
                Bulk Action ({selectedRowKeys.length} selected)
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchConversations}>
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      {/* Main Inbox Table */}
      <Card size="small" className="glass-card" style={{ padding: '0' }}>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={conversations.map(c => ({ ...c, key: c._id }))}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            }
          }}
          onRow={(record) => ({
            onDoubleClick: () => {
              setSelectedConvId(record._id);
              setDrawerOpen(true);
            }
          })}
        />
      </Card>

      {/* Detail Review Drawer */}
      <ConversationDrawer
        open={drawerOpen}
        conversationId={selectedConvId}
        onClose={() => setDrawerOpen(false)}
        onUpdated={fetchConversations}
      />

      {/* Bulk Action Modal */}
      <Modal
        title={`Apply Bulk Operation to ${selectedRowKeys.length} Conversations`}
        open={bulkModalVisible}
        onOk={handleExecuteBulk}
        onCancel={() => setBulkModalVisible(false)}
        okText="Apply Bulk Action"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <div>
            <Text strong>Select Action:</Text>
            <Select
              style={{ width: '100%', marginTop: '6px' }}
              value={bulkAction}
              onChange={(act) => {
                setBulkAction(act);
                if (act === 'setPriority') setBulkValue('High');
                if (act === 'assignOwner') setBulkValue('Sales Manager');
                if (act === 'markReviewed') setBulkValue('Reviewed');
              }}
              options={[
                { label: 'Change Priority', value: 'setPriority' },
                { label: 'Assign Owner', value: 'assignOwner' },
                { label: 'Mark as Reviewed', value: 'markReviewed' }
              ]}
            />
          </div>

          {bulkAction === 'setPriority' && (
            <div>
              <Text strong>Set Priority to:</Text>
              <Select
                style={{ width: '100%', marginTop: '6px' }}
                value={bulkValue}
                onChange={setBulkValue}
                options={[
                  { label: 'Urgent', value: 'Urgent' },
                  { label: 'High', value: 'High' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'Low', value: 'Low' }
                ]}
              />
            </div>
          )}

          {bulkAction === 'assignOwner' && (
            <div>
              <Text strong>Assign Owner to:</Text>
              <Input
                style={{ marginTop: '6px' }}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="e.g. Marcus Vance or Sarah Chen"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default InboxPage;
