'use client';

// src/components/Header.tsx
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const [studyDropdownOpen, setStudyDropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStudyDropdownOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { label: 'Home', href: '/' },
    { label: 'Last Year Papers', href: '/last-year-papers' },
    { label: 'Blog', href: '/blog' },
    { label: 'Syllabus', href: '/syllabus' },
    { label: 'IITian Mentor', href: '/iitian-mentor' },
  ];

  const toolsItems = [
    { label: 'Study Groups', href: '/study-groups' },
    { label: 'Mind Maps', href: '/mind-maps' },
    { label: 'Analytics', href: '/analytics' },
  ];

  const studyItems = [
    { label: 'Chapter Wise', href: '/chapter-wise' },
    { label: 'Topic Wise', href: '/topic-wise' },
    { label: 'Concept Wise', href: '/concept-wise' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="Phyziks.space" width={360} height={90} priority />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {/* Tools Dropdown */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Tools <ChevronDown className="h-4 w-4" />
              </button>
              {toolsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {toolsItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setToolsDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {/* Studio Button */}
            <a
              href="https://studio.phyziks.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Studio
            </a>
            {/* Study Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setStudyDropdownOpen(!studyDropdownOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Study <ChevronDown className="h-4 w-4" />
              </button>
              {studyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {studyItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setStudyDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Side - Search, Test Button, Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </form>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="https://studio.phyziks.space/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md mx-0"
              >
                Studio
              </a>
              <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Study</div>
              {studyItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</div>
              {toolsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mt-4 px-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}