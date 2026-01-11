"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TOCItem {
  id: string
  title: string
  level: number
  children?: TOCItem[]
}

interface CollapsibleTOCProps {
  items: TOCItem[]
  className?: string
}

export function CollapsibleTOC({ items, className }: CollapsibleTOCProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const renderTOCItem = (item: TOCItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedId === item.id

    return (
      <div key={item.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            hasChildren && "font-medium"
          )}
          onClick={() => hasChildren && toggleExpanded(item.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
          <a
            href={`#${item.id}`}
            className={cn(
              "text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
              item.level === 1 && "font-semibold text-base",
              item.level === 2 && "font-medium",
              item.level >= 3 && "text-xs"
            )}
            onClick={(e) => hasChildren && e.preventDefault()}
          >
            {item.title}
          </a>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-6 border-l border-gray-200 dark:border-gray-700 pl-3 mt-1">
            {item.children?.map(renderTOCItem)}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className={cn("space-y-1", className)}>
      <div 
        className="flex items-center justify-between cursor-pointer mb-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Table of Contents
        </h3>
        <div className="flex-shrink-0">
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="space-y-1">
          {items.map(renderTOCItem)}
        </div>
      )}
    </nav>
  )
}