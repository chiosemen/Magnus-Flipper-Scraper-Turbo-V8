import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Listing } from '../types';

interface ChartsProps {
  listings: Listing[];
}

export const Charts: React.FC<ChartsProps> = ({ listings }) => {
  // Process data for chart
  const priceRanges = [0, 100, 200, 300, 400, 500];
  const data = priceRanges.slice(0, -1).map((min, i) => {
    const max = priceRanges[i + 1];
    const count = listings.filter(l => l.price >= min && l.price < max).length;
    return {
      name: `$${min}-${max}`,
      count,
    };
  });

  if (listings.length === 0) return null;

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-sm h-full">
      <h3 className="text-slate-200 font-semibold mb-6">Price Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
            />
            <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                allowDecimals={false}
            />
            <Tooltip 
                cursor={{fill: '#334155'}}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#818cf8' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#6366f1" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};