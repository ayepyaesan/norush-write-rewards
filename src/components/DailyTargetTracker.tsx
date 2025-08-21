import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface DailyTargetTrackerProps {
  currentWords: number;
  targetWords: number;
  wordsDeficit: number;
  evaluationStatus: 'pending' | 'target_met' | 'target_not_met';
  qualityScore?: number;
  nextDayTarget?: number;
  dayNumber: number;
}

const DailyTargetTracker = ({
  currentWords,
  targetWords,
  wordsDeficit,
  evaluationStatus,
  qualityScore,
  nextDayTarget,
  dayNumber
}: DailyTargetTrackerProps) => {
  const progressPercentage = Math.min((currentWords / targetWords) * 100, 100);
  const isCompleted = currentWords >= targetWords;
  
  const getStatusIcon = () => {
    switch (evaluationStatus) {
      case 'target_met':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'target_not_met':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (evaluationStatus) {
      case 'target_met':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Target Met</Badge>;
      case 'target_not_met':
        return <Badge variant="destructive">Target Not Met</Badge>;
      default:
        return <Badge variant="outline">Pending Evaluation</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Day {dayNumber} Progress</span>
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Words Written</span>
            <span>{currentWords} / {targetWords}</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground text-center">
            {progressPercentage.toFixed(1)}% Complete
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {getStatusBadge()}
        </div>

        {/* Quality Score */}
        {qualityScore !== undefined && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <span className="text-sm font-medium">Content Quality</span>
            <div className="flex items-center gap-2">
              <Progress value={qualityScore} className="w-16 h-2" />
              <span className="text-sm font-bold">{qualityScore}/100</span>
            </div>
          </div>
        )}

        {/* Deficit Warning */}
        {wordsDeficit > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <div className="text-xs">
              <div className="font-medium text-orange-800">Words Behind: {wordsDeficit}</div>
              {nextDayTarget && (
                <div className="text-orange-600">Next Day Target: {nextDayTarget} words</div>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {isCompleted && evaluationStatus === 'target_met' && (
          <div className="text-center p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-800">
              🎉 Great job! Target achieved with quality content!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyTargetTracker;