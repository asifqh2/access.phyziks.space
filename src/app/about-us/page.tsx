// src/app/about-us/page.tsx
import { Metadata } from 'next';
import { GraduationCap, Target, Heart, Users, Award, Code, Zap, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Phyziks.space',
  description: 'Learn more about Phyziks.space and its founder Asif Qureshi - Your trusted educational resource platform providing quality study materials and exam preparation resources.',
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-12 h-12" />
            <h1 className="text-4xl font-bold">About Phyziks.space</h1>
          </div>
          <p className="text-xl text-blue-100 max-w-3xl">
            Empowering students with quality educational resources for academic excellence
          </p>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Profile Image Side */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 lg:p-12 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                    <span className="text-6xl font-bold text-white">AQ</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Asif Qureshi</h2>
                  <p className="text-blue-100 text-lg">Founder & Developer</p>
                  <div className="flex justify-center gap-4 mt-6">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      <span className="text-sm">BE Electronics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      <span className="text-sm">M.Tech VLSI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Side */}
              <div className="p-8 lg:p-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-6 h-6 text-red-500" />
                      Made with Love & Passion
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Phyziks.space was born from a deep passion for education and technology. As an electronics engineer 
                      with expertise in VLSI technology, I understand the challenges students face in accessing 
                      quality educational resources.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Education</span>
                      </div>
                      <p className="text-sm text-gray-600">BE Electronics from University of Mumbai</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">Specialization</span>
                      </div>
                      <p className="text-sm text-gray-600">Master in VLSI Technology from William Carey University</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <Code className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Vision & Mission</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          "Every student deserves access to quality education. This platform combines my technical 
                          expertise with educational passion to create a comprehensive learning ecosystem that 
                          empowers students to achieve their academic dreams."
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Electronics Engineering</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">VLSI Technology</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Web Development</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Education Technology</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p>
                Phyziks.space was created with a simple yet powerful vision: to democratize quality education and make 
                it accessible to every student. Born from the intersection of technical expertise and educational 
                passion, this platform represents countless hours of dedication and innovation.
              </p>
              <p>
                With a strong foundation in electronics engineering and advanced knowledge in VLSI technology, 
                our founder brings a unique perspective to educational technology. The platform leverages modern 
                web technologies to deliver an intuitive, comprehensive learning experience.
              </p>
              <p>
                Every feature, every line of code, and every piece of content has been crafted with students in mind. 
                From interactive quizzes to comprehensive study materials, Phyziks.space continues to evolve based on 
                student needs and feedback.
              </p>
            </div>
          </div>

          {/* Our Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-600">
                To provide accessible, high-quality educational resources that empower students to excel in their studies.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Values</h3>
              <p className="text-gray-600">
                Quality, accessibility, integrity, and student-centric approach guide everything we do.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Community</h3>
              <p className="text-gray-600">
                Join thousands of students who trust Phyziks.space for their exam preparation and academic success.
              </p>
            </div>
          </div>

          {/* What We Offer */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What We Offer</h2>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Last Year Papers:</strong> Comprehensive collection of previous year question papers with detailed solutions</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Chapter-wise Notes:</strong> Well-organized study materials covering complete syllabus</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Topic-wise Resources:</strong> Focused content for specific topics and concepts</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Interactive Quizzes:</strong> Test your knowledge with engaging quiz competitions</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Advanced Analytics:</strong> Track your learning progress with comprehensive analytics</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                <span><strong>Modern Technology:</strong> Built with cutting-edge web technologies for optimal performance</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}