'use client';

import { useState, useEffect } from 'react';
import { Clock, Users, Trophy, Play, BookOpen, Target, Award } from 'lucide-react';
import { Quiz } from '@/types';
import PinButton from '@/components/PinButton';
import ContentRenderer from '@/components/ContentRenderer';

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [sortedCards, setSortedCards] = useState<{[key: string]: string[]}>({});
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [selectedHotspot, setSelectedHotspot] = useState<{x: number, y: number} | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && timeLeft > 0 && !quizCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft, quizCompleted]);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.filter((quiz: Quiz) => quiz.isActive));
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setTimeLeft(quiz.timeLimit * 60);
    setQuizStarted(true);
    setQuizCompleted(false);
    setScore(0);
  };

  const selectAnswer = (answerIndex: number | string | any) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleDragStart = (e: React.DragEvent, item: string) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItem) {
      const newAnswers = [...answers];
      if (!newAnswers[currentQuestion]) newAnswers[currentQuestion] = [];
      newAnswers[currentQuestion][targetIndex] = draggedItem;
      setAnswers(newAnswers);
      setDraggedItem(null);
    }
  };

  const flipCard = (cardIndex: number) => {
    if (flippedCards.includes(cardIndex) || matchedPairs.includes(cardIndex)) return;
    
    const newFlipped = [...flippedCards, cardIndex];
    setFlippedCards(newFlipped);
    
    if (newFlipped.length === 2) {
      setTimeout(() => {
        const [first, second] = newFlipped;
        const question = selectedQuiz?.questions[currentQuestion];
        if (question && question.options[first] === question.options[second]) {
          setMatchedPairs([...matchedPairs, first, second]);
        }
        setFlippedCards([]);
      }, 1000);
    }
  };

  const handleCardSort = (card: string, category: string) => {
    const newSorted = { ...sortedCards };
    if (!newSorted[category]) newSorted[category] = [];
    if (!newSorted[category].includes(card)) {
      newSorted[category].push(card);
      setSortedCards(newSorted);
      selectAnswer(newSorted);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedHotspot({ x, y });
    selectAnswer({ x, y });
  };

  const nextQuestion = () => {
    if (selectedQuiz && currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      completeQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const completeQuiz = () => {
    if (!selectedQuiz) return;
    
    let correctAnswers = 0;
    selectedQuiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      if (question.type === 'multiple-choice' || !question.type) {
        if (userAnswer === question.correctAnswer) correctAnswers++;
      } else if (question.type === 'drag-drop') {
        if (Array.isArray(userAnswer) && userAnswer.join(',') === question.options.join(',')) correctAnswers++;
      } else if (question.type === 'card-match') {
        if (matchedPairs.length === question.options.length) correctAnswers++;
      }
    });
    
    const finalScore = Math.round((correctAnswers / selectedQuiz.questions.length) * 100);
    setScore(finalScore);
    setQuizCompleted(true);
    setQuizStarted(false);
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setFlippedCards([]);
    setMatchedPairs([]);
    setDraggedItem(null);
    setSortedCards({});
    setCurrentFlashcard(0);
    setShowFlashcardAnswer(false);
    setSliderValue(50);
    setSelectedHotspot(null);
    setTimeLeft(0);
    setQuizStarted(false);
    setQuizCompleted(false);
    setScore(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (quizCompleted && selectedQuiz) {
    const passed = score >= (selectedQuiz.passingScore || 60);
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {passed ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <Target className="w-10 h-10 text-red-600" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
            </h1>
            
            <div className="mb-6">
              <div className={`text-6xl font-bold mb-2 ${
                passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {score}%
              </div>
              <p className="text-gray-600">
                You scored {answers.filter((answer, index) => {
                  const question = selectedQuiz.questions[index];
                  if (question.type === 'multiple-choice' || !question.type) {
                    return answer === question.correctAnswer;
                  }
                  return false;
                }).length} out of {selectedQuiz.questions.length} questions correctly
              </p>
            </div>

            <div className={`p-4 rounded-lg mb-6 ${
              passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-semibold ${
                passed ? 'text-green-800' : 'text-red-800'
              }`}>
                {passed 
                  ? `Great job! You passed with ${score}%` 
                  : `You need ${selectedQuiz.passingScore || 60}% to pass. Try again!`
                }
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => startQuiz(selectedQuiz)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={resetQuiz}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Back to Quizzes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && quizStarted) {
    const question = selectedQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedQuiz.title}</h1>
                <p className="text-gray-600">Question {currentQuestion + 1} of {selectedQuiz.questions.length}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                  <Clock className="w-5 h-5" />
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="mb-8">
              <div className="text-lg text-gray-900 mb-6">
                <ContentRenderer content={question.question} />
              </div>
              
              {/* Multiple Choice */}
              {(!question.type || question.type === 'multiple-choice') && (
                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => selectAnswer(index)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all transform hover:scale-[1.02] ${
                        answers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-semibold text-gray-700 mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="text-gray-800">{option}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Drag and Drop */}
              {question.type === 'drag-drop' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Drag items to correct positions:</h4>
                    <div className="flex flex-wrap gap-3">
                      {question.options.map((item, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg cursor-move hover:bg-blue-100 transition-colors shadow-md text-gray-800"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {question.options.map((_, index) => (
                      <div
                        key={index}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        {answers[currentQuestion]?.[index] || `Drop zone ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Matching */}
              {question.type === 'card-match' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3">Click cards to find matching pairs:</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        onClick={() => flipCard(index)}
                        className={`h-20 rounded-lg cursor-pointer transition-all transform hover:scale-105 flex items-center justify-center text-sm font-medium ${
                          flippedCards.includes(index) || matchedPairs.includes(index)
                            ? 'bg-green-100 border-2 border-green-400 text-green-800'
                            : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg'
                        }`}
                      >
                        {flippedCards.includes(index) || matchedPairs.includes(index) ? option : '?'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False */}
              {question.type === 'true-false' && (
                <div className="flex gap-4 justify-center">
                  {['True', 'False'].map((option, index) => (
                    <button
                      key={index}
                      onClick={() => selectAnswer(index)}
                      className={`px-8 py-4 rounded-xl border-2 transition-all transform hover:scale-105 font-bold text-lg ${
                        answers[currentQuestion] === index
                          ? index === 0 ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      {index === 0 ? '✅ True' : '❌ False'}
                    </button>
                  ))}
                </div>
              )}

              {/* Card Sorting */}
              {question.type === 'card-sorting' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-3">Sort cards into categories:</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {question.options.map((card, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card)}
                          className="px-3 py-2 bg-white border-2 border-indigo-300 rounded-lg cursor-move hover:bg-indigo-100 transition-colors text-gray-800"
                        >
                          {card}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {question.categories?.map((category, index) => (
                      <div
                        key={index}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedItem) {
                            handleCardSort(draggedItem, category);
                            setDraggedItem(null);
                          }
                        }}
                        className="min-h-24 p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <h5 className="font-semibold text-indigo-800 mb-2">{category}</h5>
                        <div className="space-y-1">
                          {sortedCards[category]?.map((card, cardIndex) => (
                            <div key={cardIndex} className="px-2 py-1 bg-white rounded text-sm text-gray-800">
                              {card}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flashcards */}
              {question.type === 'flashcards' && (
                <div className="space-y-6">
                  <div className="bg-pink-50 p-4 rounded-lg text-center">
                    <h4 className="font-semibold text-pink-900 mb-3">Flashcard {currentFlashcard + 1} of {question.options.length}</h4>
                    <div className="w-full max-w-md mx-auto">
                      <div 
                        className="h-48 bg-white border-2 border-pink-300 rounded-lg flex items-center justify-center cursor-pointer transform transition-transform hover:scale-105"
                        onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                      >
                        <div className="text-center p-4">
                          {showFlashcardAnswer ? (
                            <div>
                              <div className="text-lg font-semibold text-green-700 mb-2">Answer:</div>
                              <div className="text-gray-800">{question.options[currentFlashcard]}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg font-semibold text-pink-700 mb-2">Question:</div>
                              <div className="text-gray-800">{question.question}</div>
                              <div className="text-sm text-gray-500 mt-2">Click to reveal answer</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 mt-4">
                      <button
                        onClick={() => {
                          setCurrentFlashcard(Math.max(0, currentFlashcard - 1));
                          setShowFlashcardAnswer(false);
                        }}
                        disabled={currentFlashcard === 0}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg disabled:bg-gray-400"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          if (currentFlashcard < question.options.length - 1) {
                            setCurrentFlashcard(currentFlashcard + 1);
                            setShowFlashcardAnswer(false);
                          } else {
                            selectAnswer('completed');
                          }
                        }}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg"
                      >
                        {currentFlashcard === question.options.length - 1 ? 'Complete' : 'Next'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Slider Scale */}
              {question.type === 'slider-scale' && (
                <div className="space-y-4">
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-3">Rate on a scale:</h4>
                    <div className="w-full">
                      <input
                        type="range"
                        min={question.minValue || 0}
                        max={question.maxValue || 100}
                        value={sliderValue}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setSliderValue(value);
                          selectAnswer(value);
                        }}
                        className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-sm text-teal-700 mt-2">
                        <span>{question.minValue || 0}</span>
                        <span className="font-bold text-lg text-gray-800">{sliderValue}</span>
                        <span>{question.maxValue || 100}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotspot Image */}
              {question.type === 'hotspot-image' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Click on the correct area:</h4>
                    <div 
                      className="relative w-full max-w-lg mx-auto cursor-crosshair"
                      onClick={handleImageClick}
                    >
                      {question.imageUrl ? (
                        <img 
                          src={question.imageUrl} 
                          alt="Question image" 
                          className="w-full h-64 object-cover rounded-lg border-2 border-orange-300"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg border-2 border-orange-400 flex items-center justify-center">
                          <span className="text-orange-700 font-medium">Click anywhere on this area</span>
                        </div>
                      )}
                      
                      {selectedHotspot && (
                        <div 
                          className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-2 -translate-y-2"
                          style={{ 
                            left: `${selectedHotspot.x}%`, 
                            top: `${selectedHotspot.y}%` 
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={resetQuiz}
                  className="px-3 py-2 md:px-6 md:py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm md:text-base"
                >
                  Exit Quiz
                </button>
                {currentQuestion > 0 && (
                  <button
                    onClick={previousQuestion}
                    className="px-3 py-2 md:px-6 md:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm md:text-base"
                  >
                    Previous
                  </button>
                )}
              </div>
              <button
                onClick={nextQuestion}
                className="px-3 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                {currentQuestion === selectedQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">🧠 Quiz Competition</h1>
          <p className="text-xl text-purple-100 mb-8">
            Test your knowledge and challenge yourself with our interactive quizzes
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white">{quizzes.length}</div>
              <div className="text-purple-200">Available Quizzes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">∞</div>
              <div className="text-purple-200">Attempts</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">🏆</div>
              <div className="text-purple-200">Compete & Win</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {quizzes.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">No Quizzes Available</h2>
            <p className="text-gray-500">Check back later for new quiz competitions!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                    {quiz.subject && (
                      <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full mb-2">
                        {quiz.subject}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {quiz.difficulty}
                  </span>
                </div>

                <div className="text-gray-600 mb-4 line-clamp-3">
                  <ContentRenderer content={quiz.description} />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {quiz.questions.length} Questions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.timeLimit} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {quiz.passingScore || 60}% to pass
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <PinButton 
                    id={quiz.id}
                    title={quiz.title}
                    content={quiz.description}
                    category="quiz"
                    subject={quiz.subject}
                    url={`/quiz?id=${quiz.id}`}
                  />
                </div>

                <button
                  onClick={() => startQuiz(quiz)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  <Play className="w-5 h-5" />
                  Start Quiz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}