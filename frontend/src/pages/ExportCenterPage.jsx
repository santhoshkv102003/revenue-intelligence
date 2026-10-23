import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Table,
  Select,
  Tag,
  Row,
  Col,
  message,
  Alert,
  Divider,
  Modal
} from 'antd';
import {
  ExportOutlined,
  DownloadOutlined,
  FileZipOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ExportAPI } from '../services/api.js';

const { Title, Text, Paragraph } = Typography;

export function ExportCenterPage() {
  const [loading, setLoading] = useState(false);
  const [exportPackage, setExportPackage] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [manifestModalVisible, setManifestModalVisible] = useState(false);

  // Filters for export
  const [salesRepFilter, setSalesRepFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchJobs = async () => {
    try {
      const res = await ExportAPI.getJobs();
      setJobs(res.jobs || []);
    } catch (err) {
      console.error('Export jobs error:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleGenerateExport = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (salesRepFilter !== 'All') filters.salesRep = salesRepFilter;
      if (priorityFilter !== 'All') filters.priority = priorityFilter;

      const res = await ExportAPI.generate(filters);
      setExportPackage(res);
      message.success(`Export package ${res.exportId} generated with verified SHA-256 checksums!`);
      fetchJobs();
    } catch (err) {
      message.error(`Export generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filesColumns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      render: (f) => <Text strong className="font-mono">{f}</Text>
    },
    {
      title: 'Record Count',
      dataIndex: 'recordCount',
      key: 'recordCount',
      render: (c) => <Tag color="blue">{c} records</Tag>
    },
    {
      title: 'Size',
      dataIndex: 'sizeBytes',
      key: 'sizeBytes',
      render: (s) => `${Math.round(s / 1024 * 10) / 10} KB`
    },
    {
      title: 'SHA-256 Checksum (Cryptographic Integrity)',
      dataIndex: 'sha256',
      key: 'sha256',
      render: (hash) => (
        <Tooltip title={hash}>
          <Text className="font-mono" style={{ fontSize: '11px', color: '#64748b' }}>
            {hash.substring(0, 16)}...{hash.substring(hash.length - 8)}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Download',
      key: 'action',
      render: (_, r) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          href={ExportAPI.getDownloadUrl(exportPackage.exportId, r.filename)}
          download={r.filename}
        >
          Download
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              <ExportOutlined style={{ color: '#6366f1' }} /> Export Center & Verified Manifest Generator
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Export auditable CSV and JSON datasets, complete audit trails, and cryptographically verified manifest.json.
            </Text>
          </div>
        </div>
      </Card>

      {/* Generator Card */}
      <Card title="Generate New Audited Export Package" className="glass-card">
        <Space wrap size="middle" style={{ marginBottom: '16px' }}>
          <Select
            style={{ width: 180 }}
            value={salesRepFilter}
            onChange={setSalesRepFilter}
            options={[
              { label: 'All Sales Reps', value: 'All' },
              { label: 'Sarah Chen', value: 'Sarah Chen' },
              { label: 'Alex Miller', value: 'Alex Miller' },
              { label: 'Marcus Vance', value: 'Marcus Vance' },
              { label: 'Elena Rostova', value: 'Elena Rostova' },
              { label: 'David Kim', value: 'David Kim' }
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

          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleGenerateExport}
            loading={loading}
            style={{ background: '#6366f1' }}
          >
            Generate Export Package & Manifest
          </Button>
        </Space>

        {exportPackage && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <Space>
                  <Tag color="purple" className="font-mono">{exportPackage.exportId}</Tag>
                  <Text strong>Active Export Bundle Ready</Text>
                  <Tag color="green" icon={<SafetyCertificateOutlined />}>SHA-256 Verified</Tag>
                </Space>
              </div>
              <Space>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setManifestModalVisible(true)}
                >
                  Inspect manifest.json
                </Button>
                <Button
                  type="primary"
                  icon={<FileZipOutlined />}
                  href={ExportAPI.getZipDownloadUrl(exportPackage.exportId)}
                  download={`${exportPackage.exportId}_all_exports.zip`}
                  style={{ background: '#10b981' }}
                >
                  Download All Exports (ZIP)
                </Button>
              </Space>
            </div>

            <Table
              size="small"
              pagination={false}
              dataSource={(exportPackage.filesMetadata || []).map((f, i) => ({ ...f, key: i }))}
              columns={filesColumns}
            />
          </div>
        )}
      </Card>

      {/* Historical Exports Log */}
      <Card title={<span><HistoryOutlined /> Historical Export Packages</span>} className="glass-card">
        <Table
          size="small"
          dataSource={jobs.map(j => ({ ...j, key: j._id }))}
          pagination={{ pageSize: 5 }}
          columns={[
            {
              title: 'Export ID',
              dataIndex: 'exportId',
              render: (id) => <Text strong className="font-mono" style={{ color: '#6366f1' }}>{id}</Text>
            },
            {
              title: 'Created At',
              dataIndex: 'createdAt',
              render: (d) => new Date(d).toLocaleString()
            },
            {
              title: 'Record Count',
              dataIndex: 'totalRecords',
              render: (cnt) => <Tag color="blue">{cnt} conversations</Tag>
            },
            {
              title: 'Files Bundled',
              dataIndex: 'filesGenerated',
              render: (files) => `${files?.length || 0} files`
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s) => <Tag color="success">{s}</Tag>
            },
            {
              title: 'Download Bundle',
              key: 'download',
              render: (_, r) => (
                <Button
                  size="small"
                  icon={<FileZipOutlined />}
                  href={ExportAPI.getZipDownloadUrl(r.exportId)}
                  download={`${r.exportId}_all_exports.zip`}
                >
                  Download ZIP
                </Button>
              )
            }
          ]}
        />
      </Card>

      {/* Manifest Inspection Modal */}
      <Modal
        title={<span><SafetyCertificateOutlined style={{ color: '#10b981' }} /> Verified manifest.json</span>}
        open={manifestModalVisible}
        onOk={() => setManifestModalVisible(false)}
        onCancel={() => setManifestModalVisible(false)}
        width={750}
      >
        <Paragraph type="secondary">
          The export manifest provides cryptographic provenance and describes the exact files and record counts generated:
        </Paragraph>
        <pre
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {JSON.stringify(exportPackage?.manifestData, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

export default ExportCenterPage;
