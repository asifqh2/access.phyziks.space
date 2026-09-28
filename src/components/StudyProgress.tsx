'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Award } from 'lucide-react';

interface StudyGoal {
  subject: string;
  target: number;
  completed: number;
  streak: number;
}

export default function StudyProgress() {
  const [goals, setGoals] = useState<StudyGoal[]>([
    { subject: 'Mathematics', target: 100, completed: 75, streak: 5 },
    { subject: 'Physics', target: 80, completed: 45, streak: 3 },
    { subject: 'Chemistry', target: 90, completed: 60, streak: 7 }
  ]);

  const totalProgress = goals.reduce((acc, goal) => acc + (goal.completed / goal.target), 0) / goals.length * 100;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-semibold">Study Progress</h3>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-green-600">{Math.round(totalProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-800">{goal.subject}</h4>
              <div className="flex items-center gap-1 text-orange-600">
                <Award className="w-4 h-4" />
                <span className="text-sm font-bold">{goal.streak}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">{goal.completed}/{goal.target} topics</span>
              <span className="text-sm font-bold text-blue-600">
                {Math.round((goal.completed / goal.target) * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(goal.completed / goal.target) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">This Week</p>
          <p className="font-bold text-blue-600">12 hrs</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <Calendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Streak</p>
          <p className="font-bold text-green-600">5 days</p>
        </div>
      </div>
    </div>
  );
}