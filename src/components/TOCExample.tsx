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
      excerpt: 'This section provides an overview of the main concepts and getting started guide for new users...',
      children: [
        {
          id: 'overview',
          title: 'Overview',
          level: 2,
          excerpt: 'A comprehensive look at the system architecture and core principles that guide the development...',
        },
        {
          id: 'getting-started',
          title: 'Getting Started',
          level: 2,
          excerpt: 'Step-by-step instructions to help you set up and configure your environment for optimal performance...',
          children: [
            {
              id: 'installation',
              title: 'Installation',
              level: 3,
              excerpt: 'Download and install the required dependencies using your preferred package manager or build tools...',
            },
            {
              id: 'configuration',
              title: 'Configuration',
              level: 3,
              excerpt: 'Customize settings and environment variables to match your specific requirements and deployment needs...',
            }
          ]
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      level: 1,
      excerpt: 'Explore the comprehensive feature set including core functionality and advanced customization options available...',
      children: [
        {
          id: 'core-features',
          title: 'Core Features',
          level: 2,
          excerpt: 'Essential functionality that forms the foundation of the system including user management and data processing...',
        },
        {
          id: 'advanced-features',
          title: 'Advanced Features',
          level: 2,
          excerpt: 'Extended capabilities for power users including automation tools and integration with third-party services...',
          children: [
            {
              id: 'customization',
              title: 'Customization',
              level: 3,
              excerpt: 'Tailor the interface and behavior to your specific needs using themes plugins and configuration files...',
            }
          ]
        }
      ]
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      level: 1,
      excerpt: 'Summary of key points covered and next steps for implementing the solution in your workflow...',
    }
  ]

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <CollapsibleTOC items={sampleTOCItems} />
    </div>
  )
}