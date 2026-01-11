'use client';

// src/app/create-post/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import MathRenderer from '@/components/MathRenderer';
import LivePreview from '@/components/LivePreview';
import { Save, Eye, Plus, X } from 'lucide-react';
//const [uploading, setUploading] = useState(false);// shifted to line 16

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function CreatePostPage() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    description: '',
    content: '',
    category: 'syllabus' as any,
    subject: '',
    chapters: [] as string[],
    topics: [] as string[],
    concepts: [] as string[],
    tags: [] as string[],
    year: '',
    youtubeUrl: '',
    pdfUrl: '',
    wordUrl: '',
    isSyllabus: true,
    syllabusPath: '',
    autoCategorize: {
      isLastYearPaper: false,
      isChapter: false,
      isTopic: false,
      isConcept: false,
    }
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentChapter, setCurrentChapter] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentConcept, setCurrentConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null); // Add this line
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLivePreview, setIsLivePreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('autoCategorize.')) {
        const key = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          autoCategorize: {
            ...prev.autoCategorize,
            [key]: checked
          }
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      // Auto-adjust isSyllabus based on category
      if (name === 'category') {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          isSyllabus: value !== 'blog'
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  const addItem = (type: 'tags' | 'chapters' | 'topics' | 'concepts', value: string) => {
    if (value.trim() && !formData[type].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
    }
  };

  const removeItem = (type: 'tags' | 'chapters' | 'topics' | 'concepts', value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const postData = {
        ...formData,
        slug,
        images: [],
        views: 0
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ type: 'success', message: 'Post created successfully! Redirecting...' });
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to create post' });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setNotification({ type: 'error', message: 'Failed to save post. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleClearForm = () => {
    if (confirm('Are you sure you want to clear the form? All unsaved data will be lost.')) {
      setFormData({
        title: '',
        topic: '',
        description: '',
        content: '',
        category: 'syllabus' as any,
        subject: '',
        chapters: [] as string[],
        topics: [] as string[],
        concepts: [] as string[],
        tags: [] as string[],
        year: '',
        youtubeUrl: '',
        pdfUrl: '',
        wordUrl: '',
        isSyllabus: true,
        syllabusPath: '',
        autoCategorize: {
          isLastYearPaper: false,
          isChapter: false,
          isTopic: false,
          isConcept: false,
        }
      });
      setNotification(null);
    }
  };

// Add this function after handleClearForm
const handleFileUpload = async (file: File, folder: 'pdfs' | 'word' | 'images') => {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      return data.url;
    } else {
      alert('Upload failed: ' + data.error);
      return null;
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed');
    return null;
  } finally {
    setUploading(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <span className="text-2xl">✅</span>
              ) : (
                <span className="text-2xl">❌</span>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsLivePreview(!isLivePreview)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLivePreview 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                {isLivePreview ? 'Live Preview ON' : 'Live Preview OFF'}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Full Preview
              </button>
              <button
                type="submit"
                form="post-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>

          <form id="post-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter post title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Brief description of the post"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="syllabus">Syllabus</option>
                      <option value="chapter">Chapter</option>
                      <option value="topic">Topic</option>
                      <option value="concept">Concept</option>
                      <option value="last-year-paper">Last Year Paper</option>
                      <option value="blog">Blog</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g., Physics, Chemistry"
                    />
                  </div>
                </div>

                {formData.isSyllabus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Syllabus Path
                    </label>
                    <input
                      type="text"
                      name="syllabusPath"
                      value={formData.syllabusPath}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g., Physics > Class 12 > Electricity"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use &gt; to separate hierarchy levels
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Content *</h2>
              <div className={`grid gap-6 ${isLivePreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                  />
                </div>
                {isLivePreview && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">Live Preview:</h3>
                    <div className="max-h-96 overflow-y-auto">
                      <LivePreview content={formData.content} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Categorization */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Categorization</h2>
              
              {/* Chapters */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chapters
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentChapter}
                    onChange={(e) => setCurrentChapter(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('chapters', currentChapter);
                        setCurrentChapter('');
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add chapter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addItem('chapters', currentChapter);
                      setCurrentChapter('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.chapters.map((chapter) => (
                    <span
                      key={chapter}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {chapter}
                      <button
                        type="button"
                        onClick={() => removeItem('chapters', chapter)}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topics
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTopic}
                    onChange={(e) => setCurrentTopic(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('topics', currentTopic);
                        setCurrentTopic('');
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add topic"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addItem('topics', currentTopic);
                      setCurrentTopic('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeItem('topics', topic)}
                        className="hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Concepts */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concepts
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentConcept}
                    onChange={(e) => setCurrentConcept(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('concepts', currentConcept);
                        setCurrentConcept('');
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add concept"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addItem('concepts', currentConcept);
                      setCurrentConcept('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.concepts.map((concept) => (
                    <span
                      key={concept}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                    >
                      {concept}
                      <button
                        type="button"
                        onClick={() => removeItem('concepts', concept)}
                        className="hover:text-orange-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('tags', currentTag);
                        setCurrentTag('');
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addItem('tags', currentTag);
                      setCurrentTag('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeItem('tags', tag)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Media & Resources */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Media & Resources</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Video URL
                  </label>
                  <input
                    type="url"
                    name="youtubeUrl"
                    value={formData.youtubeUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF URL
                  </label>
                  <input
                    type="url"
                    name="pdfUrl"
                    value={formData.pdfUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="URL to PDF file"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Word Document URL
                  </label>
                  <input
                    type="url"
                    name="wordUrl"
                    value={formData.wordUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="URL to Word document"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blogger Image URLs
                  </label>
                  <textarea
                    placeholder="Paste Blogger image URLs (one per line)&#10;Example:&#10;https://blogger.googleusercontent.com/img/b/R29vZ2xl/...&#10;https://1.bp.blogspot.com/...&#10;&#10;These will be automatically formatted with responsive styling."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                    rows={4}
                    onChange={(e) => {
                      const urls = e.target.value.split('\n').filter(url => url.trim());
                      const imageHtml = urls.map(url => 
                        `<img src="${url.trim()}" alt="Educational content" loading="lazy" class="w-full max-w-2xl mx-auto rounded-lg shadow-md my-4" />`
                      ).join('\n\n');
                      
                      if (imageHtml) {
                        const currentContent = formData.content;
                        const newContent = currentContent + '\n\n' + imageHtml;
                        setFormData(prev => ({ ...prev, content: newContent }));
                        e.target.value = ''; // Clear the textarea
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste image URLs from your Blogger site. They will be automatically added to your content with responsive styling.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year (for Last Year Papers)
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="2024"
                    min="2000"
                    max="2099"
                  />
                </div>
              </div>
            </div>

            {/* Auto-Categorization */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Auto-Categorization</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select where this post should automatically appear:
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isSyllabus"
                    checked={formData.isSyllabus}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show in Syllabus section</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoCategorize.isChapter"
                    checked={formData.autoCategorize.isChapter}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show in Chapter Wise</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoCategorize.isTopic"
                    checked={formData.autoCategorize.isTopic}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show in Topic Wise</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoCategorize.isConcept"
                    checked={formData.autoCategorize.isConcept}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show in Concept Wise</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoCategorize.isLastYearPaper"
                    checked={formData.autoCategorize.isLastYearPaper}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show in Last Year Papers</span>
                </label>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Preview</h2>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Preview Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                    {formData.category}
                  </span>
                  {formData.subject && (
                    <span className="inline-block px-3 py-1 text-sm font-semibold text-green-600 bg-green-100 rounded-full">
                      {formData.subject}
                    </span>
                  )}
                  {formData.year && (
                    <span className="inline-block px-3 py-1 text-sm font-semibold text-orange-600 bg-orange-100 rounded-full">
                      {formData.year}
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {formData.title || 'Untitled Post'}
                </h1>
                
                <p className="text-lg text-gray-600 mb-4">
                  {formData.description || 'No description provided'}
                </p>

                {formData.syllabusPath && (
                  <p className="text-sm text-gray-500">
                    Path: {formData.syllabusPath}
                  </p>
                )}
              </div>

              {/* Tags */}
              {formData.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube Video */}
              {formData.youtubeUrl && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Video:</h3>
                  <div className="aspect-video bg-gray-200 rounded flex items-center justify-center">
                    <p className="text-gray-500">YouTube: {formData.youtubeUrl}</p>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Content:</h3>
                <div className="border rounded-lg p-4">
                  <MathRenderer content={formData.content || '<p class="text-gray-400">No content yet</p>'} />
                </div>
              </div>

              {/* Categorization */}
              {(formData.chapters.length > 0 || formData.topics.length > 0 || formData.concepts.length > 0) && (
                <div className="mb-6 space-y-3">
                  {formData.chapters.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Chapters:</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.chapters.map((chapter) => (
                          <span key={chapter} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            {chapter}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.topics.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Topics:</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.topics.map((topic) => (
                          <span key={topic} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.concepts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Concepts:</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.concepts.map((concept) => (
                          <span key={concept} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-Categorization Info */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                <h4 className="font-semibold text-green-900 mb-2">This post will appear in:</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  {formData.isSyllabus && <li>✓ Syllabus</li>}
                  {formData.autoCategorize.isChapter && <li>✓ Chapter Wise</li>}
                  {formData.autoCategorize.isTopic && <li>✓ Topic Wise</li>}
                  {formData.autoCategorize.isConcept && <li>✓ Concept Wise</li>}
                  {formData.autoCategorize.isLastYearPaper && <li>✓ Last Year Papers</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}