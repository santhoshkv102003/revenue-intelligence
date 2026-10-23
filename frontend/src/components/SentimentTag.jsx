import React from 'react';
import { Tag } from 'antd';
import { SmileOutlined, MehOutlined, FrownOutlined } from '@ant-design/icons';

export function SentimentTag({ sentiment, score }) {
  const s = sentiment || 'Neutral';
  let color = 'default';
  let icon = <MehOutlined />;

  if (s === 'Positive') {
    color = 'success';
    icon = <SmileOutlined />;
  } else if (s === 'Negative') {
    color = 'error';
    icon = <FrownOutlined />;
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
      {s} {score !== undefined && score !== 0 ? `(${score > 0 ? '+' : ''}${score.toFixed(1)})` : ''}
    </Tag>
  );
}

export default SentimentTag;
