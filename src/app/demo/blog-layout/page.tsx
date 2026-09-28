import BlogPostLayout from '@/components/BlogPostLayout';

export default function BlogLayoutDemo() {
  const demoPost = {
    id: 'demo-post',
    title: 'Demo Blog Post with Enhanced Layout',
    content: `
      <h2 id="introduction">Introduction</h2>
      <p>This is a demonstration of the new blog post layout with left sidebar table of contents and right sidebar related content.</p>
      
      <h2 id="features">Key Features</h2>
      <p>The enhanced layout includes several new features:</p>
      <ul>
        <li>Automatic table of contents generation</li>
        <li>Reading progress indicator</li>
        <li>Related content suggestions</li>
        <li>Responsive design</li>
      </ul>
      
      <h3 id="table-of-contents">Table of Contents</h3>
      <p>The table of contents is automatically generated from the headings in your content. It includes smooth scrolling and active section highlighting.</p>
      
      <h3 id="related-content">Related Content</h3>
      <p>The right sidebar shows related posts, chapters, topics, and concepts based on the post's tags and categories.</p>
      
      <h2 id="styling">Enhanced Styling</h2>
      <p>The layout includes enhanced typography, better spacing, and improved visual hierarchy.</p>
      
      <h3 id="responsive-design">Responsive Design</h3>
      <p>The layout is fully responsive and works great on mobile devices with collapsible sidebars.</p>
      
      <h2 id="conclusion">Conclusion</h2>
      <p>This new layout provides a much better reading experience with improved navigation and content discovery.</p>
    `,
    tags: ['demo', 'layout', 'blog', 'ui'],
    chapters: ['Web Development', 'UI Design'],
    topics: ['Blog Layout', 'User Experience'],
    concepts: ['Responsive Design', 'Navigation'],
    category: 'blog',
    subject: 'Web Development'
  };

  const relatedPosts = [
    {
      id: '1',
      title: 'Building Better User Interfaces',
      slug: 'building-better-user-interfaces',
      category: 'blog',
      views: 1250
    },
    {
      id: '2',
      title: 'Responsive Web Design Principles',
      slug: 'responsive-web-design-principles',
      category: 'blog',
      views: 980
    }
  ];

  const relatedChapters = [
    {
      id: '3',
      title: 'Web Development Fundamentals',
      slug: 'web-development-fundamentals',
      category: 'chapter',
      views: 2100
    }
  ];

  const relatedTopics = [
    {
      id: '4',
      title: 'User Experience Design',
      slug: 'user-experience-design',
      category: 'topic',
      views: 1500
    }
  ];

  const relatedConcepts = [
    {
      id: '5',
      title: 'Mobile-First Design',
      slug: 'mobile-first-design',
      category: 'concept',
      views: 800
    }
  ];

  return (
    <BlogPostLayout
      post={demoPost}
      relatedPosts={relatedPosts}
      relatedChapters={relatedChapters}
      relatedTopics={relatedTopics}
      relatedConcepts={relatedConcepts}
    >
      <article className="prose prose-lg max-w-none">
        <header className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {demoPost.title}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Experience the new blog post layout with enhanced navigation and content discovery features.
          </p>
          <div className="flex flex-wrap gap-2">
            {demoPost.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div dangerouslySetInnerHTML={{ __html: demoPost.content }} />
        </div>
      </article>
    </BlogPostLayout>
  );
}