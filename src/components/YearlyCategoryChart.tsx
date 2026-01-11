'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

type Post = {
  id: string;
  topic: string;
  category: string;
  createdAt: string;
};

interface YearlyCategoryChartProps {
  posts: Post[];
}

export default function YearlyCategoryChart({ posts }: YearlyCategoryChartProps) {
  // ✅ Extract unique years and categories
  const allYears = Array.from(
    new Set(posts.map((p) => new Date(p.createdAt).getFullYear().toString()))
  ).sort();

  const allCategories = Array.from(new Set(posts.map((p) => p.category)));

  // ✅ Default select all years
  const [selectedYears, setSelectedYears] = useState<string[]>([...allYears]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // ✅ Toggle multiple years
  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  // ✅ Filter posts by category & selected years
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const year = new Date(p.createdAt).getFullYear().toString();
      const matchYear = selectedYears.includes(year);
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchYear && matchCategory;
    });
  }, [posts, selectedYears, selectedCategory]);

  // ✅ Prepare chart data
  const chartData = useMemo(() => {
    const topicYearMap: Record<string, Record<string, number>> = {};

    filteredPosts.forEach((p) => {
      const year = new Date(p.createdAt).getFullYear().toString();
      if (!topicYearMap[p.topic]) topicYearMap[p.topic] = {};
      if (!topicYearMap[p.topic][year]) topicYearMap[p.topic][year] = 0;
      topicYearMap[p.topic][year] += 1;
    });

    return Object.entries(topicYearMap).map(([topic, years]) => ({
      topic,
      ...years,
    }));
  }, [filteredPosts]);

  const barColors = [
    '#4F46E5', // Indigo
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        📊 Topic-wise Comparison by Year
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        {/* ✅ Category Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Category:</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Year Checkbox Filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">Years:</span>
          {allYears.map((year) => (
            <label key={year} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedYears.includes(year)}
                onChange={() => toggleYear(year)}
              />
              {year}
            </label>
          ))}
        </div>
      </div>

      {/* ✅ Chart */}
      {chartData.length > 0 ? (
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" />
              <YAxis />
              <Tooltip />
              <Legend />

              {/* ✅ Dynamic bars for all selected years */}
              {selectedYears.map((year, index) => (
                <Bar
                  key={year}
                  dataKey={year}
                  fill={barColors[index % barColors.length]}
                  name={year}
                >
                  {/* ✅ Show the value (count) and topic name on top */}
                  <LabelList dataKey={year} position="top" formatter={(v) => v ?? ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10">
          No data available for selected filters.
        </p>
      )}
    </div>
  );
}
