import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Select,
  Input,
  Button,
  message,
  Tooltip
} from 'antd';
import {
  CheckSquareOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { FollowUpAPI } from '../services/api.js';
import PriorityTag from '../components/PriorityTag.jsx';

const { Title, Text } = Typography;

export function FollowUpsPage() {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await FollowUpAPI.list({
        status: statusFilter,
        priority: priorityFilter,
        search
      });
      setActions(res.actions || []);
    } catch (err) {
      console.error('Follow-ups error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [statusFilter, priorityFilter, search]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await FollowUpAPI.update(id, { status: newStatus });
      message.success(`Status updated to ${newStatus}`);
      fetchFollowUps();
    } catch (err) {
      message.error(`Failed to update status: ${err.message}`);
    }
  };

  const columns = [
    {
      title: 'Action Item / Deliverable',
      dataIndex: 'task',
      key: 'task',
      render: (t, r) => (
        <div>
          <Text strong style={{ fontSize: '13px' }}>{t}</Text>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            <span className="font-mono" style={{ color: '#6366f1' }}>{r.externalId}</span> • {r.company}
          </div>
        </div>
      )
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (a) => <Tag color="geekblue">{a}</Tag>
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p) => <PriorityTag priority={p} />
    },
    {
      title: 'Due Target',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#f59e0b' }} />
          <Text style={{ fontSize: '12px' }}>{d}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, r) => (
        <Select
          size="small"
          value={status}
          onChange={(newVal) => handleStatusChange(r._id, newVal)}
          style={{ width: 130 }}
          options={[
            { label: 'Open', value: 'Open' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Dismissed', value: 'Dismissed' }
          ]}
        />
      )
    },
    {
      title: 'Evidence Quote',
      dataIndex: 'sourceSnippet',
      key: 'snippet',
      render: (s) => (
        <Tooltip title={s}>
          <Text italic style={{ fontSize: '11px', color: '#475569', maxWidth: '240px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{s}"
          </Text>
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              <CheckSquareOutlined style={{ color: '#6366f1' }} /> Commitments & Follow-up Actions Tracker
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Extracted deliverables, promised materials, and follow-up obligations made during customer conversations.
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchFollowUps} size="small">Refresh</Button>
        </div>
      </Card>

      <Card size="small" className="glass-card">
        <Space wrap size="middle">
          <Input
            placeholder="Search task, company, or ID..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />

          <Select
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All Statuses', value: 'All' },
              { label: 'Open', value: 'Open' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Dismissed', value: 'Dismissed' }
            ]}
          />

          <Select
            style={{ width: 160 }}
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { label: 'All Priorities', value: 'All' },
              { label: 'Urgent', value: 'Urgent' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' }
            ]}
          />
        </Space>
      </Card>

      <Card size="small" className="glass-card">
        <Table
          columns={columns}
          dataSource={actions.map(a => ({ ...a, key: a._id }))}
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}

export default FollowUpsPage;
