import React from 'react';
import { Tag } from 'antd';
import {
  FireOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';

const QUEUE_CONFIG = {
  'High Priority': { color: 'red', icon: <FireOutlined />, bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  'Follow-up Required': { color: 'orange', icon: <ClockCircleOutlined />, bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  'Customer Risk': { color: 'magenta', icon: <WarningOutlined />, bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  'Pricing and Negotiation': { color: 'gold', icon: <DollarOutlined />, bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  'Technical Questions': { color: 'blue', icon: <ToolOutlined />, bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  'Positive Buying Signals': { color: 'green', icon: <CheckCircleOutlined />, bg: '#dcfce7', border: '#86efac', text: '#166534' },
  'General Conversations': { color: 'default', icon: <CommentOutlined />, bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' },
  'Unassigned / Needs Review': { color: 'purple', icon: <QuestionCircleOutlined />, bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
  'Recently Updated': { color: 'cyan', icon: <SyncOutlined />, bg: '#cffafe', border: '#67e8f9', text: '#155e75' }
};

export function QueueTag({ queue }) {
  const conf = QUEUE_CONFIG[queue] || { color: 'default', icon: <CommentOutlined />, text: '#334155' };
  return (
    <Tag
      icon={conf.icon}
      color={conf.color}
      style={{
        borderRadius: '6px',
        fontWeight: 600,
        padding: '2px 8px',
        fontSize: '12px'
      }}
    >
      {queue || 'Unassigned'}
    </Tag>
  );
}

export default QueueTag;
