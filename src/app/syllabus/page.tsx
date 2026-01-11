'use client';

// src/app/syllabus/page.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, FileText, Menu, X, BookOpen, Search, Calendar, Tag as TagIcon } from 'lucide-react';

interface SyllabusItem {
  id: string;
  title: string;
  slug: string;
  level: 'subject' | 'chapter' | 'topic' | 'concept';
  children?: SyllabusItem[];
  postId?: string;
  description?: string;
  year?: number;
  tags?: string[];
  subject?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  description: string;
  syllabusPath?: string;
  subject?: string;
  chapters?: string[];
  topics?: string[];
  concepts?: string[];
  year?: number;
  tags?: string[];
}

export default function SyllabusPage() {
  const [syllabusStructure, setSyllabusStructure] = useState<SyllabusItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSyllabusData();
  }, []);

  const fetchSyllabusData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/posts?isSyllabus=true');
      const posts: Post[] = await response.json();
      
      const structure = organizeSyllabusHierarchy(posts);
      setSyllabusStructure(structure);
      
      // Auto-expand first subject
      if (structure.length > 0) {
        setExpandedItems(new Set([structure[0].id]));
      }
    } catch (error) {
      console.error('Error fetching syllabus data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const organizeSyllabusHierarchy = (posts: Post[]): SyllabusItem[] => {
    // Group by Subject > Chapter > Topic > Concept
    const subjectMap = new Map<string, Map<string, Map<string, Set<string>>>>(); // Use Set for post IDs
    const postMap = new Map<string, Post>(); // Store posts separately
    
    posts.forEach(post => {
      postMap.set(post.id, post);
      const subject = post.subject || 'Uncategorized';
      const chapters = post.chapters || [];
      const topics = post.topics || [];
      const concepts = post.concepts || [];
      
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, new Map());
      }
      const chapterMap = subjectMap.get(subject)!;
      
      // If no chapters, topics, or concepts, add directly to subject
      if (chapters.length === 0 && topics.length === 0 && concepts.length === 0) {
        if (!chapterMap.has('_direct')) {
          chapterMap.set('_direct', new Map());
        }
        const topicMap = chapterMap.get('_direct')!;
        if (!topicMap.has('_direct')) {
          topicMap.set('_direct', new Set());
        }
        topicMap.get('_direct')!.add(post.id);
        return;
      }
      
      // Process each chapter
      (chapters.length > 0 ? chapters : ['_none']).forEach(chapter => {
        if (!chapterMap.has(chapter)) {
          chapterMap.set(chapter, new Map());
        }
        const topicMap = chapterMap.get(chapter)!;
        
        // Process each topic
        (topics.length > 0 ? topics : ['_none']).forEach(topic => {
          if (!topicMap.has(topic)) {
            topicMap.set(topic, new Set());
          }
          const conceptSet = topicMap.get(topic)!;
          
          // Add post ID only once per topic (regardless of multiple concepts)
          conceptSet.add(post.id);
        });
      });
    });
    
    // Convert to hierarchical structure
    const structure: SyllabusItem[] = [];
    let subjectIndex = 0;
    
    subjectMap.forEach((chapterMap, subject) => {
      const subjectId = `subject-${subjectIndex++}`;
      const subjectItem: SyllabusItem = {
        id: subjectId,
        title: subject,
        slug: subject.toLowerCase().replace(/\s+/g, '-'),
        level: 'subject',
        children: []
      };
      
      let chapterIndex = 0;
      chapterMap.forEach((topicMap, chapter) => {
        if (chapter === '_direct') {
          // Add posts directly to subject
          topicMap.forEach((postIds, _) => {
            postIds.forEach(postId => {
              const post = postMap.get(postId)!;
              subjectItem.children!.push({
                id: `${subjectId}-post-${post.id}`,
                title: post.title,
                slug: post.slug,
                level: 'concept',
                postId: post.id,
                description: post.description,
                year: post.year,
                tags: post.tags,
                subject: post.subject
              });
            });
          });
          return;
        }
        
        const chapterId = `${subjectId}-chapter-${chapterIndex++}`;
        const chapterItem: SyllabusItem = {
          id: chapterId,
          title: chapter === '_none' ? 'General' : chapter,
          slug: chapter.toLowerCase().replace(/\s+/g, '-'),
          level: 'chapter',
          children: []
        };
        
        let topicIndex = 0;
        topicMap.forEach((postIds, topic) => {
          const topicId = `${chapterId}-topic-${topicIndex++}`;
          const topicItem: SyllabusItem = {
            id: topicId,
            title: topic === '_none' ? 'General' : topic,
            slug: topic.toLowerCase().replace(/\s+/g, '-'),
            level: 'topic',
            children: []
          };
          
          let conceptIndex = 0;
          postIds.forEach(postId => {
            const post = postMap.get(postId)!;
            const conceptId = `${topicId}-concept-${conceptIndex++}`;
            topicItem.children!.push({
              id: conceptId,
              title: post.title,
              slug: post.slug,
              level: 'concept',
              postId: post.id,
              description: post.description,
              year: post.year,
              tags: post.tags,
              subject: post.subject
            });
          });
          
          if (topicItem.children!.length > 0) {
            chapterItem.children!.push(topicItem);
          }
        });
        
        if (chapterItem.children!.length > 0) {
          subjectItem.children!.push(chapterItem);
        }
      });
      
      structure.push(subjectItem);
    });
    
    return structure;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'subject': return 'text-purple-700 bg-purple-50';
      case 'chapter': return 'text-blue-700 bg-blue-50';
      case 'topic': return 'text-green-700 bg-green-50';
      case 'concept': return 'text-orange-700 bg-orange-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'subject': return '📚';
      case 'chapter': return '📖';
      case 'topic': return '📝';
      case 'concept': return '💡';
      default: return '📄';
    }
  };

  const renderSyllabusItem = (item: SyllabusItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItem === item.id;

    return (
      <div key={item.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2.5 px-3 rounded-md cursor-pointer transition-all ${
            isSelected 
              ? 'bg-pink-100 text-pink-900 font-medium shadow-sm' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            }
            setSelectedItem(item.id);
            // ✅ Close sidebar automatically on mobile
                if (window.innerWidth < 1024) {
                 setIsSidebarOpen(false);
                }
          }}
        >
          {hasChildren && (
            <span className="flex-shrink-0 cursor-pointer">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          
          <span className="text-base">{getLevelIcon(item.level)}</span>
          
          {!hasChildren && item.postId && (
            <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
          )}
          
          <span className={`flex-1 text-sm ${item.level === 'subject' ? 'font-bold text-base' : ''} ${item.level === 'chapter' ? 'font-semibold' : ''}`}>
            {item.title}
          </span>
          
          {/* Year Badge */}
          {item.year && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
              <Calendar className="w-3 h-3" />
              {item.year}
            </span>
          )}
          
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              <TagIcon className="w-3 h-3" />
              {item.tags.length}
            </span>
          )}
          
          {item.postId && (
            <Link 
              href={`/syllabus/${item.postId}`}
              className="text-pink-600 hover:text-pink-700 p-1 hover:bg-pink-50 rounded"
              onClick={(e) => e.stopPropagation()}
              title="View details"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children!.map((child) => renderSyllabusItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getSelectedItemDetails = () => {
    const findItem = (items: SyllabusItem[], id: string): SyllabusItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return selectedItem ? findItem(syllabusStructure, selectedItem) : null;
  };

  const filterSyllabusItems = (items: SyllabusItem[], query: string): SyllabusItem[] => {
    if (!query) return items;
    
    const lowerQuery = query.toLowerCase();
    return items.map(item => {
      const matchesTitle = item.title.toLowerCase().includes(lowerQuery);
      const matchesDescription = item.description?.toLowerCase().includes(lowerQuery);
      const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      const matchesYear = item.year?.toString().includes(query);
      
      if (item.children) {
        const filteredChildren = filterSyllabusItems(item.children, query);
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
      }
      
      return (matchesTitle || matchesDescription || matchesTags || matchesYear) ? item : null;
    }).filter((item): item is SyllabusItem => item !== null);
  };

  const selectedDetails = getSelectedItemDetails();
  const filteredStructure = filterSyllabusItems(syllabusStructure, searchQuery);

  // Auto-expand filtered results
  useEffect(() => {
    if (searchQuery) {
      const newExpanded = new Set<string>();
      const expandAll = (items: SyllabusItem[]) => {
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            newExpanded.add(item.id);
            expandAll(item.children);
          }
        });
      };
      expandAll(filteredStructure);
      setExpandedItems(newExpanded);
    }
  }, [searchQuery, filteredStructure]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-purple-600 via-pink-600 to-pink-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-10 h-10" />
                <h1 className="text-4xl font-bold">Syllabus Hierarchy</h1>
              </div>
              <p className="text-xl text-pink-100">
                Organized by Subject → Chapter → Topic → Concept
              </p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </section>

      {/* Legend */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">Hierarchy Levels:</span>
            <div className="flex items-center gap-2">
              <span>📚</span>
              <span className="text-purple-700">Subject</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📖</span>
              <span className="text-blue-700">Chapter</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span className="text-green-700">Topic</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span className="text-orange-700">Concept</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside
            className={`${
              isSidebarOpen ? 'fixed' : 'hidden'
            } lg:relative lg:block inset-0 z-40 lg:z-0 lg:w-96 flex-shrink-0`}
          >
            <div
              className={`${
                isSidebarOpen ? 'ml-0' : '-ml-96'
              } lg:ml-0 transition-all duration-300 h-full lg:h-auto`}
            >
              <div className="bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-4 h-screen lg:h-auto overflow-y-auto">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search syllabus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 text-sm"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3 px-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Syllabus Structure
                  </h3>
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading...
                    </div>
                  ) : filteredStructure.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No results found' : 'No syllabus content yet'}
                    </div>
                  ) : (
                    <nav className="space-y-1">
                      {filteredStructure.map((item) => renderSyllabusItem(item))}
                    </nav>
                  )}
                </div>
              </div>
            </div>
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 lg:hidden -z-10"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-md p-8">
              {selectedDetails ? (
                <div>
                  {/* Level Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getLevelColor(selectedDetails.level)}`}>
                      {getLevelIcon(selectedDetails.level)} {selectedDetails.level.toUpperCase()}
                    </span>
                    {selectedDetails.year && (
                      <span className="flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-red-100 text-red-700 rounded-full">
                        <Calendar className="w-4 h-4" />
                        Year: {selectedDetails.year}
                      </span>
                    )}
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {selectedDetails.title}
                  </h2>
                  
                  {selectedDetails.description && (
                    <p className="text-lg text-gray-600 mb-6">
                      {selectedDetails.description}
                    </p>
                  )}

                  {/* Tags */}
                  {selectedDetails.tags && selectedDetails.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                      <TagIcon className="w-4 h-4 text-gray-400" />
                      {selectedDetails.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedDetails.children && selectedDetails.children.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {selectedDetails.level === 'subject' ? 'Chapters' : 
                         selectedDetails.level === 'chapter' ? 'Topics' : 
                         selectedDetails.level === 'topic' ? 'Concepts' : 'Contents'}:
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedDetails.children.map((child) => (
                          <div
                            key={child.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedItem(child.id);
                              if (child.children) {
                                toggleExpand(child.id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{getLevelIcon(child.level)}</span>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                  {child.title}
                                  {child.year && (
                                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                                      {child.year}
                                    </span>
                                  )}
                                </h4>
                                {child.description && (
                                  <p className="text-sm text-gray-600 mb-2">{child.description}</p>
                                )}
                                {child.tags && child.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {child.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {child.postId && (
                                  <Link
                                    href={`/syllabus/${child.postId}`}
                                    className="text-sm text-pink-600 hover:underline inline-block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View detailed notes →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDetails.postId && (
                    <div className="mt-6">
                      <Link
                        href={`/syllabus/${selectedDetails.postId}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                      >
                        <BookOpen className="w-5 h-5" />
                        View Complete Notes
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to Syllabus Hierarchy
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Select any item from the sidebar to explore the content
                  </p>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-8">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">📚</div>
                      <div className="text-2xl font-bold text-purple-700">
                        {syllabusStructure.length}
                      </div>
                      <div className="text-sm text-purple-600">Subjects</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">📖</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {syllabusStructure.reduce((acc, s) => acc + (s.children?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-blue-600">Chapters</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">📝</div>
                      <div className="text-2xl font-bold text-green-700">
                        {syllabusStructure.reduce((acc, s) => 
                          acc + (s.children?.reduce((a, c) => a + (c.children?.length || 0), 0) || 0), 0
                        )}
                      </div>
                      <div className="text-sm text-green-600">Topics</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">💡</div>
                      <div className="text-2xl font-bold text-orange-700">
                        {syllabusStructure.reduce((acc, s) => 
                          acc + (s.children?.reduce((a, c) => 
                            a + (c.children?.reduce((b, t) => b + (t.children?.length || 0), 0) || 0), 0
                          ) || 0), 0
                        )}
                      </div>
                      <div className="text-sm text-orange-600">Concepts</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Hierarchical Organization</h3>
              <p className="text-purple-800 text-sm mb-3">
                All syllabus content is organized in a 4-level hierarchy for easy navigation:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-purple-700">
                  <span>📚</span> <strong>Subject</strong> → The main subject area (e.g., Physics, Chemistry)
                </div>
                <div className="flex items-center gap-2 text-blue-700">
                  <span>📖</span> <strong>Chapter</strong> → Major divisions within a subject
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <span>📝</span> <strong>Topic</strong> → Specific topics within chapters
                </div>
                <div className="flex items-center gap-2 text-orange-700">
                  <span>💡</span> <strong>Concept</strong> → Individual concepts and lessons
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}