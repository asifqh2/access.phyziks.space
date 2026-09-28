// src/app/privacy-policy/page.tsx
import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Phyziks',
  description: 'Privacy Policy for Phyziks — how we collect, use, and protect your personal data under UAE law.',
};

const LAST_UPDATED = '1 August 2025';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-indigo-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 leading-relaxed">

            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-xl">
              <p className="text-sm">
                This Privacy Policy is governed by the laws of the <strong>United Arab Emirates</strong>,
                including Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data
                (UAE PDPL). By using Phyziks, you consent to the practices described below.
              </p>
            </div>

            <Section title="1. Who We Are">
              <p>
                Phyziks (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is an online educational platform
                providing video-based courses for Class 11 &amp; 12 students, operated from
                Mumbai, India. Our website is accessible at phyziks.space.
              </p>
              <ContactBox />
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following categories of personal data:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li><strong>Identity Data:</strong> Full name, username provided during registration.</li>
                <li><strong>Contact Data:</strong> Email address, phone number (optional).</li>
                <li><strong>Payment Data:</strong> Transaction references processed via Stripe. We do not store card details — payment processing is handled entirely by Stripe.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device type, time zone, and operating system.</li>
                <li><strong>Usage Data:</strong> Pages visited, course progress, video watch history, and feature interactions.</li>
                <li><strong>Authentication Data:</strong> Account credentials managed securely by Clerk.</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Data">
              <ul className="list-disc ml-5 space-y-1.5">
                <li>To create and manage your account and course access entitlements.</li>
                <li>To process payments and issue receipts.</li>
                <li>To deliver and personalise educational content.</li>
                <li>To respond to your support requests and enquiries.</li>
                <li>To improve platform performance and user experience.</li>
                <li>To comply with applicable UAE laws and regulations.</li>
                <li>To send service-related notifications (not marketing, unless you opt in).</li>
              </ul>
            </Section>

            <Section title="4. Legal Basis for Processing">
              <p>Under UAE PDPL, we process your personal data on the following bases:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li><strong>Contract performance:</strong> To provide the services you purchased.</li>
                <li><strong>Legitimate interests:</strong> To improve our platform and ensure security.</li>
                <li><strong>Legal obligation:</strong> To comply with UAE laws.</li>
                <li><strong>Consent:</strong> For optional marketing communications.</li>
              </ul>
            </Section>

            <Section title="5. Cookies">
              <p>
                We use essential cookies for authentication and platform functionality, and
                analytics cookies to understand how visitors interact with our website.
                You may control non-essential cookies through your browser settings. Disabling
                essential cookies may affect your ability to use the platform.
              </p>
            </Section>

            <Section title="6. Data Sharing and Third Parties">
              <p>We share your data only with the following trusted third-party service providers:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li><strong>Clerk</strong> — authentication and user account management.</li>
                <li><strong>Stripe</strong> — payment processing (UAE / AED transactions).</li>
                <li><strong>Prisma / PostgreSQL</strong> — secure database hosting.</li>
                <li><strong>Vercel / Cloudflare</strong> — hosting and content delivery.</li>
              </ul>
              <p className="mt-3">
                We do not sell, rent, or trade your personal data to any third party for
                marketing purposes.
              </p>
            </Section>

            <Section title="7. Data Retention">
              <p>
                We retain your personal data only as long as necessary to provide our services
                or as required by UAE law. Account data is retained while your account is active
                and for up to 3 years after closure for legal and accounting purposes.
                Payment records are retained for 5 years in compliance with UAE commercial law.
              </p>
            </Section>

            <Section title="8. Data Security">
              <p>
                We implement industry-standard security measures including encrypted data
                transmission (TLS/HTTPS), access controls, and secure credential storage.
                However, no method of internet transmission is 100% secure. We will notify
                you promptly in the event of a data breach that affects your rights.
              </p>
            </Section>

            <Section title="9. Your Rights Under UAE PDPL">
              <p>You have the right to:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>Access your personal data held by us.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your data (subject to legal retention obligations).</li>
                <li>Withdraw consent for optional processing at any time.</li>
                <li>Lodge a complaint with the UAE Data Office.</li>
              </ul>
              <p className="mt-3">To exercise these rights, email us at <strong>phyziks.space@gmail.com</strong>.</p>
            </Section>

            <Section title="10. Children's Privacy">
              <p>
                Our platform is designed for students aged 15 and above. We do not knowingly
                collect personal data from children under 13 without verifiable parental consent.
                If you believe a child has registered without consent, please contact us
                immediately and we will delete the account.
              </p>
            </Section>

            <Section title="11. International Transfers">
              <p>
                Some of our service providers operate outside the UAE. Where data is transferred
                internationally, we ensure adequate protections are in place consistent with
                UAE PDPL requirements.
              </p>
            </Section>

            <Section title="12. Changes to This Policy">
              <p>
                We may update this policy from time to time. Material changes will be
                communicated via email or a prominent notice on our website. Continued use
                of the platform after changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section title="13. Contact Us">
              <p>For privacy-related queries or to exercise your rights:</p>
              <ContactBox />
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

function ContactBox() {
  return (
    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
      <p><strong>Phyziks</strong></p>
      <p>Dubai, United Arab Emirates</p>
      <p>Email: <a href="mailto:phyziks.space@gmail.com" className="text-indigo-600 hover:underline">phyziks.space@gmail.com</a></p>
    </div>
  );
}
