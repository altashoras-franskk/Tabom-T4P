// MetricBar component for observables display

import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  color: 'cyan' | 'red' | 'orange' | 'yellow' | 'purple';
}

const colorMap = {
  cyan: { bg: 'bg-cyan-500/20', fill: 'bg-cyan-400', text: 'text-cyan-200' },
  red: { bg: 'bg-red-500/20', fill: 'bg-red-400', text: 'text-red-200' },
  orange: { bg: 'bg-orange-500/20', fill: 'bg-orange-400', text: 'text-orange-200' },
  yellow: { bg: 'bg-yellow-500/20', fill: 'bg-yellow-400', text: 'text-yellow-200' },
  purple: { bg: 'bg-purple-500/20', fill: 'bg-purple-400', text: 'text-purple-200' },
};

export const MetricBar: React.FC<MetricBarProps> = ({ label, value, color }) => {
  const colors = colorMap[color];
  const pct = Math.round(value * 100);
  
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between">
        <span className={`text-[8px] ${colors.text}`}>{label}</span>
        <span className={`text-[9px] font-mono ${colors.text}`}>{pct}%</span>
      </div>
      <div className={`h-1 rounded-full ${colors.bg} overflow-hidden`}>
        <div
          className={`h-full ${colors.fill} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
