// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', sizes: 'any' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Routes that must render without any chrome (header, footer, floating UI).
  // These are opened as popup windows by the payment flow.
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? '';
  const isPopup = pathname.startsWith('/scope-picker');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta name="google-adsense-account" content="ca-pub-3152475218574521" />
      </head>
      <body className={inter.className}>
        <ClerkProvider>
          {isPopup ? (
            // Popup windows get a bare body — no header, footer, or floating UI
            <div className="min-h-screen bg-slate-50">
              {children}
            </div>
          ) : (
            <div className="flex flex-col min-h-screen bg-white">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <Footer />
              <QuizPopup />
            </div>
          )}
        </ClerkProvider>

        {/* Google Analytics — loaded after hydration to avoid SSR mismatch */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6PQXNGE661"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-6PQXNGE661');
          `}
        </Script>

        {/* Google AdSense — loaded after hydration */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3152475218574521"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}