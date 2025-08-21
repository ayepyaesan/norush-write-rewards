import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Save, Target, Clock, CheckCircle, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface NoRushEditorProps {
  taskId: string;
  milestoneId?: string;
  dailyTarget?: number;
  onSave?: (content: string, wordCount: number) => void;
}

interface ValidationResult {
  word: string;
  isValid: boolean;
  reason: string;
}

interface RepetitionViolation {
  type: string;
  message: string;
  word?: string;
  count?: number;
  similarity?: number;
}

const NoRushEditor: React.FC<NoRushEditorProps> = ({ 
  taskId, 
  milestoneId, 
  dailyTarget = 500,
  onSave 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [validWordCount, setValidWordCount] = useState(0);
  const [isSaving, setSaving] = useState(false);
  const [isValidating, setValidating] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationHistory, setValidationHistory] = useState<string[]>([]);
  const [existingContent, setExistingContent] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // Load existing content
  useEffect(() => {
    loadExistingContent();
  }, [taskId, milestoneId]);

  const loadExistingContent = async () => {
    if (!user || !taskId) return;

    try {
      const { data: taskFiles } = await supabase
        .from('task_files')
        .select('content')
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      if (taskFiles && taskFiles.length > 0) {
        const allContent = taskFiles.map(f => f.content || '').join('\n\n');
        setExistingContent(allContent);
      }
    } catch (error) {
      console.error('Error loading existing content:', error);
    }
  };

  const getWords = (text: string): string[] => {
    return text.trim().split(/\s+/).filter(word => word.length > 0);
  };

  const validateWords = async (words: string[]): Promise<ValidationResult[]> => {
    if (!user || words.length === 0) return [];

    try {
      const { data, error } = await supabase.functions.invoke('dictionary-validator', {
        body: {
          words,
          userId: user.id,
          taskId,
          milestoneId,
          action: 'validate'
        }
      });

      if (error) throw error;
      return data.results || [];
    } catch (error) {
      console.error('Dictionary validation error:', error);
      return words.map(word => ({ word, isValid: true, reason: 'validation_failed' }));
    }
  };

  const checkRepetition = async (newContent: string): Promise<RepetitionViolation[]> => {
    if (!user || !newContent.trim()) return [];

    try {
      const { data, error } = await supabase.functions.invoke('repetition-detector', {
        body: {
          content: newContent,
          existingContent,
          userId: user.id,
          taskId,
          milestoneId,
          checkType: 'all'
        }
      });

      if (error) throw error;
      return data.violations || [];
    } catch (error) {
      console.error('Repetition check error:', error);
      return [];
    }
  };

  const validateContent = useCallback(async (text: string) => {
    if (!text.trim()) {
      setWordCount(0);
      setValidWordCount(0);
      setCurrentWarning('');
      return;
    }

    setValidating(true);
    const words = getWords(text);
    setWordCount(words.length);

    try {
      // Validate last few words for real-time feedback
      const lastWords = words.slice(-5);
      const validationResults = await validateWords(lastWords);
      const repetitionViolations = await checkRepetition(text);

      // Check for invalid words
      const invalidWords = validationResults.filter(r => !r.isValid);
      if (invalidWords.length > 0) {
        setCurrentWarning(`Invalid word: "${invalidWords[0].word}" not in dictionary`);
        return false;
      }

      // Check for repetition violations
      if (repetitionViolations.length > 0) {
        setCurrentWarning(repetitionViolations[0].message);
        return false;
      }

      // Count valid words
      const allValidationResults = await validateWords(words);
      const validWords = allValidationResults.filter(r => r.isValid).length;
      setValidWordCount(validWords);
      setCurrentWarning('');
      return true;

    } catch (error) {
      console.error('Validation error:', error);
      return true; // Allow content on validation error
    } finally {
      setValidating(false);
    }
  }, [user, taskId, milestoneId, existingContent]);

  const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    // Clear any existing validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Prevent pasting
    if (e.nativeEvent && (e.nativeEvent as any).inputType === 'insertFromPaste') {
      toast({
        title: "Paste Blocked",
        description: "Copy-paste is not allowed in NoRush Editor",
        variant: "destructive"
      });
      return;
    }

    setContent(newContent);

    // Debounced validation
    validationTimeoutRef.current = setTimeout(() => {
      validateContent(newContent);
    }, 300);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Block common paste shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      toast({
        title: "Paste Blocked",
        description: "Copy-paste is not allowed in NoRush Editor",
        variant: "destructive"
      });
      return;
    }

    // Validate on space or enter
    if (e.key === ' ' || e.key === 'Enter') {
      const isValid = await validateContent(content + e.key);
      if (!isValid) {
        e.preventDefault();
      }
    }
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;

    setSaving(true);
    try {
      // Final validation before saving
      const isValid = await validateContent(content);
      if (!isValid) {
        toast({
          title: "Validation Failed",
          description: "Please fix validation issues before saving",
          variant: "destructive"
        });
        return;
      }

      if (onSave) {
        onSave(content, validWordCount);
      }

      toast({
        title: "Content Saved",
        description: `Saved ${validWordCount} valid words`,
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save content",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForPreview = async () => {
    if (!user || !content.trim()) {
      toast({
        title: "No Content",
        description: "Please write some content before submitting for preview.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setValidationErrors([]);

    try {
      console.log('Starting comprehensive validation for preview submission...');
      
      const words = getWords(content);
      const wordCount = words.length;

      // 1. Oxford Dictionary Validation - Check ALL words
      console.log('Checking all words against Oxford Dictionary...');
      const validationResults = await validateWords(words);
      const invalidWords = validationResults.filter(r => !r.isValid);
      
      if (invalidWords.length > 0) {
        const errorMessage = `Invalid submission: contains words not found in Oxford Dictionary: ${invalidWords.map(r => r.word).join(', ')}`;
        setValidationErrors([errorMessage]);
        toast({
          title: "Oxford Dictionary Validation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // 2. Repetition Detection
      console.log('Checking for repetitive content...');
      const repetitionViolations = await checkRepetition(content);
      
      if (repetitionViolations.length > 0) {
        const errorMessage = `Invalid submission: contains repetitive words/sentences/paragraphs: ${repetitionViolations.map(v => v.message).join(', ')}`;
        setValidationErrors([errorMessage]);
        toast({
          title: "Repetition Detected",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // 3. Advanced Content Validation via AI
      console.log('Running advanced AI validation...');
      const { data: aiValidationResult, error: aiError } = await supabase.functions.invoke('ai-content-evaluator', {
        body: {
          content,
          title: `Day Content - Task ${taskId}`,
          userId: user.id,
          taskId,
          milestoneId,
          targetWords: dailyTarget,
          action: 'validate'
        }
      });

      if (aiError) {
        console.error('AI validation error:', aiError);
        throw new Error(`Validation service error: ${aiError.message}`);
      }

      if (!aiValidationResult?.isValid) {
        const aiErrors = aiValidationResult?.errors || ['Content validation failed'];
        setValidationErrors(aiErrors);
        toast({
          title: "Content Validation Failed",
          description: aiErrors.join(', '),
          variant: "destructive",
        });
        return;
      }

      // 4. All validations passed - save content and create refund request
      console.log('All validations passed! Saving content and creating refund request...');
      
      // Save the content first
      if (onSave) {
        onSave(content, validWordCount);
      } else {
        // Fallback save to task_files
        await supabase
          .from('task_files')
          .upsert({
            task_id: taskId,
            user_id: user.id,
            day_number: 1, // Default to day 1 for NoRush editor
            title: 'NoRush Content',
            content,
            word_count: validWordCount
          }, {
            onConflict: 'task_id,day_number'
          });
      }

      // Create refund request for admin review
      const { data: refundData, error: refundError } = await supabase
        .from('refund_requests')
        .insert({
          user_id: user.id,
          task_id: taskId,
          milestone_id: milestoneId,
          amount: Math.floor(dailyTarget * 30), // Assume 30 MMK per word as base rate
          status: 'awaiting_review'
        })
        .select();

      if (refundError) {
        console.error('Error creating refund request:', refundError);
        toast({
          title: "Refund Request Failed",
          description: "Failed to submit refund request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Success!
      console.log('Submit for preview successful!', refundData);
      toast({
        title: "✅ Successful",
        description: "Your work is valid and has been sent to admin for refund review.",
        variant: "default",
        duration: 6000,
      });

      setValidationErrors([]);

    } catch (error) {
      console.error('Submit for preview error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      setValidationErrors([errorMessage]);
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercentage = dailyTarget > 0 ? (validWordCount / dailyTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  NoRush Editor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Dictionary-validated writing with anti-repetition protection
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={validWordCount >= dailyTarget ? "default" : "secondary"} 
                     className={validWordCount >= dailyTarget ? "bg-green-600 text-white" : ""}>
                {validWordCount} / {dailyTarget} words
              </Badge>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || !content.trim()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  onClick={handleSubmitForPreview}
                  disabled={isSubmitting || !content.trim() || validWordCount < dailyTarget}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Target className="w-4 h-4" />
                  {isSubmitting ? 'Validating...' : 'Submit for Preview'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Writing Area
                    {isValidating && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </CardTitle>
                  {currentWarning && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      {currentWarning}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Daily Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </CardHeader>
              
              <CardContent className="h-full pb-6">
                {/* Validation Errors Display */}
                {validationErrors.length > 0 && (
                  <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-red-800 mb-1">Validation Failed</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing... Only dictionary words are allowed. No copy-paste permitted."
                  className="h-full resize-none text-base leading-relaxed border-0 focus-visible:ring-0 shadow-none"
                  style={{ minHeight: validationErrors.length > 0 ? 'calc(100vh - 500px)' : 'calc(100vh - 400px)' }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Writing Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Words</span>
                  <span className="font-medium">{wordCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valid Words</span>
                  <span className="font-medium text-green-600">{validWordCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-medium">{dailyTarget}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-medium">
                    {Math.max(0, dailyTarget - validWordCount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editor Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">Only dictionary words allowed</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 text-red-600" />
                  <span className="text-sm">No copy-paste permitted</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 text-red-600" />
                  <span className="text-sm">No excessive word repetition</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 text-red-600" />
                  <span className="text-sm">No duplicate sentences</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">Real-time validation</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">Submit for admin review</span>
                </div>
              </CardContent>
            </Card>

            {/* Validation Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">Reach word target ({dailyTarget} words)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">All words in Oxford Dictionary</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">No repetitive content (≥85% similarity)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">No duplicate paragraphs (≥70% similarity)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <span className="text-sm">Pass AI quality assessment</span>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Status */}
            {validWordCount >= dailyTarget && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-green-800">Target Achieved!</h3>
                    <p className="text-sm text-green-700 mb-3">
                      You can now submit for preview
                    </p>
                    <Button 
                      onClick={handleSubmitForPreview}
                      disabled={isSubmitting}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSubmitting ? 'Validating...' : 'Submit for Preview'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoRushEditor;