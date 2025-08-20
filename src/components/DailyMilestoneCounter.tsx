import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { format, differenceInDays, addDays } from 'date-fns';

interface DailyMilestoneCounterProps {
  taskWordCount: number;
  taskDurationDays: number;
  taskCreatedAt: string;
  currentWordCount: number;
  className?: string;
}

const DailyMilestoneCounter = ({ 
  taskWordCount, 
  taskDurationDays, 
  taskCreatedAt, 
  currentWordCount,
  className = ""
}: DailyMilestoneCounterProps) => {
  const [currentDay, setCurrentDay] = useState(1);
  const [dailyTarget, setDailyTarget] = useState(0);
  const [cumulativeTarget, setCumulativeTarget] = useState(0);
  const [isAheadOfSchedule, setIsAheadOfSchedule] = useState(false);

  useEffect(() => {
    calculateMilestones();
  }, [taskWordCount, taskDurationDays, taskCreatedAt]);

  const calculateMilestones = () => {
    const startDate = new Date(taskCreatedAt);
    const today = new Date();
    
    // Calculate which day we're on (1-indexed)
    const daysSinceStart = differenceInDays(today, startDate) + 1;
    const currentDayNumber = Math.max(1, Math.min(daysSinceStart, taskDurationDays));
    
    // Calculate daily word target
    const wordsPerDay = Math.ceil(taskWordCount / taskDurationDays);
    
    // Calculate cumulative target for current day
    const currentCumulativeTarget = wordsPerDay * currentDayNumber;
    
    // Check if ahead of schedule
    const isAhead = currentWordCount > currentCumulativeTarget;
    
    setCurrentDay(currentDayNumber);
    setDailyTarget(wordsPerDay);
    setCumulativeTarget(currentCumulativeTarget);
    setIsAheadOfSchedule(isAhead);
  };

  const getNextMilestoneDay = () => {
    if (currentDay >= taskDurationDays) return taskDurationDays;
    return Math.min(Math.ceil(currentWordCount / dailyTarget) + 1, taskDurationDays);
  };

  const getProgressPercentage = () => {
    return Math.min((currentWordCount / cumulativeTarget) * 100, 100);
  };

  const getMilestoneStatus = () => {
    if (currentWordCount >= cumulativeTarget) {
      return "achieved";
    } else if (currentWordCount >= cumulativeTarget * 0.8) {
      return "close";
    } else {
      return "behind";
    }
  };

  const status = getMilestoneStatus();
  const progressPercentage = getProgressPercentage();
  const nextMilestoneDay = getNextMilestoneDay();

  return (
    <Card className={`${className} border-2 transition-all duration-300 ${
      status === 'achieved' ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' :
      status === 'close' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800' :
      'border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${
                status === 'achieved' ? 'text-green-600' :
                status === 'close' ? 'text-yellow-600' :
                'text-gray-600'
              }`} />
              <span className="text-sm font-medium">Daily Milestone</span>
            </div>
            <Badge variant={
              status === 'achieved' ? 'default' :
              status === 'close' ? 'secondary' :
              'outline'
            } className="text-xs">
              Day {currentDay}/{taskDurationDays}
            </Badge>
          </div>

          {/* Current Target */}
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {currentWordCount.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              / {cumulativeTarget.toLocaleString()} words
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target for Day {currentDay}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  status === 'achieved' ? 'bg-green-500' :
                  status === 'close' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressPercentage.toFixed(1)}%</span>
              <span>
                {status === 'achieved' ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Milestone Achieved!
                  </span>
                ) : (
                  `${(cumulativeTarget - currentWordCount).toLocaleString()} to go`
                )}
              </span>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {dailyTarget.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Words/Day</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {Math.min(nextMilestoneDay * dailyTarget, taskWordCount).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Next Target (Day {nextMilestoneDay})
              </div>
            </div>
          </div>

          {/* Status Message */}
          {isAheadOfSchedule && (
            <div className="text-center bg-green-100 dark:bg-green-900 rounded-lg p-2">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Ahead of Schedule!</span>
              </div>
            </div>
          )}
          
          {status === 'behind' && currentDay > 1 && (
            <div className="text-center bg-red-100 dark:bg-red-900 rounded-lg p-2">
              <div className="text-red-700 dark:text-red-300 text-sm">
                Keep writing to catch up with your milestone!
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyMilestoneCounter;