"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Tag, Hash, Lightbulb, FileText, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import '../styles/blog-post.css';

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

interface RelatedItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  views?: number;
}

interface BlogPostLayoutProps {
  post: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    chapters: string[];
    topics: string[];
    concepts: string[];
    category: string;
    subject?: string;
  };
  relatedPosts: RelatedItem[];
  relatedChapters: RelatedItem[];
  relatedTopics: RelatedItem[];
  relatedConcepts: RelatedItem[];
  children: React.ReactNode;
}

export default function BlogPostLayout({
  post,
  relatedPosts,
  relatedChapters,
  relatedTopics,
  relatedConcepts,
  children
}: BlogPostLayoutProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [isTocCollapsed, setIsTocCollapsed] = useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showStickyProgress, setShowStickyProgress] = useState(false);

  // Generate TOC from content
  useEffect(() => {
    const generateToc = () => {
      const headingRegex = /<h([2-4])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[2-4]>/gi;
      const flatItems: TocItem[] = [];
      let match;

      while ((match = headingRegex.exec(post.content)) !== null) {
        const level = parseInt(match[1]);
        const id = match[2];
        const text = match[3].replace(/<[^>]*>/g, '').trim();
        
        if (text && level >= 2 && level <= 4) {
          flatItems.push({ id, text, level });
        }
      }
      
      // Build hierarchical structure
      const hierarchicalItems: TocItem[] = [];
      let currentH2: TocItem | null = null;
      
      flatItems.forEach(item => {
        if (item.level === 2) {
          currentH2 = { ...item, children: [] };
          hierarchicalItems.push(currentH2);
        } else if (item.level > 2 && currentH2) {
          currentH2.children = currentH2.children || [];
          currentH2.children.push(item);
        }
      });
      
      setTocItems(hierarchicalItems);
    };

    generateToc();
  }, [post.content]);

  // Handle scroll to update active section and sticky progress with debouncing
  useEffect(() => {
    let ticking = false;
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const headings = tocItems.map(item => document.getElementById(item.id)).filter(Boolean);
          
          for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i];
            if (heading && heading.getBoundingClientRect().top <= 100) {
              setActiveSection(heading.id);
              break;
            }
          }

          // Show sticky progress after scrolling 200px
          setShowStickyProgress(window.scrollY > 200);
          ticking = false;
        });
        ticking = true;
      }
    };

    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 16); // ~60fps
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [tocItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 blog-post-layout">
      <div className="container mx-auto px-4 lg:px-8 pt-8 pb-24">
        {/* Mobile TOC - Collapsible at top */}
        <div className="lg:hidden mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Table of Contents
              </h3>
              {isMobileTocOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
            {isMobileTocOpen && (
              <nav className="mt-3 toc-container">
                <TableOfContentsContent 
                  tocItems={tocItems} 
                  activeSection={activeSection}
                  expandedTopic={expandedTopic}
                  setExpandedTopic={setExpandedTopic}
                />
              </nav>
            )}
          </div>
        </div>

        {/* Mobile Reading Progress - Below TOC */}
        <div className="lg:hidden mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              Reading Progress
            </h3>
            <ReadingProgress />
          </div>
        </div>

        {/* Sticky Progress Bar */}
        {showStickyProgress && (
          <div className="fixed top-0 left-0 right-0 z-50 lg:hidden">
            <StickyProgressBar />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Table of Contents (Desktop Only) */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Desktop TOC */}
              <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4"
                  onClick={() => setIsTocCollapsed(!isTocCollapsed)}
                >
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Table of Contents
                  </h3>
                  {isTocCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                {!isTocCollapsed && (
                  <nav className="toc-container">
                    <TableOfContentsContent 
                      tocItems={tocItems} 
                      activeSection={activeSection} 
                      expandedTopic={expandedTopic}
                      setExpandedTopic={setExpandedTopic}
                    />
                  </nav>
                )}
              </div>

              {/* Reading Progress */}
              <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Reading Progress
                </h3>
                <ReadingProgress />
              </div>

              {/* Subject & Category Info */}
              <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Post Info</h3>
                <div className="space-y-3">
                  {post.subject && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded-full">
                        {post.subject}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded-full">
                      {post.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-6 order-1 lg:order-2">
            {children}
          </main>

          {/* Right Sidebar - Related Content */}
          <aside className="lg:col-span-3 order-3">
            <div className="sticky top-8 space-y-6">
              
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                  <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-600" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/search?q=${encodeURIComponent(tag)}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Chapters */}
              {relatedChapters.length > 0 && (
                <RelatedSection
                  title="Related Chapters"
                  items={relatedChapters}
                  icon={<BookOpen className="w-5 h-5 text-blue-600" />}
                  baseUrl="/chapter-wise"
                />
              )}

              {/* Related Topics */}
              {relatedTopics.length > 0 && (
                <RelatedSection
                  title="Related Topics"
                  items={relatedTopics}
                  icon={<Lightbulb className="w-5 h-5 text-green-600" />}
                  baseUrl="/topic-wise"
                />
              )}

              {/* Related Concepts */}
              {relatedConcepts.length > 0 && (
                <RelatedSection
                  title="Related Concepts"
                  items={relatedConcepts}
                  icon={<Hash className="w-5 h-5 text-orange-600" />}
                  baseUrl="/concept-wise"
                />
              )}

              {/* Most Popular */}
              {relatedPosts.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                  <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    Popular Posts
                  </h3>
                  <div className="space-y-3">
                    {relatedPosts
                      .sort((a, b) => (b.views || 0) - (a.views || 0))
                      .slice(0, 3)
                      .map((item) => (
                      <Link 
                        key={item.id} 
                        href={`/${item.category}/${item.slug}`}
                        className="group block p-3 rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-red-200 bg-gradient-to-br from-gray-50 to-white related-item"
                      >
                        <h4 className="font-medium text-sm text-gray-900 mb-1 group-hover:text-red-600 transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="capitalize">{item.category.replace('-', ' ')}</span>
                          {item.views && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <TrendingUp className="w-3 h-3" />
                              {item.views}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <RelatedSection
                  title="Related Posts"
                  items={relatedPosts}
                  icon={<FileText className="w-5 h-5 text-purple-600" />}
                  baseUrl=""
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Table of Contents Content Component
function TableOfContentsContent({ 
  tocItems, 
  activeSection, 
  expandedTopic, 
  setExpandedTopic 
}: { 
  tocItems: TocItem[], 
  activeSection: string,
  expandedTopic: string | null,
  setExpandedTopic: (id: string | null) => void
}) {
  if (tocItems.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No headings found in this post.</p>
    );
  }

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  return (
    <ul className="space-y-2">
      {tocItems.map((item) => (
        <li key={item.id}>
          <div 
            className={`flex items-center justify-between cursor-pointer text-sm transition-all duration-200 hover:text-purple-600 py-1 font-semibold text-gray-900 border-l-3 border-purple-500 pl-3 bg-purple-50/50 rounded-r-lg ${
              activeSection === item.id ? 'text-purple-600 bg-purple-100/50' : ''
            }`}
            onClick={() => item.children && item.children.length > 0 ? toggleTopic(item.id) : null}
          >
            <a href={`#${item.id}`} className="flex items-center gap-2 flex-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              {item.text}
            </a>
            {item.children && item.children.length > 0 && (
              <span className="ml-2">
                {expandedTopic === item.id ? (
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                )}
              </span>
            )}
          </div>
          
          {item.children && item.children.length > 0 && expandedTopic === item.id && (
            <ul className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <li key={child.id}>
                  <a
                    href={`#${child.id}`}
                    className={`block text-sm transition-all duration-200 hover:text-purple-600 py-1 text-gray-700 border-l-2 border-blue-300 pl-3 hover:bg-blue-50/50 rounded-r-lg ${
                      activeSection === child.id ? 'text-purple-600 bg-purple-100/50' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      {child.text}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

// Related Section Component
function RelatedSection({ 
  title, 
  items, 
  icon, 
  baseUrl 
}: { 
  title: string; 
  items: RelatedItem[]; 
  icon: React.ReactNode; 
  baseUrl: string; 
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <Link 
            key={item.id} 
            href={`${baseUrl}/${item.slug}`}
            className="group block p-3 rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-purple-200 bg-gradient-to-br from-gray-50 to-white related-item"
          >
            <h4 className="font-medium text-sm text-gray-900 mb-1 group-hover:text-purple-600 transition-colors line-clamp-2">
              {item.title}
            </h4>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="capitalize">{item.category.replace('-', ' ')}</span>
              {item.views && (
                <span className="flex items-center gap-1">
                  <span>{item.views} views</span>
                </span>
              )}
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Sticky Progress Bar Component with optimized performance
function StickyProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    let timeoutId: NodeJS.Timeout;
    
    const updateProgress = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          setProgress(Math.min(100, Math.max(0, scrollPercent)));
          ticking = false;
        });
        ticking = true;
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateProgress, 16);
    };

    updateProgress();
    window.addEventListener('scroll', debouncedUpdate, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm shadow-sm">
      <div 
        className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 transition-all duration-300"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}

// Reading Progress Component with optimized performance
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  useEffect(() => {
    let ticking = false;
    let timeoutId: NodeJS.Timeout;
    
    const calculateReadingTime = () => {
      const text = document.querySelector('main')?.textContent || '';
      const wordsPerMinute = 200;
      const words = text.trim().split(/\s+/).length;
      setReadingTime(Math.ceil(words / wordsPerMinute));
    };

    const updateProgress = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          setProgress(Math.min(100, Math.max(0, scrollPercent)));
          ticking = false;
        });
        ticking = true;
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateProgress, 16);
    };

    calculateReadingTime();
    updateProgress();
    window.addEventListener('scroll', debouncedUpdate, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500">
        ~{readingTime} min read
      </div>
    </div>
  );
}