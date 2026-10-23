import React from 'react';
import { Tag } from 'antd';
import { AlertOutlined, ArrowUpOutlined, MinusOutlined, ArrowDownOutlined } from '@ant-design/icons';

export function PriorityTag({ priority, score }) {
  const p = priority || 'Medium';
  let color = 'default';
  let icon = <MinusOutlined />;

  if (p === 'Urgent') {
    color = 'error';
    icon = <AlertOutlined />;
  } else if (p === 'High') {
    color = 'warning';
    icon = <ArrowUpOutlined />;
  } else if (p === 'Medium') {
    color = 'processing';
    icon = <MinusOutlined />;
  } else if (p === 'Low') {
    color = 'default';
    icon = <ArrowDownOutlined />;
  }

  return (
    <Tag
      color={color}
      icon={icon}
      style={{
        borderRadius: '6px',
        fontWeight: 600,
        padding: '2px 8px',
        fontSize: '11px'
      }}
    >
      {p} {score !== undefined ? `(${score})` : ''}
    </Tag>
  );
}

export default PriorityTag;
