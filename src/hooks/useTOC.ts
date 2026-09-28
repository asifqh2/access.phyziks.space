"use client"

import { useState, useEffect } from 'react'
import { generateTOCFromHTML, generateTOCFromDOM, type TOCItem } from '@/lib/toc-utils'

export function useTOC(content?: string) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([])

  useEffect(() => {
    if (content) {
      // Generate from HTML content
      setTocItems(generateTOCFromHTML(content))
    } else {
      // Generate from DOM
      const timer = setTimeout(() => {
        setTocItems(generateTOCFromDOM())
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [content])

  return tocItems
}