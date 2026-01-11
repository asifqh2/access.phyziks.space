'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Zap, Target, Clock, Trophy, Star, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import { Quiz, QuizQuestion } from '@/types';

export default function CreateQuizPage() {
  const [quiz, setQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    subject: '',
    difficulty: 'medium',
    timeLimit: 10,
    questions: [],
    tags: [],
    isActive: true,
    maxAttempts: 3,
    passingScore: 60
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    type: 'multiple-choice'
  });

  const [quizFormat, setQuizFormat] = useState('standard');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState('multiple-choice');

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
      const updatedQuestions = [...(quiz.questions || [])];
      updatedQuestions[editingIndex] = newQuestion;
      setQuiz({ ...quiz, questions: updatedQuestions });
      setEditingIndex(null);
    } else {
      setQuiz({ ...quiz, questions: [...(quiz.questions || []), newQuestion] });
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
    const question = quiz.questions?.[index];
    if (question) {
      setCurrentQuestion(question);
      setEditingIndex(index);
      setIsAddingQuestion(true);
    }
  };

  const deleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = quiz.questions?.filter((_, i) => i !== index) || [];
      setQuiz({ ...quiz, questions: updatedQuestions });
    }
  };

  const saveQuiz = async () => {
    if (!quiz.title || !quiz.description || !quiz.questions?.length) {
      alert('Please fill in title, description, and add at least one question');
      return;
    }

    const quizData: Quiz = {
      id: Date.now().toString(),
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject || '',
      difficulty: quiz.difficulty || 'medium',
      timeLimit: quiz.timeLimit || 10,
      questions: quiz.questions,
      tags: quiz.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: quiz.isActive || true,
      maxAttempts: quiz.maxAttempts,
      passingScore: quiz.passingScore
    };

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (response.ok) {
        alert('✅ Quiz created successfully!');
        setQuiz({
          title: '',
          description: '',
          subject: '',
          difficulty: 'medium',
          timeLimit: 10,
          questions: [],
          tags: [],
          isActive: true,
          maxAttempts: 3,
          passingScore: 60
        });
      } else {
        alert('❌ Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('❌ Error creating quiz');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-b shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-10 text-4xl animate-bounce">🎮</div>
          <div className="absolute top-8 right-20 text-3xl animate-pulse">⚡</div>
          <div className="absolute bottom-4 left-20 text-2xl animate-spin">🎯</div>
          <div className="absolute bottom-8 right-10 text-3xl animate-bounce">🏆</div>
        </div>
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 text-white">
                <Gamepad2 className="w-10 h-10 animate-pulse text-white" />
                Create Epic Quiz
              </h1>
              <p className="text-purple-100 mt-2 text-lg">Design gamified quizzes that students will love!</p>
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
              <Star className="w-8 h-8 mx-auto mb-2 text-pink-300" />
              <div className="text-2xl font-bold text-white">{quiz.difficulty || 'Medium'}</div>
              <div className="text-sm text-purple-200">Difficulty</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border-t-4 border-purple-500 transform hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-full">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Quiz Configuration</h2>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Quiz Format</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'standard', name: 'Standard Quiz', icon: '📝', desc: 'Traditional Q&A format' },
                { id: 'rapid-fire', name: 'Rapid Fire', icon: '⚡', desc: 'Quick succession questions' },
                { id: 'survival', name: 'Survival Mode', icon: '🎯', desc: 'Eliminate on wrong answer' }
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => setQuizFormat(format.id)}
                  className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    quizFormat === format.id 
                      ? 'border-purple-500 bg-purple-50 shadow-lg' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{format.icon}</div>
                  <div className="font-semibold text-gray-900">{format.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{format.desc}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
              <input
                type="text"
                value={quiz.title || ''}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder="Enter quiz title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={quiz.subject || ''}
                onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder="e.g., Mathematics, Physics"
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
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Quiz Questions ({quiz.questions?.length || 0})</h2>
            </div>
            <button
              onClick={() => setIsAddingQuestion(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Epic Question
            </button>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Question Type</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'multiple-choice', name: 'Multiple Choice', icon: '🔘' },
                { id: 'true-false', name: 'True/False', icon: '✅' },
                { id: 'fill-blank', name: 'Fill in Blank', icon: '📝' },
                { id: 'match-pairs', name: 'Match Pairs', icon: '🔗' },
                { id: 'drag-drop', name: 'Drag & Drop', icon: '🎯' },
                { id: 'card-match', name: 'Card Match', icon: '🃏' },
                { id: 'card-sorting', name: 'Card Sorting', icon: '📊' },
                { id: 'flashcards', name: 'Flashcards', icon: '💳' },
                { id: 'slider-scale', name: 'Slider Scale', icon: '🎚️' },
                { id: 'hotspot-image', name: 'Hotspot Image', icon: '🎯' },
                { id: 'essay', name: 'Essay', icon: '📄' },
                { id: 'short-answer', name: 'Short Answer', icon: '✏️' },
                { id: 'numeric', name: 'Numeric', icon: '🔢' },
                { id: 'ordering', name: 'Ordering', icon: '📋' },
                { id: 'matrix', name: 'Matrix', icon: '⚡' },
                { id: 'word-cloud', name: 'Word Cloud', icon: '☁️' },
                { id: 'timeline', name: 'Timeline', icon: '⏰' },
                { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
                { id: 'spinner-wheel', name: 'Spinner Wheel', icon: '🎡' },
                { id: 'memory-game', name: 'Memory Game', icon: '🧠' },
                { id: 'crossword', name: 'Crossword', icon: '🔤' },
                { id: 'word-search', name: 'Word Search', icon: '🔍' },
                { id: 'drawing', name: 'Drawing', icon: '🎨' },
                { id: 'audio-response', name: 'Audio Response', icon: '🎤' },
                { id: 'video-response', name: 'Video Response', icon: '📹' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedQuestionType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedQuestionType === type.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-xs font-medium text-gray-900">{type.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {quiz.questions?.map((question, index) => (
              <div key={question.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Question {index + 1}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {question.type || 'multiple-choice'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editQuestion(index)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div dangerouslySetInnerHTML={{ __html: question.question }} className="mb-3 text-gray-800" />
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className={`p-2 rounded ${optIndex === question.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                      <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                      {optIndex === question.correctAnswer && <span className="text-green-600 ml-2">✓ Correct</span>}
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <strong>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: question.explanation }} />
                  </div>
                )}
              </div>
            ))}

            {isAddingQuestion && (
              <div className="border-2 border-purple-400 rounded-xl p-8 bg-gradient-to-br from-purple-50 to-pink-50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500 text-white rounded-full">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingIndex !== null ? '✏️ Edit Question' : '🚀 Add New Question'}
                  </h3>
                </div>
                
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

        <div className="flex gap-6 justify-center">
          <button
            onClick={saveQuiz}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-xl font-bold text-lg"
          >
            <Save className="w-6 h-6" />
            🚀 Launch Quiz
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-8 py-4 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all transform hover:scale-105 font-semibold text-lg"
          >
            Cancel
          </Link>
        </div>
        
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Trophy className="w-4 h-4" />
            Pro Tip: Add at least 5 questions for better engagement!
          </div>
        </div>
      </div>
    </div>
  );
}