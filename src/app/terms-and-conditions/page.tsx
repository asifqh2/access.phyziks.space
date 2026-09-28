// src/app/terms-and-conditions/page.tsx
import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Phyziks',
  description: 'Terms and Conditions governing your use of the Phyziks educational platform.',
};

const LAST_UPDATED = '1 August 2025';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Terms and Conditions</h1>
          </div>
          <p className="text-indigo-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 leading-relaxed">

            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-xl">
              <p className="text-sm">
                These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the
                Phyziks platform. By creating an account or purchasing any plan, you agree to
                be bound by these Terms. These Terms are governed by the laws of the
                <strong> United Arab Emirates</strong>.
              </p>
            </div>

            <Section title="1. About Phyziks">
              <p>
                Phyziks is an online learning management system (LMS) offering structured
                video courses in Physics, Chemistry, and Mathematics for Class 11 &amp; 12
                students following the CBSE curriculum. The platform is operated from
                Dubai, United Arab Emirates.
              </p>
            </Section>

            <Section title="2. Eligibility">
              <p>
                You must be at least 13 years of age to use this Platform. If you are under
                18, you represent that a parent or legal guardian has reviewed and agreed
                to these Terms on your behalf. By using the Platform, you confirm that all
                information you provide is accurate and complete.
              </p>
            </Section>

            <Section title="3. User Accounts">
              <ul className="list-disc ml-5 space-y-1.5">
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must not share your account with any third party.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>Notify us immediately at phyziks.space@gmail.com if you suspect unauthorised access.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
              </ul>
            </Section>

            <Section title="4. Subscriptions and Payments">
              <ul className="list-disc ml-5 space-y-1.5">
                <li>All prices are quoted in UAE Dirhams (AED) and are inclusive of any applicable VAT.</li>
                <li>Payments are processed securely via Stripe. We do not store payment card details.</li>
                <li>Access to paid content is granted upon successful payment confirmation.</li>
                <li>All purchases are subject to our Cancellations and Refunds Policy.</li>
                <li>We reserve the right to change prices with 14 days' notice published on the Platform.</li>
              </ul>
            </Section>

            <Section title="5. Intellectual Property">
              <p>
                All content on the Platform — including videos, notes, graphics, and software —
                is the intellectual property of Phyziks or its licensors, protected under
                UAE Federal Law No. 38 of 2021 on Intellectual Property Rights. You are
                granted a limited, non-exclusive, non-transferable licence to access and
                view purchased content for personal, non-commercial educational use only.
              </p>
              <p className="mt-2">
                You must not: reproduce, distribute, publicly display, sell, sublicense,
                or create derivative works from any Platform content without our prior
                written consent.
              </p>
            </Section>

            <Section title="6. Acceptable Use">
              <p>You agree not to:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>Use the Platform for any unlawful purpose or in violation of UAE law.</li>
                <li>Attempt to gain unauthorised access to any part of the Platform.</li>
                <li>Upload or transmit any harmful, offensive, or misleading content.</li>
                <li>Use automated tools to scrape or download content.</li>
                <li>Impersonate any person or entity.</li>
                <li>Reverse-engineer or attempt to extract source code from the Platform.</li>
              </ul>
            </Section>

            <Section title="7. Content Accuracy">
              <p>
                While we endeavour to ensure all educational content is accurate and current,
                we do not warrant that it is error-free or up to date with the latest
                examination syllabi. Users should verify critical academic information from
                official sources.
              </p>
            </Section>

            <Section title="8. Availability and Modifications">
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the
                Platform at any time. We will provide reasonable notice of significant
                changes. We shall not be liable to you or any third party for any
                modification, suspension, or discontinuation of services.
              </p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>
                To the maximum extent permitted by UAE law, Phyziks shall not be liable
                for any indirect, incidental, special, or consequential damages, including
                loss of profits, data, or goodwill arising from your use of the Platform.
                Our total liability for any claim shall not exceed the amount you paid to
                us in the 3 months preceding the claim.
              </p>
            </Section>

            <Section title="10. Privacy">
              <p>
                Your use of the Platform is also governed by our{' '}
                <a href="/privacy-policy" className="text-indigo-600 hover:underline">Privacy Policy</a>,
                which is incorporated into these Terms by reference.
              </p>
            </Section>

            <Section title="11. Governing Law and Disputes">
              <p>
                These Terms are governed by the laws of the United Arab Emirates.
                Any disputes arising out of or in connection with these Terms shall
                first be attempted to be resolved amicably. If unresolved, disputes
                shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.
              </p>
            </Section>

            <Section title="12. Changes to These Terms">
              <p>
                We may update these Terms from time to time. Continued use of the Platform
                after notification of changes constitutes your acceptance of the updated Terms.
                We will always display the &quot;Last updated&quot; date at the top of this page.
              </p>
            </Section>

            <Section title="13. Contact Us">
              <p>For questions about these Terms:</p>
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                <p><strong>Phyziks</strong> — Dubai, United Arab Emirates</p>
                <p>Email: <a href="mailto:phyziks.space@gmail.com" className="text-indigo-600 hover:underline">phyziks.space@gmail.com</a></p>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
