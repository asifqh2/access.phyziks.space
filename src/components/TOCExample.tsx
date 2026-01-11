"use client"

import React from 'react'
import { CollapsibleTOC } from './CollapsibleTOC'
import type { TOCItem } from '@/lib/toc-utils'

// Example usage component
export function TOCExample() {
  const sampleTOCItems: TOCItem[] = [
    {
      id: 'introduction',
      title: 'Introduction',
      level: 1,
      children: [
        {
          id: 'overview',
          title: 'Overview',
          level: 2,
        },
        {
          id: 'getting-started',
          title: 'Getting Started',
          level: 2,
          children: [
            {
              id: 'installation',
              title: 'Installation',
              level: 3,
            },
            {
              id: 'configuration',
              title: 'Configuration',
              level: 3,
            }
          ]
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      level: 1,
      children: [
        {
          id: 'core-features',
          title: 'Core Features',
          level: 2,
        },
        {
          id: 'advanced-features',
          title: 'Advanced Features',
          level: 2,
          children: [
            {
              id: 'customization',
              title: 'Customization',
              level: 3,
            }
          ]
        }
      ]
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      level: 1,
    }
  ]

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <CollapsibleTOC items={sampleTOCItems} />
    </div>
  )
}