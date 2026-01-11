'use client';

import React from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export default function DownloadButton({ posts }: { posts: any[] }) {
  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(posts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Posts');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'posts_analytics.xlsx');
  };

  return (
    <button
      onClick={handleDownloadExcel}
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
    >
      Download Excel
    </button>
  );
}
