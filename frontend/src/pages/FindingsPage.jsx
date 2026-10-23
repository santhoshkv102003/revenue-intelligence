import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tag,
  Space,
  Row,
  Col,
  Alert,
  Divider,
  Button,
  Spin
} from 'antd';
import {
  BulbOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { FindingsAPI } from '../services/api.js';
import ConversationDrawer from '../components/ConversationDrawer.jsx';

const { Title, Text, Paragraph } = Typography;

export function FindingsPage({ onSelectConversation }) {
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const res = await FindingsAPI.getFindings();
      setFindings(res.findings || []);
    } catch (err) {
      console.error('Error fetching findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#64748b' }}>Calculating evidence-backed findings from stored conversations...</div>
      </div>
    );
  }

  const standardFindings = findings.filter(f => !f.isRejectedDecision);
  const rejectedDecision = findings.find(f => f.isRejectedDecision);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner */}
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              <BulbOutlined style={{ color: '#6366f1' }} /> Executive Findings & Evidence Workspace
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Data-driven insights rigorously calculated from conversation transcripts, customer pain points, and commitments.
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchFindings} size="small">
            Refresh Findings
          </Button>
        </div>
      </Card>

      {/* Standard Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {standardFindings.map((finding, idx) => (
          <Card
            key={idx}
            className="glass-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <Space>
                  <Tag color="geekblue" className="font-mono">{finding.findingId}</Tag>
                  <Text strong style={{ fontSize: '16px', color: '#0f172a' }}>{finding.title}</Text>
                </Space>
                <Space>
                  <Tag color="purple">{finding.category}</Tag>
                  <Tag color="green" icon={<SafetyCertificateOutlined />}>
                    {finding.confidenceLabel} ({Math.round(finding.confidenceScore * 100)}%)
                  </Tag>
                </Space>
              </div>
            }
          >
            {/* Quantitative Evidence Badge */}
            <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <Text strong style={{ color: '#166534' }}>Quantitative Evidence: </Text>
              <Text style={{ color: '#14532d' }}>{finding.quantitativeEvidence}</Text>
            </div>

            <Paragraph style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
              {finding.conciseExplanation}
            </Paragraph>

            <Divider style={{ margin: '14px 0' }} />

            {/* Analysis Grid */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', height: '100%' }}>
                  <Text strong style={{ color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Interpretation
                  </Text>
                  <Text type="secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    {finding.interpretation}
                  </Text>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ padding: '14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', height: '100%' }}>
                  <Text strong style={{ color: '#92400e', display: 'block', marginBottom: '6px' }}>
                    Business Implication
                  </Text>
                  <Text style={{ color: '#78350f', fontSize: '13px', lineHeight: 1.5 }}>
                    {finding.businessImplication}
                  </Text>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ padding: '14px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #e0e7ff', height: '100%' }}>
                  <Text strong style={{ color: '#3730a3', display: 'block', marginBottom: '6px' }}>
                    Recommended Action
                  </Text>
                  <Text style={{ color: '#312e81', fontSize: '13px', lineHeight: 1.5 }}>
                    {finding.recommendedAction}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Supporting Snippets & Links */}
            <div style={{ marginTop: '20px' }}>
              <Title level={5} style={{ fontSize: '13px', color: '#475569' }}>
                Supporting Verbatim Quotes & Affected Conversations:
              </Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {finding.supportingSnippets?.map((snip, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <Space>
                        <Tag color="blue" className="font-mono">{snip.externalId}</Tag>
                        <Text strong>{snip.company}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>({snip.context})</Text>
                      </Space>
                      <Paragraph italic style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '12px' }}>
                        "{snip.quote}"
                      </Paragraph>
                    </div>
                    {snip.conversationId && (
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedConvId(snip.conversationId);
                          setDrawerOpen(true);
                        }}
                      >
                        Inspect Call
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <ExclamationCircleOutlined /> <strong>Methodological Limitation:</strong> {finding.limitations}
              </Text>
            </div>
          </Card>
        ))}
      </div>

      {/* Documented Rejected Decision (Section 11 requirement) */}
      {rejectedDecision && (
        <Card
          className="glass-card"
          style={{ border: '2px dashed #f59e0b', background: '#fffdfa' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tag color="orange" icon={<CloseCircleOutlined />}>Documented Rejected Decision</Tag>
                <Text strong style={{ color: '#92400e', fontSize: '16px' }}>
                  {rejectedDecision.title}
                </Text>
              </Space>
              <Tag color="volcano">Decision: REJECTED</Tag>
            </div>
          }
        >
          <Alert
            message="Alternative Considered & Deliberately Rejected"
            description={rejectedDecision.conciseExplanation}
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ padding: '14px', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px' }}>
                <Text strong style={{ color: '#9a3412', display: 'block', marginBottom: '6px' }}>
                  Considered Alternative
                </Text>
                <Text style={{ fontSize: '13px' }}>
                  {rejectedDecision.rejectedAlternative}
                </Text>

                <Divider style={{ margin: '10px 0' }} />

                <Text strong style={{ color: '#9a3412', display: 'block', marginBottom: '6px' }}>
                  Rejection Rationale & Trade-off
                </Text>
                <Text style={{ fontSize: '13px' }}>
                  {rejectedDecision.rejectionRationale}
                </Text>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div style={{ padding: '14px', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px' }}>
                <Text strong style={{ color: '#9a3412', display: 'block', marginBottom: '6px' }}>
                  Empirical Quantitative Evidence
                </Text>
                <Text style={{ fontSize: '13px' }}>
                  {rejectedDecision.quantitativeEvidence}
                </Text>

                <Divider style={{ margin: '10px 0' }} />

                <Text strong style={{ color: '#9a3412', display: 'block', marginBottom: '6px' }}>
                  Condition Justifying Revisit
                </Text>
                <Text style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                  {rejectedDecision.revisitCondition}
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Conversation Detail Drawer */}
      <ConversationDrawer
        open={drawerOpen}
        conversationId={selectedConvId}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export default FindingsPage;
