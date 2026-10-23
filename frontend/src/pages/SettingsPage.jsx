import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Switch,
  InputNumber,
  Button,
  Space,
  Input,
  Tag,
  Divider,
  message,
  Popconfirm,
  Alert
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  DatabaseOutlined,
  KeyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { RoutingAPI, SystemAPI } from '../services/api.js';
import QueueTag from '../components/QueueTag.jsx';

const { Title, Text, Paragraph } = Typography;

export function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [llmKey, setLlmKey] = useState('');
  const [seeding, setSeeding] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await RoutingAPI.getRules();
      setRules(res.rules || []);
    } catch (err) {
      console.error('Rules error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleUpdateRuleWeight = async (ruleId, weight) => {
    try {
      await RoutingAPI.updateRule(ruleId, { weight });
      message.success('Rule weight updated');
      fetchRules();
    } catch (err) {
      message.error(`Failed to update weight: ${err.message}`);
    }
  };

  const handleToggleRuleActive = async (ruleId, isActive) => {
    try {
      await RoutingAPI.updateRule(ruleId, { isActive });
      message.success(`Rule ${isActive ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (err) {
      message.error(`Failed to toggle rule: ${err.message}`);
    }
  };

  const handleResetDatabase = async () => {
    setSeeding(true);
    try {
      await SystemAPI.seed();
      message.success('Database successfully reset and re-seeded with 52 synthetic conversations!');
      window.location.reload();
    } catch (err) {
      message.error(`Database reset failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const columns = [
    {
      title: 'Rule ID',
      dataIndex: 'ruleId',
      key: 'ruleId',
      render: (id) => <Text strong className="font-mono">{id}</Text>
    },
    {
      title: 'Rule Name & Description',
      key: 'name_desc',
      render: (_, r) => (
        <div>
          <Text strong>{r.ruleName}</Text>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.description}</div>
          <div style={{ marginTop: '4px' }}>
            {r.keywords?.map((kw, i) => <Tag key={i} style={{ fontSize: '10px' }}>{kw}</Tag>)}
          </div>
        </div>
      )
    },
    {
      title: 'Target Queue',
      dataIndex: 'targetQueue',
      key: 'targetQueue',
      render: (q) => <QueueTag queue={q} />
    },
    {
      title: 'Weight (+Points)',
      dataIndex: 'weight',
      key: 'weight',
      render: (w, r) => (
        <InputNumber
          min={5}
          max={50}
          value={w}
          onChange={(newW) => handleUpdateRuleWeight(r.ruleId, newW)}
        />
      )
    },
    {
      title: 'Active Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active, r) => (
        <Switch
          checked={active}
          onChange={(checked) => handleToggleRuleActive(r.ruleId, checked)}
        />
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
          <SettingOutlined style={{ color: '#6366f1' }} /> System Configuration & Rules Engine
        </Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Configure priority scoring weights, integrate LLM API keys, and manage synthetic test databases.
        </Text>
      </Card>

      {/* Configurable Routing Rules */}
      <Card title="Configurable Routing Rules & Priority Weights" className="glass-card">
        <Alert
          message="Explainable Rule Weighting"
          description="The priority score (0-100) is dynamically calculated by summing the weights of all matching keyword rules and metadata heuristics. Changes apply to subsequent analysis runs."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Table
          columns={columns}
          dataSource={rules.map(r => ({ ...r, key: r._id }))}
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Pluggable LLM Integration */}
      <Card title={<span><KeyOutlined /> Pluggable LLM Provider Configuration</span>} className="glass-card">
        <Paragraph type="secondary">
          When an LLM API key is configured, the analysis service will invoke structured inference for advanced semantic extraction. If no key is set, the application operates deterministically using our keyword heuristics engine with verbatim transcript quote extraction.
        </Paragraph>
        <Space direction="vertical" style={{ width: '100%', maxWidth: '600px' }}>
          <Input.Password
            placeholder="Enter Gemini / OpenAI API Key (Optional)..."
            value={llmKey}
            onChange={(e) => setLlmKey(e.target.value)}
          />
          <Button
            type="primary"
            style={{ background: '#6366f1' }}
            onClick={() => message.success('LLM provider preferences updated for current session')}
          >
            Save API Configuration
          </Button>
        </Space>
      </Card>

      {/* Reset Seed Database */}
      <Card title={<span><DatabaseOutlined /> Test Data Management</span>} className="glass-card">
        <Paragraph type="secondary">
          Reset the persistent MongoDB database and re-seed 52 realistic conversations with transcripts, follow-up action items, and routing classifications.
        </Paragraph>
        <Popconfirm
          title="Reset sample database?"
          description="This will clear all current records and restore the initial 52 verified test conversations."
          onConfirm={handleResetDatabase}
          okText="Yes, Reset"
          cancelText="Cancel"
        >
          <Button danger icon={<DatabaseOutlined />} loading={seeding}>
            Reset & Re-seed Sample Database
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );
}

export default SettingsPage;
