'use client';

// src/app/contact-us/page.tsx
import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type FormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const INITIAL_FORM: FormData = { name: '', email: '', subject: '', message: '' };

export default function ContactUsPage() {
  const [formData, setFormData]     = useState<FormData>(INITIAL_FORM);
  const [status, setStatus]         = useState<SubmitStatus>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear any previous result banner when the user starts editing again
    if (status === 'success' || status === 'error') setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions while a request is already in-flight
    if (status === 'loading') return;

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(formData),
      });

      if (!res.ok) {
        // Do not surface internal errors — always show the friendly message
        console.error('[ContactForm] API responded with', res.status);
        setStatus('error');
        return;
      }

      setStatus('success');
      setFormData(INITIAL_FORM);   // Reset all fields on success
    } catch (err) {
      // Network failure or unexpected exception
      console.error('[ContactForm] fetch error:', err);
      setStatus('error');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Contact Us</h1>
          </div>
          <p className="text-lg text-indigo-200 max-w-2xl">
            Have a question about your subscription, content, or anything else? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <section className="py-14">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Contact info sidebar ─────────────────────────────────────── */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-5">Get in Touch</h2>
                <div className="space-y-5">

                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-50 p-2.5 rounded-xl">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Email</p>
                      <a href="mailto:phyziks.space@gmail.com" className="text-indigo-600 hover:underline text-sm">
                        phyziks.space@gmail.com
                      </a>
                      <p className="text-xs text-slate-400 mt-0.5">Replies within 1–2 business days</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-xl">
                      <Phone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Phone / WhatsApp</p>
                      <a href="tel:+919833076246" className="text-indigo-600 hover:underline text-sm">
                        +91 98330 76 246
                      </a>
                      <p className="text-xs text-slate-400 mt-0.5">Sat–Thu, 10 AM – 10 PM GST</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-violet-50 p-2.5 rounded-xl">
                      <MapPin className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Address</p>
                      <p className="text-slate-600 text-sm leading-relaxed">Mumbai, India</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-amber-50 p-2.5 rounded-xl">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Business Hours</p>
                      <p className="text-slate-600 text-sm">Saturday – Thursday</p>
                      <p className="text-slate-500 text-xs">9:00 AM – 6:00 PM (Gulf Standard Time)</p>
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                <p className="text-sm font-semibold text-slate-800 mb-1">Urgent queries?</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Add <span className="font-mono bg-white px-1 rounded text-indigo-700">URGENT</span> in
                  your subject line. We prioritise these and aim to respond within a few hours.
                </p>
              </div>
            </div>

            {/* ── Contact form ─────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Send us a Message</h2>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Your Name <span aria-hidden="true">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        autoComplete="name"
                        placeholder="Ahmed Al-Mansoori"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-900 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email Address <span aria-hidden="true">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        placeholder="ahmed@example.com"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-900 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Subject <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-900 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a subject</option>
                      <option value="billing">Billing &amp; Payments</option>
                      <option value="refund">Refund / Cancellation</option>
                      <option value="access">Course Access Issue</option>
                      <option value="support">Technical Support</option>
                      <option value="content">Content Request</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Message <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      rows={5}
                      placeholder="Describe your query in detail…"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-900 text-sm resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" aria-hidden="true" />
                        Send Message
                      </>
                    )}
                  </button>

                  {/* Success banner */}
                  {status === 'success' && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-emerald-700 text-sm leading-relaxed">
                        Thank you! Your message has been sent successfully. We&apos;ll get back to you soon.
                      </p>
                    </div>
                  )}

                  {/* Error banner */}
                  {status === 'error' && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-red-700 text-sm leading-relaxed">
                        Something went wrong while sending your message. Please try again later.
                      </p>
                    </div>
                  )}

                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
