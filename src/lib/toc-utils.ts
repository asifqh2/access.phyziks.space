// Utility function to generate TOC items from HTML content or headings

export interface TOCItem {
  id: string
  title: string
  level: number
  children?: TOCItem[]
}

export function generateTOCFromHTML(htmlContent: string): TOCItem[] {
  if (typeof window === 'undefined') return []
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
  
  return buildTOCTree(Array.from(headings))
}

export function generateTOCFromDOM(): TOCItem[] {
  if (typeof window === 'undefined') return []
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  return buildTOCTree(Array.from(headings))
}

function buildTOCTree(headings: Element[]): TOCItem[] {
  const items: TOCItem[] = []
  const stack: TOCItem[] = []

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    const title = heading.textContent?.trim() || ''
    const id = heading.id || generateId(title)
    
    // Ensure heading has an id for linking
    if (!heading.id) {
      heading.id = id
    }

    const item: TOCItem = { id, title, level, children: [] }

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