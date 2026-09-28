// src/app/cancellations-and-refunds/page.tsx
import type { Metadata } from 'next';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cancellations and Refunds | Phyziks',
  description: 'Cancellation and refund policy for Phyziks digital course purchases in the UAE.',
};

const LAST_UPDATED = '1 August 2025';

export default function CancellationsAndRefundsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Cancellations &amp; Refunds</h1>
          </div>
          <p className="text-emerald-100">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 leading-relaxed">

            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl">
              <p className="text-sm">
                This policy applies to all purchases made on the Phyziks platform and is
                governed by the laws of the <strong>United Arab Emirates</strong>, including
                Federal Law No. 15 of 2020 on Consumer Protection. All amounts are in
                UAE Dirhams (AED).
              </p>
            </div>

            <Section title="1. Nature of Our Products">
              <p>
                Phyziks sells access to <strong>digital educational content</strong> —
                specifically, online video lessons and course materials. Because access to
                this content is granted immediately upon payment, special conditions apply
                to refunds as set out below.
              </p>
            </Section>

            <Section title="2. Refund Eligibility">
              <p>You are entitled to a full refund if:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>
                  You request a refund within <strong>2 days</strong> of purchase
                  <strong> and</strong> you have not accessed more than{' '}
                  <strong>10% of the purchased content</strong>.
                </li>
                <li>
                  The content you purchased is materially different from what was described
                  on the Platform.
                </li>
                <li>
                  A technical fault on our side prevented you from accessing the content
                  you paid for and we were unable to resolve it within 5 business days.
                </li>
              </ul>
            </Section>

            <Section title="3. Non-Refundable Situations">
              <p>Refunds will <strong>not</strong> be issued if:</p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>More than 2 days have passed since the date of purchase.</li>
                <li>You have accessed more than 10% of the purchased chapter or subject content.</li>
                <li>The refund request is based solely on a change of mind after content has been accessed.</li>
                <li>The issue is caused by your own device, internet connection, or software incompatibility.</li>
                <li>The purchase was made using a promotional or discounted upgrade price.</li>
              </ul>
            </Section>

            <Section title="4. How to Request a Refund">
              <p>To request a refund, email us at{' '}
                <a href="mailto:phyziks.space@gmail.com" className="text-indigo-600 hover:underline">
                  phyziks.space@gmail.com
                </a>{' '}
                with the subject line <strong>&quot;Refund Request&quot;</strong> and include:
              </p>
              <ul className="list-disc ml-5 space-y-1.5 mt-2">
                <li>Your registered email address.</li>
                <li>The order / transaction reference number.</li>
                <li>The reason for the refund request.</li>
              </ul>
              <p className="mt-2">
                We will acknowledge your request within 2 business days and process eligible
                refunds within <strong>7–10 business days</strong>. Refunds are credited
                back to the original payment method via Stripe.
              </p>
            </Section>

            <Section title="5. Cancellations">
              <p>
                Since access is granted immediately upon payment, there is no &quot;pending&quot;
                order to cancel. If you wish to cancel access and request a refund before
                using the content, please contact us within 24 hours of purchase and we
                will review your case under the refund policy above.
              </p>
              <p className="mt-2">
                We do not offer recurring subscriptions at this time — all plans are one-time
                purchases. There is therefore no ongoing subscription to cancel.
              </p>
            </Section>

            <Section title="6. Partial Refunds">
              <p>
                In cases where partial content has been accessed and a valid refund reason
                exists (e.g. technical fault), we may at our discretion offer a partial
                refund proportional to the content not accessed.
              </p>
            </Section>

            <Section title="7. Disputed Transactions">
              <p>
                If you believe an unauthorised transaction has been made on your account,
                contact us immediately at phyziks.space@gmail.com. We will investigate and
                cooperate with Stripe's dispute resolution process. Filing a chargeback
                without contacting us first may result in account suspension pending
                resolution.
              </p>
            </Section>

            <Section title="8. Consumer Rights">
              <p>
                Nothing in this policy limits your statutory rights under UAE Federal Law
                No. 15 of 2020 on Consumer Protection or any other applicable UAE legislation.
              </p>
            </Section>

            <Section title="9. Contact Us">
              <p>
                For all refund and cancellation queries, please contact us via our{' '}
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
