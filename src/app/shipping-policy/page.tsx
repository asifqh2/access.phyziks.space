// src/app/shipping-policy/page.tsx
import type { Metadata } from 'next';
import { Package } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping Policy | Phyziks',
  description: 'Shipping and delivery policy for Phyziks — a fully digital educational platform.',
};

const LAST_UPDATED = '1 August 2025';

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-indigo-700 to-violet-800 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Shipping Policy</h1>
          </div>
          <p className="text-indigo-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 leading-relaxed">

            {/* Key callout */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
              <p className="text-2xl font-extrabold text-indigo-700 mb-2">100% Digital — No Physical Shipping</p>
              <p className="text-slate-600 text-sm max-w-xl mx-auto">
                Phyziks is a fully online educational platform. All products are digital and
                delivered instantly via your account. There is nothing to ship.
              </p>
            </div>

            <Section title="1. What We Sell">
              <p>
                Phyziks sells access to online educational content only — specifically,
                video lessons, course materials, and study resources for Class 11 &amp; 12
                students. We do not sell or ship any physical products, printed materials,
                or tangible goods of any kind.
              </p>
            </Section>

            <Section title="2. How You Receive Your Purchase">
              <p>After a successful payment, access is granted as follows:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li><strong>Instantly</strong> — course access is activated in your account within seconds of payment confirmation.</li>
                <li>Log in to your account and visit <Link href="/dashboard" className="text-indigo-600 hover:underline">My Learning</Link> to access your purchased content.</li>
                <li>An email confirmation is sent to your registered email address.</li>
                <li>No download, installation, or shipping wait time is required.</li>
              </ul>
            </Section>

            <Section title="3. Access Requirements">
              <p>To access your purchased content you need:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>A registered Phyziks account (sign up free at phyziks.space).</li>
                <li>An internet-connected device (phone, tablet, or computer).</li>
                <li>A modern web browser (Chrome, Safari, Firefox, or Edge).</li>
              </ul>
            </Section>

            <Section title="4. Delivery Issues">
              <p>
                If you have completed payment but cannot see your content in{' '}
                <Link href="/dashboard" className="text-indigo-600 hover:underline">My Learning</Link>,
                please:
              </p>
              <ol className="list-decimal ml-5 space-y-1.5 mt-2">
                <li>Refresh the page and check again after 2–3 minutes.</li>
                <li>Ensure you are logged in with the same account used to make the purchase.</li>
                <li>
                  Contact us at{' '}
                  <a href="mailto:phyziks.space@gmail.com" className="text-indigo-600 hover:underline">
                    phyziks.space@gmail.com
                  </a>{' '}
                  with your payment confirmation and we will resolve the issue within 1 business day.
                </li>
              </ol>
            </Section>

            <Section title="5. No Shipping Charges">
              <p>
                Because all content is digital and delivered online, there are no shipping
                fees, delivery charges, or customs duties applicable to any Phyziks purchase.
                The price shown at checkout is the total amount you pay.
              </p>
            </Section>

            <Section title="6. VAT and Taxes">
              <p>
                Prices displayed on the Platform are in UAE Dirhams (AED). VAT (at the
                applicable UAE rate) is included where required by UAE Federal Tax Authority
                regulations. A tax receipt is available upon request.
              </p>
            </Section>

            <Section title="7. Contact Us">
              <p>
                For any questions about accessing your digital content, please visit our{' '}
                <Link href="/contact-us" className="text-indigo-600 hover:underline">
                  Contact Us
                </Link>{' '}
                page or email:
              </p>
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
