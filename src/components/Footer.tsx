// src/components/Footer.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, BookOpen, Tag, Brain } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-slate-700 to-slate-800 text-slate-300">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-5">
              <Image src="/logo.svg" alt="Phyziks" width={240} height={60} />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              Online Physics, Chemistry &amp; Mathematics courses for Class 11 &amp; 12 CBSE
              students — topic-by-topic video lessons from Dubai, UAE.
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Twitter', href: 'https://twitter.com/phyziks_space', icon: '𝕏' },
                { label: 'YouTube', href: '#', icon: '▶' },
                { label: 'Instagram', href: '#', icon: '◈' },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-slate-600 hover:bg-indigo-600 flex items-center justify-center text-sm transition-colors duration-200">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Courses */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Courses
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/courses"         className="hover:text-indigo-400 transition-colors">All Courses</Link></li>
              <li><Link href="/dashboard"        className="hover:text-indigo-400 transition-colors">My Learning</Link></li>
              <li><Link href="/pricing"          className="hover:text-amber-400 transition-colors font-medium text-amber-500/80">Pricing Plans</Link></li>
              <li><Link href="/mind-maps"        className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-slate-500" />Mind Maps</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about-us"   className="hover:text-indigo-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact-us" className="hover:text-indigo-400 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Legal + Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2.5 text-sm mb-5">
              <li><Link href="/privacy-policy"           className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions"     className="hover:text-indigo-400 transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/cancellations-and-refunds" className="hover:text-indigo-400 transition-colors">Cancellations &amp; Refunds</Link></li>
              <li><Link href="/shipping-policy"          className="hover:text-indigo-400 transition-colors">Shipping Policy</Link></li>
              <li><Link href="/disclaimer"               className="hover:text-indigo-400 transition-colors">Disclaimer</Link></li>
            </ul>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                <a href="mailto:phyziks.space@gmail.com" className="hover:text-indigo-400 transition-colors">phyziks.space@gmail.com</a>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                <a href="tel:+919833076246" className="hover:text-indigo-400 transition-colors">+91 98330 76 246</a>
              </div>
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-indigo-400 flex-shrink-0" />
                <span>Mumbai, India</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-600 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>&copy; {currentYear} Phyziks. All rights reserved.</p>
          <p className="text-indigo-400/70">Mumbai, India</p>
        </div>
      </div>
    </footer>
  );
}
