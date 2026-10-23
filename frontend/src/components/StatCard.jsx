import React from 'react';
import { Card, Typography, Space } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function StatCard({ title, value, icon, subtitle, color = '#6366f1', onClick, isAlert = false }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card metric-card ${isAlert ? 'border-amber-300' : ''}`}
      style={{
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="metric-label">{title}</div>
          <div className="metric-value" style={{ color: isAlert ? '#b45309' : undefined }}>
            {value !== undefined && value !== null ? value : '-'}
          </div>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {subtitle}
            </Text>
          )}
        </div>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
        >
          {icon}
        </div>
      </div>
      {onClick && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
          <span>View in inbox</span>
          <ArrowRightOutlined style={{ fontSize: '10px' }} />
        </div>
      )}
    </div>
  );
}

export default StatCard;
