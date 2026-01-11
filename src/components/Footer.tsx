// src/components/Footer.tsx
import Link from 'next/link';
import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-blue-900 to-blue-950 text-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="h-8 w-8 text-blue-300" />
              <span className="text-xl font-bold text-white">Phyziks.space</span>
            </div>
            <p className="text-sm text-blue-200">
              Your complete educational resource platform for exam preparation, notes, and study materials.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-blue-300 transition-colors">Home</Link></li>
              <li><Link href="/last-year-papers" className="hover:text-blue-300 transition-colors">Last Year Papers</Link></li>
              <li><Link href="/syllabus" className="hover:text-blue-300 transition-colors">Syllabus</Link></li>
              <li><Link href="/blog" className="hover:text-blue-300 transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Information</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about-us" className="hover:text-blue-300 transition-colors">About Us</Link></li>
              <li><Link href="/contact-us" className="hover:text-blue-300 transition-colors">Contact Us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-blue-300 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/disclaimer" className="hover:text-blue-300 transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2">
                <Mail className="h-4 w-4 mt-0.5 text-blue-300" />
                <span>asifqh2@gmail.com</span>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="h-4 w-4 mt-0.5 text-blue-300" />
                <span>+91 8850484674</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 text-blue-300" />
                <span>Mumbai-400050. Maharashtra, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-8 text-center text-sm text-blue-300">
          <p>&copy; {currentYear} Phyziks.space. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}