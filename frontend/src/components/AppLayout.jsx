import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Badge, Space, Button, message, Tooltip, Tag } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  UploadOutlined,
  AuditOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  ExportOutlined,
  SettingOutlined,
  ReloadOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { SystemAPI } from '../services/api.js';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export function AppLayout({ currentTab, onTabChange, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await SystemAPI.health();
        setIsHealthy(true);
      } catch (e) {
        setIsHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResetSeed = async () => {
    setSeeding(true);
    try {
      await SystemAPI.seed();
      message.success('Database reloaded with 52 synthetic conversations!');
      window.location.reload();
    } catch (err) {
      message.error(`Seeding error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' },
    { key: 'inbox', icon: <InboxOutlined />, label: 'Conversation Inbox' },
    { key: 'import', icon: <UploadOutlined />, label: 'Import Center' },
    { key: 'routing', icon: <AuditOutlined />, label: 'Routing Audit' },
    { key: 'findings', icon: <BulbOutlined />, label: 'Findings' },
    { key: 'followups', icon: <CheckSquareOutlined />, label: 'Follow-up Actions' },
    { key: 'history', icon: <HistoryOutlined />, label: 'Import History' },
    { key: 'exports', icon: <ExportOutlined />, label: 'Export Center' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(val) => setCollapsed(val)}
        width={250}
        theme="dark"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100
        }}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">RI</div>
          {!collapsed && (
            <div className="brand-text">
              <h1>Revenue Inbox</h1>
              <span>Sales Intelligence</span>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentTab]}
          onClick={({ key }) => onTabChange(key)}
          items={menuItems}
          style={{ marginTop: '12px' }}
        />

        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: '60px',
              left: '16px',
              right: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Space orientation="horizontal" size={6}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isHealthy ? '#10b981' : '#ef4444'
                }} />
                <Text style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
                  {isHealthy ? 'ENGINE ACTIVE' : 'CONNECTING...'}
                </Text>
              </Space>
              <Text style={{ color: '#64748b', fontSize: '11px' }}>v1.4.0</Text>
            </div>
            <Tooltip title="Reset & reload synthetic test dataset (52 conversations)">
              <Button
                type="text"
                size="small"
                icon={<DatabaseOutlined />}
                loading={seeding}
                onClick={handleResetSeed}
                style={{ color: '#cbd5e1', fontSize: '11px', width: '100%', textAlign: 'left', padding: '0 4px' }}
              >
                Reset Sample Data
              </Button>
            </Tooltip>
          </div>
        )}
      </Sider>

      <Layout style={{ background: '#f8fafc' }}>
        <Header className="main-content-header">
          <div>
            <Text strong style={{ fontSize: '18px', color: '#0f172a' }}>
              {menuItems.find(m => m.key === currentTab)?.label || 'Revenue Intelligence'}
            </Text>
          </div>
          <Space size="middle">
            <Tag color="geekblue" style={{ borderRadius: '6px', padding: '3px 10px', fontSize: '12px' }}>
              Sales Ops Workspace
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                SM
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Sales Manager</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Admin Lead</div>
              </div>
            </div>
          </Space>
        </Header>

        <Content className="page-container animate-fade-in">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppLayout;
