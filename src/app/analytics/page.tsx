// src/app/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Eye, FileText, BookOpen, Calendar, BarChart3, PieChart as PieChartIcon, Activity, Filter, GitCompare } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, Treemap, FunnelChart, Funnel, LabelList
} from 'recharts';
import { Post } from '@/types';






const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedConcept, setSelectedConcept] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [yearlyView, setYearlyView] = useState('category'); // category, topic, subject, concept, chapter
  const [matrixView, setMatrixView] = useState('topic'); // topic, concept, chapter, subject
  const [matrixLimit, setMatrixLimit] = useState(6);
  const [matrixYearRange, setMatrixYearRange] = useState('all');
  const [radarYear, setRadarYear] = useState('all');
  const [radarCategory, setRadarCategory] = useState('all');
  const [radarSubject, setRadarSubject] = useState('all');
  const [scatterType, setScatterType] = useState('subjects');
  const [scatterCategory, setScatterCategory] = useState('all');
  const [funnelMetric, setFunnelMetric] = useState('views');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Filter posts based on selections
  const filteredPosts = posts.filter(post => {
    const categoryMatch = selectedCategory === 'all' || post.category === selectedCategory;
    const subjectMatch = selectedSubject === 'all' || post.subject === selectedSubject;
    const topicMatch = selectedTopic === 'all' || (post.topics && post.topics.includes(selectedTopic));
    const conceptMatch = selectedConcept === 'all' || (post.concepts && post.concepts.includes(selectedConcept));
    const chapterMatch = selectedChapter === 'all' || (post.chapters && post.chapters.includes(selectedChapter));
    
    let dateMatch = true;
    if (dateRange !== 'all') {
      if (dateRange.startsWith('year-')) {
        const selectedYear = parseInt(dateRange.replace('year-', ''));
        const postYear = post.year || new Date(post.createdAt).getFullYear();
        dateMatch = postYear === selectedYear;
      } else {
        const postDate = new Date(post.createdAt);
        const now = new Date();
        const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        dateMatch = postDate >= cutoffDate;
      }
    }
    
    return categoryMatch && subjectMatch && topicMatch && conceptMatch && chapterMatch && dateMatch;
  });

  // Calculate statistics
  const totalPosts = filteredPosts.length;
  const totalViews = filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0);
  const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
  
  // Get unique values for filters
  const categories = Array.from(new Set(posts.map(p => p.category)));
  const subjects = Array.from(new Set(posts.map(p => p.subject).filter((s): s is string => Boolean(s))));
  const topics = Array.from(new Set(posts.flatMap(p => p.topics || []).filter(Boolean)));
  const concepts = Array.from(new Set(posts.flatMap(p => p.concepts || []).filter(Boolean)));
  const chapters = Array.from(new Set(posts.flatMap(p => p.chapters || []).filter(Boolean)));
  // Get years specifically from last-year-papers
  const lastYearPaperPosts = posts.filter(p => p.category === 'last-year-paper');
  const availableYears = Array.from(new Set(lastYearPaperPosts.map(p => p.year || new Date(p.createdAt).getFullYear()))).sort((a, b) => b - a);
  
  // Fallback to all posts if no last-year-papers found
  const allYears = availableYears.length > 0 ? availableYears : 
    Array.from(new Set(posts.map(p => p.year || new Date(p.createdAt).getFullYear()))).sort((a, b) => b - a);

  // Dynamic data based on selected metric
  const getMetricValue = (post: Post) => {
    switch (selectedMetric) {
      case 'views': return post.views || 0;
      case 'posts': return 1;
      case 'tags': return post.tags?.length || 0;
      case 'chapters': return post.chapters?.length || 0;
      default: return post.views || 0;
    }
  };

  // Category data for pie chart
  const categoryData = Object.entries(
    filteredPosts.reduce((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + getMetricValue(post);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace('-', ' '), value }));

  // Monthly data for line chart
  const monthlyData = filteredPosts.reduce((acc, post) => {
    const date = new Date(post.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!acc[month]) {
      acc[month] = { 
        month: monthLabel, 
        sortKey: month,
        posts: 0, 
        views: 0, 
        tags: 0, 
        chapters: 0 
      };
    }
    acc[month].posts += 1;
    acc[month].views += post.views || 0;
    acc[month].tags += post.tags?.length || 0;
    acc[month].chapters += post.chapters?.length || 0;
    return acc;
  }, {} as Record<string, any>);

  const lineChartData = Object.values(monthlyData)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey, ...data }) => data);

  // Comparison data for bar chart
  const comparisonData = categories.map(category => {
    const categoryPosts = filteredPosts.filter(p => p.category === category);
    return {
      category: category.replace('-', ' '),
      posts: categoryPosts.length,
      views: categoryPosts.reduce((sum, p) => sum + (p.views || 0), 0),
      tags: categoryPosts.reduce((sum, p) => sum + (p.tags?.length || 0), 0),
      chapters: categoryPosts.reduce((sum, p) => sum + (p.chapters?.length || 0), 0),
      avgViews: categoryPosts.length > 0 ? Math.round(categoryPosts.reduce((sum, p) => sum + (p.views || 0), 0) / categoryPosts.length) : 0
    };
  });

  const topPosts = [...filteredPosts].sort((a, b) => getMetricValue(b) - getMetricValue(a)).slice(0, 5);

  // Dynamic Yearly Data based on selected view
  const getYearlyData = () => {
    const yearlyData: Record<string, { items: Set<string>, posts: number, totalViews: number }> = {};
    
    filteredPosts.forEach(post => {
      const year = new Date(post.createdAt).getFullYear().toString();
      if (!yearlyData[year]) yearlyData[year] = { items: new Set(), posts: 0, totalViews: 0 };
      
      // Add items based on selected view
      switch (yearlyView) {
        case 'category':
          yearlyData[year].items.add(post.category);
          break;
        case 'topic':
          post.topics?.forEach(topic => yearlyData[year].items.add(topic));
          break;
        case 'subject':
          if (post.subject) yearlyData[year].items.add(post.subject);
          break;
        case 'concept':
          post.concepts?.forEach(concept => yearlyData[year].items.add(concept));
          break;
        case 'chapter':
          post.chapters?.forEach(chapter => yearlyData[year].items.add(chapter));
          break;
      }
      
      yearlyData[year].posts += 1;
      yearlyData[year].totalViews += post.views || 0;
    });
    
    return Object.entries(yearlyData)
      .map(([year, data]) => ({
        year,
        count: data.items.size,
        posts: data.posts,
        avgViews: data.posts > 0 ? Math.round(data.totalViews / data.posts) : 0
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  // Topic Frequency by Year Data
  const getTopicYearData = () => {
    const topicYearMatrix: Record<string, Record<string, number>> = {};
    
    filteredPosts.forEach(post => {
      const year = (post.year || new Date(post.createdAt).getFullYear()).toString();
      post.topics?.forEach(topic => {
        if (!topicYearMatrix[topic]) topicYearMatrix[topic] = {};
        topicYearMatrix[topic][year] = (topicYearMatrix[topic][year] || 0) + 1;
      });
    });
    
    return Object.entries(topicYearMatrix)
      .slice(0, 10)
      .map(([topic, years]) => {
        const result: any = { topic };
        availableYears.forEach(year => {
          result[`year_${year}`] = years[year.toString()] || 0;
        });
        return result;
      });
  };

  // Question Pattern Analysis Data
  const getQuestionPatternData = () => {
    const subjectData: Record<string, { posts: Post[], topics: Set<string> }> = {};
    
    filteredPosts.forEach(post => {
      const subject = post.subject || 'Unknown';
      if (!subjectData[subject]) subjectData[subject] = { posts: [], topics: new Set() };
      subjectData[subject].posts.push(post);
      post.topics?.forEach(topic => subjectData[subject].topics.add(topic));
    });
    
    return Object.entries(subjectData).map(([subject, data]) => {
      const topicCounts = Array.from(data.topics).map(topic => 
        data.posts.filter(p => p.topics?.includes(topic)).length
      );
      const repeatRate = topicCounts.length > 0 ? 
        (topicCounts.filter(count => count > 1).length / topicCounts.length) * 100 : 0;
      
      return {
        subject,
        totalQuestions: data.posts.length,
        uniqueTopics: data.topics.size,
        repeatRate: Math.round(repeatRate)
      };
    }).slice(0, 8);
  };

  // Get Matrix Items based on selected view
  const getMatrixItems = () => {
    switch (matrixView) {
      case 'concept': return concepts;
      case 'chapter': return chapters;
      case 'subject': return subjects;
      default: return topics;
    }
  };

  // Get filtered years for matrix
  const getMatrixYears = () => {
    const sortedYears = [...allYears].sort((a, b) => b - a);
    switch (matrixYearRange) {
      case 'recent5': return sortedYears.slice(0, 5);
      case 'recent3': return sortedYears.slice(0, 3);
      case 'recent2': return sortedYears.slice(0, 2);
      default: return sortedYears;
    }
  };

  // Topic Intersection Data
  const getTopicIntersectionData = () => {
    const matrixYears = getMatrixYears();
    const matrixItems = getMatrixItems().slice(0, matrixLimit);
    
    // Ensure we have data for all years, even if zero
    const yearItemData = matrixYears.map(year => {
      const yearData: any = { year: year.toString() };
      
      matrixItems.forEach(item => {
        let count = 0;
        if (matrixView === 'subject') {
          count = filteredPosts.filter(post => 
            (post.year || new Date(post.createdAt).getFullYear()) === year &&
            post.subject === item
          ).length;
        } else {
          count = filteredPosts.filter(post => {
            const postYear = post.year || new Date(post.createdAt).getFullYear();
            const itemArray = matrixView === 'concept' ? post.concepts : 
                            matrixView === 'chapter' ? post.chapters : post.topics;
            return postYear === year && item && itemArray?.includes(item);
          }).length;
        }
        if (item) {
          yearData[item.replace(/\s+/g, '_')] = count;
        }
      });
      
      return yearData;
    });
    
    return yearItemData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  // Enhanced Radar Chart Data with more categories
  const getRadarData = () => {
    const radarPosts = posts.filter(post => {
      const yearMatch = radarYear === 'all' || (post.year || new Date(post.createdAt).getFullYear()).toString() === radarYear;
      const categoryMatch = radarCategory === 'all' || post.category === radarCategory;
      const subjectMatch = radarSubject === 'all' || post.subject === radarSubject;
      return yearMatch && categoryMatch && subjectMatch;
    });

    const totalPosts = radarPosts.length;
    const totalViews = radarPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const avgViews = totalPosts > 0 ? totalViews / totalPosts : 0;
    const totalTags = radarPosts.reduce((sum, p) => sum + (p.tags?.length || 0), 0);
    const uniqueTopics = Array.from(new Set(radarPosts.flatMap(p => p.topics || []))).length;
    const uniqueConcepts = Array.from(new Set(radarPosts.flatMap(p => p.concepts || []))).length;
    const uniqueChapters = Array.from(new Set(radarPosts.flatMap(p => p.chapters || []))).length;
    const uniqueSubjects = Array.from(new Set(radarPosts.map(p => p.subject).filter(Boolean))).length;
    const uniqueCategories = Array.from(new Set(radarPosts.map(p => p.category))).length;
    
    return [
      { name: 'Volume', content: Math.min(100, (totalPosts / Math.max(1, posts.length)) * 100), engagement: 0, quality: 0 },
      { name: 'Engagement', content: 0, engagement: Math.min(100, avgViews / 10), quality: 0 },
      { name: 'Diversity', content: Math.min(100, (uniqueTopics / Math.max(1, topics.length)) * 100), engagement: 0, quality: 0 },
      { name: 'Subjects', content: Math.min(100, (uniqueSubjects / Math.max(1, subjects.length)) * 100), engagement: 0, quality: 0 },
      { name: 'Depth', content: 0, engagement: 0, quality: Math.min(100, (uniqueConcepts / Math.max(1, concepts.length)) * 100) },
      { name: 'Coverage', content: 0, engagement: 0, quality: Math.min(100, (uniqueChapters / Math.max(1, chapters.length)) * 100) },
      { name: 'Balance', content: Math.min(100, (uniqueCategories / Math.max(1, categories.length)) * 100), engagement: 0, quality: 0 },
      { name: 'Tags', content: 0, engagement: 0, quality: Math.min(100, (totalTags / Math.max(1, totalPosts)) * 20) },
      { name: 'Views', content: 0, engagement: Math.min(100, (totalViews / Math.max(1000, posts.reduce((sum, p) => sum + (p.views || 0), 0))) * 100), quality: 0 },
      { name: 'Quality', content: 0, engagement: 0, quality: Math.min(100, ((uniqueTopics + uniqueConcepts + uniqueChapters) / Math.max(1, totalPosts)) * 50) }
    ];
  };

  // Content Distribution Data
  const getScatterData = () => {
    const scatterPosts = posts.filter(post => {
      const categoryMatch = scatterCategory === 'all' || post.category === scatterCategory;
      return categoryMatch;
    });

    let items: string[] = [];
    switch (scatterType) {
      case 'subjects': items = subjects; break;
      case 'topics': items = topics; break;
      case 'concepts': items = concepts; break;
      case 'chapters': items = chapters; break;
    }

    const result: Array<{name: string, year: number, posts: number, views: number}> = [];
    items.forEach(item => {
      allYears.forEach(year => {
        let itemPosts: Post[] = [];
        if (scatterType === 'subjects') {
          itemPosts = scatterPosts.filter(p => 
            p.subject === item && (p.year || new Date(p.createdAt).getFullYear()) === year
          );
        } else {
          const field = scatterType === 'topics' ? 'topics' : scatterType === 'concepts' ? 'concepts' : 'chapters';
          itemPosts = scatterPosts.filter(p => 
            p[field]?.includes(item) && (p.year || new Date(p.createdAt).getFullYear()) === year
          );
        }
        
        if (itemPosts.length > 0) {
          result.push({
            name: item.length > 12 ? item.substring(0, 12) + '...' : item,
            year,
            posts: itemPosts.length,
            views: itemPosts.reduce((sum, p) => sum + (p.views || 0), 0)
          });
        }
      });
    });

    return result;
  };

  // Treemap Data
  const getTreemapData = () => {
    return categories.map(category => {
      const categoryPosts = filteredPosts.filter(p => p.category === category);
      return {
        name: category.replace('-', ' '),
        size: categoryPosts.length,
        fill: COLORS[categories.indexOf(category) % COLORS.length]
      };
    }).filter(item => item.size > 0);
  };

  // Funnel Data
  const getFunnelData = () => {
    const sortedCategories = categories
      .map(category => {
        const categoryPosts = filteredPosts.filter(p => p.category === category);
        let value = 0;
        
        switch (funnelMetric) {
          case 'views':
            value = categoryPosts.reduce((sum, p) => sum + (p.views || 0), 0);
            break;
          case 'posts':
            value = categoryPosts.length;
            break;
          case 'tags':
            value = categoryPosts.reduce((sum, p) => sum + (p.tags?.length || 0), 0);
            break;
        }
        
        return {
          name: category.replace('-', ' '),
          value,
          fill: COLORS[categories.indexOf(category) % COLORS.length]
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return sortedCategories;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          </div>
          <p className="text-xl text-indigo-100">
            Comprehensive insights into your educational content performance
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            Analytics Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="views">Views</option>
                <option value="posts">Posts Count</option>
                <option value="tags">Tags Count</option>
                <option value="chapters">Chapters Count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="365d">Last Year ({new Date().getFullYear() - 1})</option>
                {allYears.map(year => (
                  <option key={year} value={`year-${year}`}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Topics</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Concept</label>
              <select
                value={selectedConcept}
                onChange={(e) => setSelectedConcept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Concepts</option>
                {concepts.map(concept => (
                  <option key={concept} value={concept}>{concept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="all">All Chapters</option>
                {chapters.map(chapter => (
                  <option key={chapter} value={chapter}>{chapter}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yearly View</label>
              <select
                value={yearlyView}
                onChange={(e) => setYearlyView(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="category">By Category</option>
                <option value="topic">By Topic</option>
                <option value="subject">By Subject</option>
                <option value="concept">By Concept</option>
                <option value="chapter">By Chapter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${
                  comparisonMode 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <GitCompare className="w-4 h-4 inline mr-2" />
                {comparisonMode ? 'Compare ON' : 'Compare OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{totalPosts}</div>
                <div className="text-blue-100 text-sm">Total Posts</div>
                <div className="text-blue-200 text-xs mt-1">
                  {((totalPosts / posts.length) * 100).toFixed(1)}% of all
                </div>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{totalViews.toLocaleString()}</div>
                <div className="text-green-100 text-sm">Total Views</div>
                <div className="text-green-200 text-xs mt-1">
                  Growth: {lineChartData.length > 1 ? ((lineChartData[lineChartData.length - 1]?.views - lineChartData[0]?.views) / lineChartData[0]?.views * 100).toFixed(1) : 0}%
                </div>
              </div>
              <Eye className="w-8 h-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{avgViews}</div>
                <div className="text-orange-100 text-sm">Avg Views</div>
                <div className="text-orange-200 text-xs mt-1">
                  Best: {Math.max(...filteredPosts.map(p => p.views || 0))}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{categories.length}</div>
                <div className="text-purple-100 text-sm">Categories</div>
                <div className="text-purple-200 text-xs mt-1">
                  Most: {categoryData.length > 0 ? categoryData.reduce((a, b) => a.value > b.value ? a : b).name : 'N/A'}
                </div>
              </div>
              <BookOpen className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{subjects.length}</div>
                <div className="text-pink-100 text-sm">Subjects</div>
                <div className="text-pink-200 text-xs mt-1">
                  Active: {subjects.filter(s => filteredPosts.some(p => p.subject === s)).length}
                </div>
              </div>
              <Calendar className="w-8 h-8 text-pink-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{availableYears.length}</div>
                <div className="text-indigo-100 text-sm">Years</div>
                <div className="text-indigo-200 text-xs mt-1">
                  Range: {Math.min(...availableYears)}-{Math.max(...availableYears)}
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Pie Chart - Posts by Category */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              Distribution
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => entry.name && entry.percent ? `${entry.name} ${(entry.percent * 100).toFixed(0)}%` : ''}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Chart */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              {comparisonMode ? 'Multi-Metric' : selectedMetric}
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              {comparisonMode ? (
                <ComposedChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="posts" fill="#3B82F6" name="Posts" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="tags" fill="#10B981" name="Tags" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgViews" stroke="#F59E0B" strokeWidth={3} name="Avg Views" />
                </ComposedChart>
              ) : (
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey={selectedMetric} 
                    fill="#3B82F6" 
                    name={selectedMetric}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Area Chart - Cumulative Growth */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Growth
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="posts" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="views" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advanced Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Topic Frequency Heatmap */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Topic Frequency by Year
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getTopicYearData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                {availableYears.slice(0, 5).map((year, index) => (
                  <Bar key={year} dataKey={`year_${year}`} fill={COLORS[index % COLORS.length]} name={year.toString()} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Question Pattern Analysis */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Question Patterns
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={getQuestionPatternData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="totalQuestions" fill="#8B5CF6" name="Total Questions" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="uniqueTopics" fill="#06B6D4" name="Unique Topics" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="repeatRate" stroke="#F59E0B" strokeWidth={3} name="Repeat Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart - Performance Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Performance Radar
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={radarYear}
                onChange={(e) => setRadarYear(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              >
                <option value="all">All Years</option>
                {allYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={radarCategory}
                onChange={(e) => setRadarCategory(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                ))}
              </select>
              <select
                value={radarSubject}
                onChange={(e) => setRadarSubject(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              >
                <option value="all">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={400} minWidth={300}>
              <RadarChart data={getRadarData()}>
                <PolarGrid stroke="#f0f0f0" />
                <PolarAngleAxis tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 8 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Radar 
                  name="Content" 
                  dataKey="content" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar 
                  name="Engagement" 
                  dataKey="engagement" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar 
                  name="Quality" 
                  dataKey="quality" 
                  stroke="#F59E0B" 
                  fill="#F59E0B" 
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Intersection Matrix */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              {matrixView === 'topic' && 'Topic-Year Matrix'}
              {matrixView === 'concept' && 'Concept-Year Matrix'}
              {matrixView === 'chapter' && 'Chapter-Year Matrix'}
              {matrixView === 'subject' && 'Subject-Year Matrix'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={matrixView}
                onChange={(e) => setMatrixView(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="topic">Topics</option>
                <option value="concept">Concepts</option>
                <option value="chapter">Chapters</option>
                <option value="subject">Subjects</option>
              </select>
              <select
                value={matrixLimit}
                onChange={(e) => setMatrixLimit(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value={4}>Top 4</option>
                <option value={6}>Top 6</option>
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
              </select>
              <select
                value={matrixYearRange}
                onChange={(e) => setMatrixYearRange(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="all">All Years</option>
                <option value="recent5">Last 5 Years</option>
                <option value="recent3">Last 3 Years</option>
                <option value="recent2">Last 2 Years</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={400} minWidth={500}>
              <AreaChart data={getTopicIntersectionData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {getMatrixItems().slice(0, matrixLimit).map((item, index) => (
                  <Area 
                    key={item} 
                    type="monotone" 
                    dataKey={item.replace(/\s+/g, '_')} 
                    stackId="1" 
                    stroke={COLORS[index % COLORS.length]} 
                    fill={COLORS[index % COLORS.length]} 
                    fillOpacity={0.7}
                    name={item.length > 15 ? item.substring(0, 15) + '...' : item}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Combined Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Line Chart - Trend Over Time */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              {comparisonMode ? 'Multi-Metric Trend' : `${selectedMetric} Trend`}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                {comparisonMode ? (
                  <>
                    <Line type="monotone" dataKey="posts" stroke="#3B82F6" strokeWidth={2} name="Posts" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="views" stroke="#10B981" strokeWidth={2} name="Views" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="tags" stroke="#F59E0B" strokeWidth={2} name="Tags" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="chapters" stroke="#EF4444" strokeWidth={2} name="Chapters" dot={{ r: 4 }} />
                  </>
                ) : (
                  <Line type="monotone" dataKey={selectedMetric} stroke="#3B82F6" strokeWidth={2} name={selectedMetric} dot={{ r: 4 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Dynamic Yearly Comparison Chart */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              {yearlyView === 'category' && 'Categories by Year'}
              {yearlyView === 'topic' && 'Topics by Year'}
              {yearlyView === 'subject' && 'Subjects by Year'}
              {yearlyView === 'concept' && 'Concepts by Year'}
              {yearlyView === 'chapter' && 'Chapters by Year'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={getYearlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3B82F6" name={`${yearlyView} Count`} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="posts" fill="#10B981" name="Posts" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="avgViews" stroke="#F59E0B" strokeWidth={3} name="Avg Views" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Distribution by Year */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Content Distribution by Year
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={scatterType}
                onChange={(e) => setScatterType(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
              >
                <option value="subjects">By Subjects</option>
                <option value="topics">By Topics</option>
                <option value="concepts">By Concepts</option>
                <option value="chapters">By Chapters</option>
              </select>
              <select
                value={scatterCategory}
                onChange={(e) => setScatterCategory(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minWidth={400}>
              <ScatterChart data={getScatterData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  name={scatterType.charAt(0).toUpperCase() + scatterType.slice(1, -1)} 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  dataKey="year" 
                  name="Year" 
                  tick={{ fontSize: 10 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [
                    name === 'posts' ? `${value} posts` : name === 'views' ? `${value} views` : value,
                    name === 'posts' ? 'Posts' : name === 'views' ? 'Views' : name
                  ]}
                />
                <Scatter fill="#F97316" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treemap - Content Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Content Distribution Treemap
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={getTreemapData()}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#fff"
              fill="#14B8A6"
            />
          </ResponsiveContainer>
        </div>

        {/* Funnel Chart - Engagement Funnel */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pink-600" />
              Engagement Funnel
            </h2>
            <select
              value={funnelMetric}
              onChange={(e) => setFunnelMetric(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white"
            >
              <option value="views">By Views</option>
              <option value="posts">By Posts</option>
              <option value="tags">By Tags</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Funnel
                dataKey="value"
                data={getFunnelData()}
                isAnimationActive
              >
                <LabelList position="center" fill="#fff" stroke="none" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Enhanced Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Posts */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Top Posts
            </h2>
            <div className="space-y-3">
              {topPosts.slice(0, 5).map((post, index) => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm truncate max-w-32">{post.title}</div>
                      <div className="text-xs text-gray-500">
                        {post.category.replace('-', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600 font-semibold text-sm">
                    <Eye className="w-3 h-3" />
                    {getMetricValue(post)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Insights
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Best Category</div>
                <div className="text-xs text-green-600">
                  {categoryData.length > 0 ? categoryData.reduce((a, b) => a.value > b.value ? a : b).name : 'N/A'} ({categoryData.length > 0 ? categoryData.reduce((a, b) => a.value > b.value ? a : b).value : 0} {selectedMetric})
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Most Active Month</div>
                <div className="text-xs text-blue-600">
                  {lineChartData.length > 0 ? lineChartData.reduce((a, b) => a.posts > b.posts ? a : b).month : 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-800">Engagement Rate</div>
                <div className="text-xs text-purple-600">
                  {totalPosts > 0 ? (totalViews / totalPosts).toFixed(1) : 0} views per post
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm font-medium text-orange-800">Content Diversity</div>
                <div className="text-xs text-orange-600">
                  {topics.length} topics, {concepts.length} concepts
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button 
                onClick={() => setDateRange('30d')}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
              >
                <div className="text-sm font-medium text-blue-800">Last 30 Days</div>
                <div className="text-xs text-blue-600">View recent performance</div>
              </button>
              <button 
                onClick={() => setComparisonMode(!comparisonMode)}
                className="w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
              >
                <div className="text-sm font-medium text-green-800">Toggle Comparison</div>
                <div className="text-xs text-green-600">Multi-metric analysis</div>
              </button>
              <button 
                onClick={() => { setSelectedCategory('all'); setSelectedSubject('all'); setDateRange('all'); }}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
              >
                <div className="text-sm font-medium text-gray-800">Reset Filters</div>
                <div className="text-xs text-gray-600">Clear all selections</div>
              </button>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">Export Data</div>
                <div className="text-xs text-yellow-600">Download analytics report</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
