'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface YearlyChartProps {
  chartData: any[];
  categories: string[];
}

export default function YearlyChart({ chartData, categories }: YearlyChartProps) {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          {categories.map((cat) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              fill={
                cat === 'syllabus' ? '#EC4899' :
                cat === 'chapter' ? '#10B981' :
                cat === 'topic' ? '#8B5CF6' :
                cat === 'concept' ? '#F97316' :
                cat === 'last-year-paper' ? '#3B82F6' :
                '#9CA3AF'
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
