// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingStudyTools from '@/components/FloatingStudyTools';
import QuizPopup from '@/components/QuizPopup';
import "katex/dist/katex.min.css";


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Phyziks.space - For Last Benchers, Future Toppers',
  description: 'Complete educational resource platform with exam papers, chapter-wise notes, topic-wise content, and study materials for students.',
  keywords: 'education, study materials, exam papers, notes, syllabus, chapter wise, topic wise',
  authors: [{ name: 'Asif Qureshi', url: 'https://phyziks.space/about-us' }],
  creator: 'Asif Qureshi',
  publisher: 'Phyziks.space',
  icons: {
    icon: ['/favicon.ico', '/icon.svg'],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Phyziks.space - For Last Benchers, Future Topperss',
    description: 'Your complete educational resource platform',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-3152475218574521" />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3152475218574521"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen bg-transparent">
          <Header />
          <main className="flex-grow bg-transparent">
            {children}
          </main>
          <Footer />
          <FloatingStudyTools />
          <QuizPopup />
        </div>
      </body>
    </html>
  );
}