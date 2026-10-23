import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Table,
  Typography,
  Space,
  Select,
  Tag,
  Alert,
  Steps,
  Row,
  Col,
  message,
  Modal,
  Divider
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  WarningOutlined,
  DiffOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { ImportAPI } from '../services/api.js';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

export function ImportCenterPage({ onImportSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [commitResult, setCommitResult] = useState(null);
  const [dataDictionaryVisible, setDataDictionaryVisible] = useState(false);

  // Upload handler
  const handleFileUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await ImportAPI.preview(formData);
      setPreviewData(res);
      setColumnMapping(res.detectedMapping || {});
      setCurrentStep(1);
      message.success(`Parsed ${res.totalRows} rows from ${res.filename}`);
    } catch (err) {
      message.error(`Upload error: ${err.message}`);
    } finally {
      setLoading(false);
    }
    return false; // prevent default antd upload
  };

  // Quick load of sample files from backend
  const handleLoadSample = async (filename) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sample-files/${filename}`);
      if (!response.ok) throw new Error('Failed to fetch sample file');
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'text/csv' });
      await handleFileUpload(file);
    } catch (err) {
      message.error(`Failed to load sample: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMapping = (canonical, sourceCol) => {
    setColumnMapping(prev => ({
      ...prev,
      [canonical]: sourceCol
    }));
  };

  const handleConfirmCommit = async () => {
    setLoading(true);
    try {
      const res = await ImportAPI.commit({
        rawRows: previewData.rawRows,
        mapping: columnMapping,
        filename: previewData.filename,
        fileType: previewData.fileType
      });
      setCommitResult(res.batch);
      setCurrentStep(3);
      message.success(`Batch ${res.batch.batchId} committed successfully!`);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      message.error(`Commit failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const summary = previewData?.previewSummary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sample Data Download Bar */}
      <Card size="small" className="glass-card" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <Text strong style={{ color: '#0f172a' }}>Standardized Import Center</Text>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Upload CSV or JSON files. Supports automatic header aliasing, idempotent deduplication, and field ownership protection.
            </div>
          </div>
          <Space wrap>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href="/api/sample-files/sample_conversations_initial.csv"
              download="sample_conversations_initial.csv"
            >
              Initial Seed (CSV)
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href="/api/sample-files/sample_conversations_initial.json"
              download="sample_conversations_initial.json"
            >
              Initial Seed (JSON)
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href="/api/sample-files/sample_conversations_update_and_duplicates.csv"
              download="sample_conversations_update_and_duplicates.csv"
              style={{ borderColor: '#f59e0b', color: '#d97706' }}
            >
              Duplicate & Update Test File
            </Button>
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => setDataDictionaryVisible(true)}
            >
              Data Dictionary
            </Button>
          </Space>
        </div>
      </Card>

      {/* Steps Indicator */}
      <Card size="small" className="glass-card">
        <Steps
          current={currentStep}
          items={[
            { title: 'Upload File' },
            { title: 'Column Mapping & Preview' },
            { title: 'Duplicate & Update Audit' },
            { title: 'Commit & Report' }
          ]}
        />
      </Card>

      {/* Step 0: Upload */}
      {currentStep === 0 && (
        <Card className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <Dragger
            name="file"
            multiple={false}
            beforeUpload={handleFileUpload}
            showUploadList={false}
            style={{ padding: '30px', background: '#faf5ff', borderColor: '#c084fc' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#8b5cf6', fontSize: '48px' }} />
            </p>
            <Title level={4} style={{ color: '#4c1d95', margin: '8px 0' }}>
              Click or drag conversation records file here to import
            </Title>
            <p className="ant-upload-text" style={{ color: '#6b21a8' }}>
              Supports CSV and JSON formats containing call transcripts, meeting summaries, or sales CRM logs.
            </p>
          </Dragger>

          <Divider style={{ margin: '24px 0' }}>Or quickly load verified test files</Divider>

          <Space size="middle">
            <Button
              type="primary"
              style={{ background: '#6366f1' }}
              onClick={() => handleLoadSample('sample_conversations_initial.csv')}
              loading={loading}
            >
              Load Sample 52 Conversations (CSV)
            </Button>
            <Button
              onClick={() => handleLoadSample('sample_conversations_update_and_duplicates.csv')}
              loading={loading}
              style={{ borderColor: '#f59e0b', color: '#d97706' }}
            >
              Load Duplicates & Updates Test File (CSV)
            </Button>
          </Space>
        </Card>
      )}

      {/* Step 1: Column Mapping */}
      {currentStep === 1 && previewData && (
        <Card title={`Step 2: Map Columns for ${previewData.filename}`} className="glass-card">
          <Alert
            message="Auto-detected Field Mappings"
            description="Our schema normalizer matched the uploaded columns to canonical schema fields. Review or adjust any mappings before validating."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Table
            size="small"
            pagination={false}
            dataSource={(previewData.canonicalFields || []).map((field, idx) => ({
              key: idx,
              canonical: field,
              mappedSource: columnMapping[field] || ''
            }))}
            columns={[
              {
                title: 'Canonical Application Field',
                dataIndex: 'canonical',
                key: 'canonical',
                render: (f) => (
                  <Space>
                    <Text strong className="font-mono">{f}</Text>
                    {['externalId', 'company', 'title'].includes(f) && <Tag color="red">Required</Tag>}
                  </Space>
                )
              },
              {
                title: 'Mapped File Column',
                dataIndex: 'mappedSource',
                key: 'mappedSource',
                render: (_, record) => (
                  <Select
                    style={{ width: 260 }}
                    value={columnMapping[record.canonical] || ''}
                    onChange={(val) => handleUpdateMapping(record.canonical, val)}
                    options={[
                      { label: '-- Do Not Map (Omit) --', value: '' },
                      ...(previewData.fileHeaders || []).map(h => ({ label: h, value: h }))
                    ]}
                  />
                )
              },
              {
                title: 'Sample Value from File',
                key: 'sample',
                render: (_, record) => {
                  const sourceCol = columnMapping[record.canonical];
                  const sampleVal = previewData.rawRowsSample?.[0]?.[sourceCol];
                  return <Text type="secondary">{sampleVal !== undefined ? String(sampleVal) : 'N/A'}</Text>;
                }
              }
            ]}
          />

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setCurrentStep(0)}>Back to Upload</Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => setCurrentStep(2)}
              style={{ background: '#6366f1' }}
            >
              Proceed to Duplicate & Update Audit
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Duplicate & Update Audit Preview */}
      {currentStep === 2 && previewData && (
        <Card title="Step 3: Idempotent Deduplication & Update Audit Preview" className="glass-card">
          <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
            <Col xs={12} sm={6}>
              <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <Text style={{ color: '#065f46', fontSize: '12px', fontWeight: 600 }}>NEW RECORDS</Text>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#047857' }}>
                  {summary.newRecordsCount || 0}
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Will create new conversations</Text>
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <Text style={{ color: '#1e40af', fontSize: '12px', fontWeight: 600 }}>SOURCE UPDATES</Text>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1d4ed8' }}>
                  {summary.updatedRecordsCount || 0}
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Manual overrides preserved</Text>
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Text style={{ color: '#334155', fontSize: '12px', fontWeight: 600 }}>EXACT DUPLICATES</Text>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#475569' }}>
                  {summary.duplicateRecordsCount || 0}
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Skipped (100% idempotent)</Text>
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <Text style={{ color: '#991b1b', fontSize: '12px', fontWeight: 600 }}>REJECTED ROWS</Text>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c' }}>
                  {summary.rejectedRecordsCount || 0}
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Missing required fields</Text>
              </div>
            </Col>
          </Row>

          {/* Validation Warnings / Rejections */}
          {summary.validationErrors && summary.validationErrors.length > 0 && (
            <Alert
              message={`${summary.validationErrors.length} Invalid Rows Detected`}
              description={
                <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                  {summary.validationErrors.map((err, i) => (
                    <li key={i}>
                      Row #{err.rowNumber} ({err.externalId || 'No ID'}): {err.reason}
                    </li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          <Title level={5}>Row-by-Row Classification Preview (First 100 rows)</Title>
          <Table
            size="small"
            pagination={{ pageSize: 10 }}
            dataSource={(summary.previewItems || []).map((item, idx) => ({ ...item, key: idx }))}
            columns={[
              { title: 'Row', dataIndex: 'rowNumber', width: 70 },
              { title: 'External ID', dataIndex: 'externalId', width: 140, render: (t) => <Text className="font-mono">{t || '-'}</Text> },
              { title: 'Company', dataIndex: 'company' },
              {
                title: 'Classification Status',
                dataIndex: 'status',
                render: (st) => {
                  if (st === 'NEW_RECORD') return <Tag color="green">NEW RECORD</Tag>;
                  if (st === 'CHANGED_UPDATE') return <Tag color="blue">CHANGED UPDATE</Tag>;
                  if (st === 'EXACT_DUPLICATE') return <Tag color="default">EXACT DUPLICATE</Tag>;
                  if (st === 'AMBIGUOUS_MATCH') return <Tag color="purple">AMBIGUOUS MATCH</Tag>;
                  if (st === 'REJECTED') return <Tag color="red">REJECTED</Tag>;
                  return <Tag>{st}</Tag>;
                }
              },
              { title: 'Engine Action / Diff', dataIndex: 'action' }
            ]}
          />

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setCurrentStep(1)}>Back to Mapping</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirmCommit}
              loading={loading}
              style={{ background: '#10b981' }}
            >
              Confirm & Commit Batch
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Commit Report */}
      {currentStep === 3 && commitResult && (
        <Card className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>
          <CheckCircleOutlined style={{ fontSize: '56px', color: '#10b981', marginBottom: '16px' }} />
          <Title level={3} style={{ color: '#0f172a', marginBottom: '8px' }}>
            Batch Import Successfully Committed!
          </Title>
          <Paragraph type="secondary">
            Batch ID: <span className="font-mono" style={{ fontWeight: 600, color: '#6366f1' }}>{commitResult.batchId}</span> • Filename: {commitResult.filename}
          </Paragraph>

          <Row gutter={[16, 16]} style={{ maxWidth: '800px', margin: '24px auto', textAlign: 'left' }}>
            <Col xs={12} sm={6}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>New Conversations</Text>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>+{commitResult.newRecordsCount}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Updated Records</Text>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{commitResult.updatedRecordsCount}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Duplicates Skipped</Text>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>{commitResult.duplicateRecordsCount}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Rejected Rows</Text>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{commitResult.rejectedRecordsCount}</div>
              </div>
            </Col>
          </Row>

          <Space size="middle">
            <Button type="primary" style={{ background: '#6366f1' }} onClick={() => setCurrentStep(0)}>
              Import Another File
            </Button>
          </Space>
        </Card>
      )}

      {/* Data Dictionary Modal */}
      <Modal
        title="Revenue Intelligence Data Dictionary & Ingestion Specifications"
        open={dataDictionaryVisible}
        onOk={() => setDataDictionaryVisible(false)}
        onCancel={() => setDataDictionaryVisible(false)}
        width={750}
      >
        <Paragraph>
          The application normalizes heterogeneous CRM and telephony records into a canonical schema:
        </Paragraph>
        <Table
          size="small"
          pagination={false}
          dataSource={[
            { col: 'externalId', type: 'String (Required)', desc: 'Unique identifier from source system' },
            { col: 'title', type: 'String (Required)', desc: 'Call or meeting title' },
            { col: 'company', type: 'String (Required)', desc: 'Customer account / organization name' },
            { col: 'contactName', type: 'String', desc: 'Primary customer participant' },
            { col: 'contactEmail', type: 'String', desc: 'Work email address' },
            { col: 'salesRep', type: 'String', desc: 'Assigned AE or sales representative' },
            { col: 'timestamp', type: 'ISO 8601 (Required)', desc: 'Call recording date and time' },
            { col: 'durationMinutes', type: 'Integer', desc: 'Duration in minutes' },
            { col: 'transcriptOrNotes', type: 'Text (Required)', desc: 'Call transcript or verbatim notes' },
            { col: 'opportunityId', type: 'String', desc: 'Linked CRM Opportunity deal ID' }
          ]}
          columns={[
            { title: 'Column Name', dataIndex: 'col', render: (t) => <Text strong className="font-mono">{t}</Text> },
            { title: 'Data Type', dataIndex: 'type' },
            { title: 'Description', dataIndex: 'desc' }
          ]}
        />
      </Modal>
    </div>
  );
}

export default ImportCenterPage;
