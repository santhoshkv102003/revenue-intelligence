import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Alert,
  Divider
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { ImportAPI } from '../services/api.js';

const { Title, Text, Paragraph } = Typography;

export function ImportHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await ImportAPI.getBatches();
      setBatches(res.batches || []);
    } catch (err) {
      console.error('Batches error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const columns = [
    {
      title: 'Batch ID & Filename',
      key: 'batch',
      render: (_, r) => (
        <div>
          <Text strong className="font-mono" style={{ color: '#6366f1' }}>{r.batchId}</Text>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {r.filename} ({r.fileType})
          </div>
        </div>
      )
    },
    {
      title: 'Import Timestamp',
      dataIndex: 'importedAt',
      key: 'importedAt',
      render: (d) => new Date(d).toLocaleString()
    },
    {
      title: 'Total Rows',
      dataIndex: 'totalRows',
      key: 'totalRows',
      render: (t) => <Text strong>{t}</Text>
    },
    {
      title: 'New Records',
      dataIndex: 'newRecordsCount',
      key: 'new',
      render: (n) => <Tag color="green">+{n} created</Tag>
    },
    {
      title: 'Updated Records',
      dataIndex: 'updatedRecordsCount',
      key: 'updated',
      render: (u) => u > 0 ? <Tag color="blue">{u} updated</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Duplicates Skipped',
      dataIndex: 'duplicateRecordsCount',
      key: 'dup',
      render: (d) => d > 0 ? <Tag color="default">{d} skipped</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Ambiguous Flagged',
      dataIndex: 'ambiguousRecordsCount',
      key: 'ambiguous',
      render: (a) => a > 0 ? <Tag color="purple">{a} ambiguous</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Rejected Rows',
      dataIndex: 'rejectedRecordsCount',
      key: 'rejected',
      render: (r) => r > 0 ? <Tag color="red">{r} rejected</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Batch Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'Committed' ? 'success' : 'warning'}>{s}</Tag>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              <HistoryOutlined style={{ color: '#6366f1' }} /> Ingestion Provenance & Batch History
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Auditable record of all ingestion jobs, deduplication logs, field diffs, and row-level rejection reasons.
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchBatches} size="small">Refresh</Button>
        </div>
      </Card>

      <Card size="small" className="glass-card">
        <Table
          columns={columns}
          dataSource={batches.map(b => ({ ...b, key: b._id }))}
          loading={loading}
          pagination={{ pageSize: 15 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Title level={5} style={{ fontSize: '13px', marginBottom: '8px' }}>
                  Field-Level Update Audit (Before-and-After Values):
                </Title>
                {record.recordUpdates && record.recordUpdates.length > 0 ? (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={record.recordUpdates.map((u, i) => ({ ...u, key: i }))}
                    columns={[
                      { title: 'External ID', dataIndex: 'externalId', width: 140, render: (t) => <Text className="font-mono">{t}</Text> },
                      {
                        title: 'Modified Fields & Diffs',
                        dataIndex: 'changes',
                        render: (changes) => (
                          <div>
                            {changes.map((ch, idx) => (
                              <div key={idx} style={{ fontSize: '12px', marginBottom: '2px' }}>
                                <Tag color="blue">{ch.field}</Tag>
                                <Text delete type="secondary">{String(ch.oldVal || 'none')}</Text>
                                <span style={{ margin: '0 6px' }}>➔</span>
                                <Text strong>{String(ch.newVal)}</Text>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    ]}
                  />
                ) : (
                  <Text type="secondary" style={{ fontSize: '12px' }}>No field updates occurred in this batch.</Text>
                )}

                {record.validationErrors && record.validationErrors.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <Title level={5} style={{ fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>
                      Row Rejection Audit Log:
                    </Title>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={record.validationErrors.map((v, i) => ({ ...v, key: i }))}
                      columns={[
                        { title: 'Row #', dataIndex: 'rowNumber', width: 80 },
                        { title: 'External ID', dataIndex: 'externalId', width: 140, render: (t) => <Text className="font-mono">{t || '-'}</Text> },
                        { title: 'Field', dataIndex: 'field', width: 100, render: (f) => <Tag color="red">{f}</Tag> },
                        { title: 'Rejection Reason', dataIndex: 'reason' }
                      ]}
                    />
                  </div>
                )}
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
}

export default ImportHistoryPage;
