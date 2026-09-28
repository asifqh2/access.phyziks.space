'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Target, Trophy, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Quiz } from '@/types';
import PdfDownloadButton from '@/components/PdfDownloadButton';
import ContentRenderer from '@/components/ContentRenderer';

export default function QuizViewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      } else {
        alert('Quiz not found');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Error loading quiz');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async () => {
    if (!confirm(`Are you sure you want to delete "${quiz?.title}"?`)) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Quiz deleted successfully!');
        router.push('/admin');
      } else {
        alert('❌ Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('❌ Error deleting quiz');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quiz not found</p>
          <Link href="/admin" className="text-purple-600 hover:underline mt-2 inline-block">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-b shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex-1">
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Eye className="w-10 h-10" />
                {quiz.title}
              </h1>
              <p className="text-purple-100 mt-2">{quiz.description?.replace(/<[^>]*>/g, '')}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/edit-quiz?id=${quiz.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <Edit className="w-5 h-5" />
                Edit Quiz
              </Link>
              <button
                onClick={deleteQuiz}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete Quiz
              </button>
              <PdfDownloadButton title={quiz.title} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
              <div className="text-2xl font-bold text-white">{quiz.questions?.length || 0}</div>
              <div className="text-sm text-purple-200">Questions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-blue-300" />
              <div className="text-2xl font-bold text-white">{quiz.timeLimit || 0}</div>
              <div className="text-sm text-purple-200">Minutes</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <div className="text-2xl font-bold text-white">{quiz.passingScore || 0}%</div>
              <div className="text-sm text-purple-200">Pass Score</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                quiz.isActive ? 'bg-green-400' : 'bg-gray-400'
              }`}>
                {quiz.isActive ? '✓' : '✗'}
              </div>
              <div className="text-2xl font-bold text-white">{quiz.isActive ? 'Active' : 'Inactive'}</div>
              <div className="text-sm text-purple-200">Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl" data-quiz-content>
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {quiz.subject || 'Not specified'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {quiz.difficulty || 'Medium'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {quiz.maxAttempts || 3}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {new Date(quiz.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
              <ContentRenderer content={quiz.description} />
            </div>
          </div>

          {quiz.tags && quiz.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {quiz.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions ({quiz.questions?.length || 0})</h2>
          
          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="space-y-6">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">Question {index + 1}</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {question.type || 'multiple-choice'}
                        </span>
                      </div>
                      <div className="text-gray-800 mb-4">
                        <ContentRenderer content={question.question} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-14">
                    <h4 className="font-semibold text-gray-700 mb-3">Options:</h4>
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`p-3 rounded-lg border ${
                          optIndex === question.correctAnswer 
                            ? 'bg-green-50 border-green-300 text-green-800' 
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                            <span className="flex-1">{option}</span>
                            {optIndex === question.correctAnswer && (
                              <span className="text-green-600 font-semibold">✓ Correct Answer</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                        <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                        <div className="text-blue-800">
                          <ContentRenderer content={question.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">❓</div>
              <p className="text-gray-500 text-lg">No questions added yet.</p>
              <Link
                href={`/edit-quiz?id=${quiz.id}`}
                className="text-purple-600 hover:underline mt-2 inline-block"
              >
                Add questions to this quiz
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}