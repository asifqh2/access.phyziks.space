// src/app/disclaimer/page.tsx
import { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer | Phyziks.space',
  description: 'Read our disclaimer to understand the terms and limitations of using Phyziks.space educational resources.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-12 h-12" />
            <h1 className="text-4xl font-bold">Disclaimer</h1>
          </div>
          <p className="text-xl text-orange-100">
            Important information about the use of our website and services
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
              <p className="text-gray-700">
                <strong>Important:</strong> Please read this disclaimer carefully before using our website. 
                By accessing or using Phyziks.space, you agree to be bound by this disclaimer.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. General Information</h2>
              <p className="text-gray-700 leading-relaxed">
                The information provided on Phyziks.space is for general educational and informational purposes only. 
                While we strive to provide accurate and up-to-date content, we make no representations or warranties 
                of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or 
                availability of the information, products, services, or related graphics contained on the website.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Educational Content</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                All educational materials, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Study notes and materials</li>
                <li>Previous year question papers</li>
                <li>Practice questions and solutions</li>
                <li>Video tutorials and explanations</li>
                <li>PDF documents and downloadable content</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                are provided as supplementary study resources. They should not be considered as the sole source 
                of preparation for any examination. Students are advised to refer to their official textbooks 
                and consult their teachers for comprehensive learning.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Accuracy of Information</h2>
              <p className="text-gray-700 leading-relaxed">
                While we make every effort to ensure that the content on our website is accurate and current, 
                we cannot guarantee that all information is completely error-free. Educational syllabi, exam 
                patterns, and content may change, and there may be delays in updating our materials. Users are 
                advised to verify critical information from official sources.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. No Professional Advice</h2>
              <p className="text-gray-700 leading-relaxed">
                The content on this website does not constitute professional educational counseling or advice. 
                We are not responsible for any decisions made based solely on the information provided on our 
                website. For specific academic guidance, please consult qualified educational professionals 
                or your institution.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Content</h2>
              <p className="text-gray-700 leading-relaxed">
                Our website may contain links to external websites, embedded videos (such as YouTube), and 
                third-party resources. We have no control over the nature, content, and availability of those 
                sites. The inclusion of any links does not necessarily imply a recommendation or endorse the 
                views expressed within them.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Copyright and Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                We respect intellectual property rights and expect our users to do the same. If you believe 
                that any content on our website infringes your copyright, please contact us immediately. We 
                make every effort to ensure that all content is either original, properly licensed, or used 
                in accordance with fair use principles for educational purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. User Comments and Contributions</h2>
              <p className="text-gray-700 leading-relaxed">
                Comments and contributions posted by users represent their own views and opinions, not those 
                of Phyziks.space. We are not responsible for the accuracy, completeness, or usefulness of any user-generated 
                content. We reserve the right to remove any content that we deem inappropriate, offensive, or 
                in violation of our terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                In no event shall Phyziks.space, its owners, employees, or affiliates be liable for any direct, indirect, 
                incidental, consequential, or punitive damages arising out of your access to or use of the website. 
                This includes, but is not limited to, any errors or omissions in content, or any loss or damage 
                incurred as a result of the use of content posted, transmitted, or otherwise made available on 
                the website.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Exam Results</h2>
              <p className="text-gray-700 leading-relaxed">
                Phyziks.space does not guarantee any specific exam results or academic performance. Success in examinations 
                depends on various factors including individual effort, understanding, preparation time, and 
                examination conditions. Our materials are designed to assist in preparation but cannot ensure 
                particular outcomes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Technical Issues</h2>
              <p className="text-gray-700 leading-relaxed">
                We strive to keep our website running smoothly, but we do not guarantee that the website will 
                always be available, uninterrupted, or error-free. We are not liable for any loss or damage 
                arising from technical issues, including but not limited to server failures, data loss, or 
                connectivity problems.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Content</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify, update, or remove any content on our website at any time without 
                prior notice. This includes study materials, posts, comments, and any other information available 
                on the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Advertisement</h2>
              <p className="text-gray-700 leading-relaxed">
                Our website displays advertisements through Google AdSense and potentially other advertising 
                networks. We are not responsible for the content of these advertisements or the products/services 
                they promote. The appearance of advertisements does not constitute an endorsement by Phyziks.space.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions or concerns about this disclaimer, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> asifqh2@gmail.com<br />
                  <strong>Phone:</strong> +91 8850484674
                </p>
              </div>
            </div>

            <div className="bg-gray-100 border-l-4 border-gray-500 p-4 mt-8">
              <p className="text-gray-700 text-sm">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-gray-600 text-sm mt-2">
                By using Phyziks.space, you acknowledge that you have read, understood, and agree to be bound by this disclaimer.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}