// Utility function to generate TOC items from HTML content or headings

export interface TOCItem {
  id: string
  title: string
  level: number
  excerpt?: string
  children?: TOCItem[]
}

export function generateTOCFromHTML(htmlContent: string): TOCItem[] {
  if (typeof window === 'undefined') return []
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
  
  return buildTOCTree(Array.from(headings), htmlContent)
}

export function generateTOCFromDOM(): TOCItem[] {
  if (typeof window === 'undefined') return []
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  return buildTOCTree(Array.from(headings), document.documentElement.outerHTML)
}

function buildTOCTree(headings: Element[], htmlContent?: string): TOCItem[] {
  const items: TOCItem[] = []
  const stack: TOCItem[] = []

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1))
    const title = heading.textContent?.trim() || ''
    const id = heading.id || generateId(title)
    
    // Ensure heading has an id for linking
    if (!heading.id) {
      heading.id = id
    }

    // Extract excerpt from content following this heading
    const excerpt = htmlContent ? extractExcerptFromHTML(heading, headings[index + 1], htmlContent) : extractExcerpt(heading, headings[index + 1])

    const item: TOCItem = { id, title, level, excerpt, children: [] }

    // Find the correct parent based on heading level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      items.push(item)
    } else {
      const parent = stack[stack.length - 1]
      if (!parent.children) parent.children = []
      parent.children.push(item)
    }

    stack.push(item)
  })

  return items
}

function generateId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function extractExcerptFromHTML(currentHeading: Element, nextHeading?: Element, htmlContent?: string): string {
  if (!htmlContent) return extractExcerpt(currentHeading, nextHeading)
  
  const headingRegex = new RegExp(`<h[1-6][^>]*id="${currentHeading.id}"[^>]*>.*?</h[1-6]>`, 'i')
  const match = htmlContent.match(headingRegex)
  if (!match) return ''
  
  const startIndex = match.index! + match[0].length
  let endIndex = htmlContent.length
  
  if (nextHeading?.id) {
    const nextHeadingRegex = new RegExp(`<h[1-6][^>]*id="${nextHeading.id}"[^>]*>`, 'i')
    const nextMatch = htmlContent.match(nextHeadingRegex)
    if (nextMatch?.index) {
      endIndex = nextMatch.index
    }
  }
  
  const content = htmlContent.slice(startIndex, endIndex)
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = textContent.split(' ').filter(word => word.length > 0)
  
  if (words.length === 0) return ''
  return words.length > 25 ? words.slice(0, 25).join(' ') + '...' : words.join(' ')
}

function extractExcerpt(currentHeading: Element, nextHeading?: Element): string {
  let content = ''
  let element = currentHeading.nextElementSibling
  
  while (element && element !== nextHeading) {
    if (element.tagName.match(/^H[1-6]$/)) break
    content += element.textContent + ' '
    element = element.nextElementSibling
  }
  
  const words = content.trim().split(/\s+/).filter(word => word.length > 0)
  if (words.length === 0) return ''
  
  const excerpt = words.slice(0, 25).join(' ')
  return words.length > 25 ? excerpt + '...' : excerpt
}