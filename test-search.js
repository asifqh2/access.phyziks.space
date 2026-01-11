// Test search functionality
const testFavorites = [
  {
    id: '1',
    title: 'Physics Question 1',
    content: 'What is the speed of light?',
    category: 'physics',
    subject: 'Physics',
    url: '/test1',
    timestamp: '2024-01-01'
  },
  {
    id: '2', 
    title: 'Math Problem',
    content: 'Solve for x in equation',
    category: 'mathematics',
    subject: 'Math',
    url: '/test2',
    timestamp: '2024-01-02'
  }
];

function testSearch(query, items) {
  const q = query.toLowerCase();
  return items.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.content.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    (item.subject && item.subject.toLowerCase().includes(q))
  );
}

// Test cases
console.log('Search "physics":', testSearch('physics', testFavorites));
console.log('Search "light":', testSearch('light', testFavorites));
console.log('Search "math":', testSearch('math', testFavorites));
console.log('Search "equation":', testSearch('equation', testFavorites));