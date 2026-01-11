'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import { Quiz, QuizQuestion } from '@/types';

export default function EditQuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = searchParams.get('id');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    type: 'multiple-choice'
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const addQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options?.some(opt => !opt.trim())) {
      alert('Please fill in the question and all options');
      return;
    }

    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: currentQuestion.question,
      options: currentQuestion.options || ['', '', '', ''],
      correctAnswer: currentQuestion.correctAnswer || 0,
      explanation: currentQuestion.explanation || '',
      type: currentQuestion.type || 'multiple-choice'
    };

    if (editingIndex !== null) {
      const updatedQuestions = [...(quiz?.questions || [])];
      updatedQuestions[editingIndex] = newQuestion;
      setQuiz({ ...quiz!, questions: updatedQuestions });
      setEditingIndex(null);
    } else {
      setQuiz({ ...quiz!, questions: [...(quiz?.questions || []), newQuestion] });
    }

    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      type: 'multiple-choice'
    });
    setIsAddingQuestion(false);
  };

  const editQuestion = (index: number) => {
    const question = quiz?.questions?.[index];
    if (question) {
      setCurrentQuestion({
        question: question.question,
        options: [...question.options],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        type: question.type || 'multiple-choice'
      });
      setEditingIndex(index);
      setIsAddingQuestion(true);
    }
  };

  const deleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = quiz?.questions?.filter((_, i) => i !== index) || [];
      setQuiz({ ...quiz!, questions: updatedQuestions });
    }
  };

  const saveQuiz = async () => {
    if (!quiz?.title || !quiz?.description || !quiz?.questions?.length) {
      alert('Please fill in title, description, and add at least one question');
      return;
    }

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz)
      });

      if (response.ok) {
        alert('✅ Quiz updated successfully!');
        router.push('/admin');
      } else {
        alert('❌ Failed to update quiz');
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('❌ Error updating quiz');
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
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Edit className="w-10 h-10" />
                Edit Quiz
              </h1>
              <p className="text-purple-100 mt-2">Modify your quiz content and settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
              <input
                type="text"
                value={quiz.title || ''}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={quiz.subject || ''}
                onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={quiz.difficulty || 'medium'}
                onChange={(e) => setQuiz({ ...quiz, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
              <input
                type="number"
                value={quiz.timeLimit || 10}
                onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                min="1"
                max="180"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
              <input
                type="number"
                value={quiz.maxAttempts || 3}
                onChange={(e) => setQuiz({ ...quiz, maxAttempts: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
              <input
                type="number"
                value={quiz.passingScore || 60}
                onChange={(e) => setQuiz({ ...quiz, passingScore: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <RichTextEditor
              value={quiz.description || ''}
              onChange={(value) => setQuiz({ ...quiz, description: value })}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiz.isActive || false}
                onChange={(e) => setQuiz({ ...quiz, isActive: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">Quiz is Active</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Questions ({quiz.questions?.length || 0})</h2>
            <button
              onClick={() => setIsAddingQuestion(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            {quiz.questions?.map((question, index) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Question {index + 1}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {question.type || 'multiple-choice'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editQuestion(index)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div dangerouslySetInnerHTML={{ __html: question.question }} className="mb-3 text-gray-800" />
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className={`p-2 rounded text-gray-900 ${optIndex === question.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                      <span className="font-medium text-gray-900">{String.fromCharCode(65 + optIndex)}.</span> <span className="text-gray-900">{option}</span>
                      {optIndex === question.correctAnswer && <span className="text-green-600 ml-2">✓ Correct</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {isAddingQuestion && (
              <div className="border-2 border-purple-400 rounded-lg p-6 bg-purple-50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {editingIndex !== null ? 'Edit Question' : 'Add New Question'}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                  <RichTextEditor
                    value={currentQuestion.question || ''}
                    onChange={(value) => setCurrentQuestion({ ...currentQuestion, question: value })}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
                  {currentQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-700">{String.fromCharCode(65 + index)}.</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
                          newOptions[index] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 text-gray-900"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                        className="text-purple-600"
                      />
                      <span className="text-sm text-gray-600">Correct</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                  <RichTextEditor
                    value={currentQuestion.explanation || ''}
                    onChange={(value) => setCurrentQuestion({ ...currentQuestion, explanation: value })}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={addQuestion}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editingIndex !== null ? 'Update Question' : 'Add Question'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingQuestion(false);
                      setEditingIndex(null);
                      setCurrentQuestion({
                        question: '',
                        options: ['', '', '', ''],
                        correctAnswer: 0,
                        explanation: '',
                        type: 'multiple-choice'
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={saveQuiz}
            className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold"
          >
            <Save className="w-6 h-6" />
            Save Changes
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-8 py-4 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-semibold"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}