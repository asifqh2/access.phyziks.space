import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Syllabus Hierarchy | Phyziks.space - Organized Subject Structure',
  description: 'Complete syllabus organized by Subject → Chapter → Topic → Concept hierarchy. Navigate through physics, chemistry, and math syllabus with structured learning path.',
  keywords: 'syllabus, course syllabus, physics syllabus, chemistry syllabus, math syllabus, subject hierarchy, chapter structure, topic organization, concept mapping, curriculum',
  openGraph: {
    title: 'Complete Syllabus Hierarchy | Phyziks.space',
    description: 'Complete syllabus organized by Subject → Chapter → Topic → Concept hierarchy',
    type: 'website',
    url: 'https://phyziks.space/syllabus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Complete Syllabus Hierarchy | Phyziks.space',
    description: 'Complete syllabus organized by Subject → Chapter → Topic → Concept hierarchy',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://phyziks.space/syllabus',
  },
};

export default function SyllabusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}