// Utility to add test favorites for testing search functionality
export const addTestFavorites = () => {
  const testFavorites = [
    {
      id: 'test1',
      title: 'Wave Optics - Interference and Diffraction',
      content: 'Complete guide to wave optics including interference and diffraction patterns',
      url: '/chapter/wave-optics',
      category: 'chapter',
      subject: 'Physics',
      timestamp: new Date().toISOString()
    },
    {
      id: 'test2', 
      title: 'Maharashtra Board Class 12 Physics 2024',
      content: 'Complete solutions for Maharashtra Board Class 12 Physics 2024',
      url: '/last-year-paper/physics-2024',
      category: 'last-year-paper',
      subject: 'Physics',
      timestamp: new Date().toISOString()
    },
    {
      id: 'test3',
      title: 'Series LCR Circuit - Average Power',
      content: 'Derive expression for average power dissipated in series LCR circuit',
      url: '/topic/lcr-circuit',
      category: 'topic',
      subject: 'Physics',
      timestamp: new Date().toISOString()
    }
  ];

  localStorage.setItem('favoriteQuestions', JSON.stringify(testFavorites));
  console.log('Test favorites added!');
};

export const clearTestFavorites = () => {
  localStorage.removeItem('favoriteQuestions');
  console.log('Test favorites cleared!');
};