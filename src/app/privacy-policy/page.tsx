// src/app/privacy-policy/page.tsx
import { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Phyziks.space',
  description: 'Read our privacy policy to understand how Phyziks.space collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-12 h-12" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-xl text-blue-100">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to Phyziks.space. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you about how we collect, use, and safeguard your personal information 
                when you visit our website and use our services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We may collect, use, store and transfer different kinds of personal data about you:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Identity Data:</strong> Name and username when you comment on posts</li>
                <li><strong>Contact Data:</strong> Email address provided for comments</li>
                <li><strong>Technical Data:</strong> IP address, browser type, time zone, and operating system</li>
                <li><strong>Usage Data:</strong> Information about how you use our website and services</li>
                <li><strong>Analytics Data:</strong> Page views, time spent on pages, and navigation patterns</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>To display your comments on our posts</li>
                <li>To communicate with you regarding your inquiries</li>
                <li>To improve our website and services</li>
                <li>To analyze usage patterns and optimize user experience</li>
                <li>To send you educational content and updates (only if you opt-in)</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies to improve your experience on our website. Cookies are small text files stored on 
                your device. We use essential cookies for website functionality and analytics cookies to understand 
                how visitors interact with our website. You can control cookies through your browser settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Google AdSense</h2>
              <p className="text-gray-700 leading-relaxed">
                We use Google AdSense to display advertisements on our website. Google uses cookies to serve ads 
                based on your prior visits to our website or other websites. You may opt out of personalized 
                advertising by visiting Google's Ads Settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We have implemented appropriate security measures to prevent your personal data from being accidentally 
                lost, used, or accessed in an unauthorized way. We limit access to your personal data to those who have 
                a genuine business need to know it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Under data protection laws, you have rights including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>The right to access your personal data</li>
                <li>The right to request correction of your personal data</li>
                <li>The right to request erasure of your personal data</li>
                <li>The right to object to processing of your personal data</li>
                <li>The right to data portability</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Links</h2>
              <p className="text-gray-700 leading-relaxed">
                Our website may include links to third-party websites, plug-ins, and applications. Clicking on those 
                links may allow third parties to collect or share data about you. We do not control these third-party 
                websites and are not responsible for their privacy statements.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our website is intended for students of all ages. However, we do not knowingly collect personal 
                information from children under 13 without parental consent. If you are a parent and believe your 
                child has provided us with personal information, please contact us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new privacy policy on this page and updating the "Last updated" date at the top of this policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> asifqh2@gmail.com<br />
                  <strong>Phone:</strong> +91 8850484674<br />
                  <strong>Address:</strong> Mumbai, Maharashtra, India
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}