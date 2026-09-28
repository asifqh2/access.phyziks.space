// src/app/disclaimer/page.tsx
import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer | Phyziks',
  description: 'Disclaimer for Phyziks — important limitations regarding the use of our educational platform.',
};

const LAST_UPDATED = '1 August 2025';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-amber-600 to-orange-700 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Disclaimer</h1>
          </div>
          <p className="text-amber-100">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 leading-relaxed">

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
              <p className="text-sm">
                By accessing or using Phyziks (&quot;the Platform&quot;), you acknowledge that you have
                read, understood, and agree to the limitations described in this Disclaimer.
                This Platform is operated in compliance with the laws of the
                <strong> United Arab Emirates</strong>.
              </p>
            </div>

            <Section title="1. General Information Only">
              <p>
                The content on Phyziks — including video lessons, notes, solved examples,
                and practice questions — is provided for general educational purposes only.
                While we strive for accuracy, we make no representations or warranties
                regarding the completeness, accuracy, or suitability of any content for
                any particular purpose.
              </p>
            </Section>

            <Section title="2. Not a Substitute for Formal Education">
              <p>
                Our materials are intended as supplementary study resources and do not
                replace official school textbooks, classroom instruction, or guidance from
                qualified teachers. Students preparing for CBSE, UAE Ministry of Education,
                or other board examinations should refer to official syllabi and authorised
                materials.
              </p>
            </Section>

            <Section title="3. No Guarantee of Academic Results">
              <p>
                Phyziks does not guarantee any specific academic outcomes or examination
                results. Performance depends on individual effort, aptitude, and many
                other factors beyond the scope of our platform.
              </p>
            </Section>

            <Section title="4. Accuracy of Content">
              <p>
                Educational syllabi and examination patterns change periodically. We make
                every effort to keep content up to date, but there may be delays. Users
                are advised to verify critical information — including syllabus coverage and
                marking schemes — from official sources such as the CBSE or UAE Ministry
                of Education websites.
              </p>
            </Section>

            <Section title="5. Third-Party Content">
              <p>
                The Platform may embed third-party content (such as YouTube videos) and
                contain links to external websites. We have no control over the accuracy
                or availability of such content and are not responsible for any loss or
                damage arising from your use of third-party resources.
              </p>
            </Section>

            <Section title="6. Intellectual Property">
              <p>
                All original content on Phyziks is protected by UAE Federal Law No. 38
                of 2021 on Intellectual Property Rights. Unauthorised reproduction,
                distribution, or commercial use of any content is strictly prohibited.
                If you believe any content infringes your rights, please contact us at
                phyziks.space@gmail.com.
              </p>
            </Section>

            <Section title="7. Limitation of Liability">
              <p>
                To the maximum extent permitted by UAE law, Phyziks and its operators
                shall not be liable for any direct, indirect, incidental, or consequential
                damages arising from your use of — or inability to use — the Platform,
                including loss of data or interruption of service.
              </p>
            </Section>

            <Section title="8. Technical Availability">
              <p>
                We strive to maintain continuous platform availability but do not guarantee
                uninterrupted access. Scheduled maintenance, technical faults, or
                circumstances beyond our control may cause temporary service interruptions.
              </p>
            </Section>

            <Section title="9. Governing Law">
              <p>
                This Disclaimer is governed by and construed in accordance with the laws
                of the United Arab Emirates. Any disputes shall be subject to the exclusive
                jurisdiction of the courts of Dubai, UAE.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>Questions about this Disclaimer? Contact us:</p>
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
