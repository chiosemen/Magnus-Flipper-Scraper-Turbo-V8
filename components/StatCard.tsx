import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, trendUp }) => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <div className="p-2 bg-slate-700 rounded-md">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};