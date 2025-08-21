import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, Calendar, Target, TrendingUp, CheckCircle,
  AlertCircle, Clock, FileText, ArrowLeft, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  duration_days: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  deadline: string | null;
}

interface TaskFile {
  id: string;
  task_id: string;
  day_number: number;
  title: string;
  content: string;
  word_count: number;
  updated_at: string;
}

interface DailyMilestone {
  id: string;
  task_id: string;
  day_number: number;
  target_date: string;
  required_words: number;
  words_written: number;
  words_carried_forward: number;
  status: string;
  refund_amount: number;
  refund_status: string;
}

interface TaskEditorProps {
  taskId: string;
}

const TaskEditor = ({ taskId }: TaskEditorProps) => {
  const [task, setTask] = useState<Task | null>(null);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [dailyMilestones, setDailyMilestones] = useState<DailyMilestone[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [currentContent, setCurrentContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mainEditorContent, setMainEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState("daily");
  const { toast } = useToast();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  useEffect(() => {
    if (taskFiles.length > 0 && activeDay > 0) {
      const dayFile = taskFiles.find(file => file.day_number === activeDay);
      setCurrentContent(dayFile?.content || "");
    }
  }, [activeDay, taskFiles]);

  useEffect(() => {
    syncMainEditor();
  }, [taskFiles]);

  const loadTaskData = async () => {
    try {
      // Load task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Load task files
      const { data: filesData, error: filesError } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', taskId)
        .order('day_number');

      if (filesError) throw filesError;

      // If no files exist, generate them
      if (!filesData || filesData.length === 0) {
        await generateDailyFiles(taskData);
      } else {
        setTaskFiles(filesData);
      }

      // Load daily milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('daily_milestones')
        .select('*')
        .eq('task_id', taskId)
        .order('day_number');

      if (milestonesError) throw milestonesError;
      
      if (!milestonesData || milestonesData.length === 0) {
        await generateDailyMilestones(taskData);
      } else {
        setDailyMilestones(milestonesData);
      }

    } catch (error) {
      console.error('Error loading task data:', error);
      toast({
        title: "Error",
        description: "Failed to load task data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateDailyFiles = async (taskData: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filesToCreate = [];
      
      // Create main editor file (day 0)
      filesToCreate.push({
        task_id: taskId,
        user_id: user.id,
        day_number: 0,
        title: "Main Editor",
        content: "",
        word_count: 0
      });

      // Create daily files
      for (let day = 1; day <= taskData.duration_days; day++) {
        filesToCreate.push({
          task_id: taskId,
          user_id: user.id,
          day_number: day,
          title: `Day ${day}`,
          content: "",
          word_count: 0
        });
      }

      const { data: createdFiles, error } = await supabase
        .from('task_files')
        .insert(filesToCreate)
        .select();

      if (error) throw error;
      setTaskFiles(createdFiles);
    } catch (error) {
      console.error('Error generating daily files:', error);
    }
  };

  const generateDailyMilestones = async (taskData: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dailyWords = Math.ceil(taskData.word_count / taskData.duration_days);
      const dailyRefund = Math.floor(taskData.deposit_amount / taskData.duration_days);
      
      const milestonesToCreate = [];
      const startDate = new Date();

      for (let day = 1; day <= taskData.duration_days; day++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + (day - 1));

        milestonesToCreate.push({
          task_id: taskId,
          user_id: user.id,
          day_number: day,
          target_date: targetDate.toISOString().split('T')[0],
          required_words: dailyWords,
          words_written: 0,
          words_carried_forward: 0,
          status: 'pending',
          refund_amount: dailyRefund,
          refund_status: 'pending'
        });
      }

      const { data: createdMilestones, error } = await supabase
        .from('daily_milestones')
        .insert(milestonesToCreate)
        .select();

      if (error) throw error;
      setDailyMilestones(createdMilestones);
    } catch (error) {
      console.error('Error generating daily milestones:', error);
    }
  };

  const syncMainEditor = () => {
    if (taskFiles.length === 0) return;

    const dailyFiles = taskFiles.filter(file => file.day_number > 0).sort((a, b) => a.day_number - b.day_number);
    let combinedContent = "";

    dailyFiles.forEach(file => {
      if (file.content && file.content.trim()) {
        combinedContent += `\n\n--- Day ${file.day_number} ---\n${file.content}`;
      }
    });

    setMainEditorContent(combinedContent.trim());
  };

  const handleContentChange = (content: string) => {
    setCurrentContent(content);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Copy-pasting is not allowed. Please type your content.",
      variant: "destructive",
    });
  };

  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).length;
  };

  const saveContent = async () => {
    if (!task || activeDay === 0) return;

    setIsSaving(true);
    try {
      const wordCount = countWords(currentContent);
      
      // Update task file
      const { error: fileError } = await supabase
        .from('task_files')
        .update({
          content: currentContent,
          word_count: wordCount,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId)
        .eq('day_number', activeDay);

      if (fileError) throw fileError;

      // Update daily milestone
      const { error: milestoneError } = await supabase
        .from('daily_milestones')
        .update({
          words_written: wordCount,
          status: wordCount >= getDailyTarget(activeDay) ? 'completed' : 'pending'
        })
        .eq('task_id', taskId)
        .eq('day_number', activeDay);

      if (milestoneError) throw milestoneError;

      // Update local state
      setTaskFiles(prev => prev.map(file => 
        file.day_number === activeDay 
          ? { ...file, content: currentContent, word_count: wordCount }
          : file
      ));

      setDailyMilestones(prev => prev.map(milestone =>
        milestone.day_number === activeDay
          ? { 
              ...milestone, 
              words_written: wordCount,
              status: wordCount >= getDailyTarget(activeDay) ? 'completed' : 'pending'
            }
          : milestone
      ));

      toast({
        title: "Saved Successfully",
        description: `Day ${activeDay} content saved with ${wordCount} words`,
      });

    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDailyTarget = (day: number): number => {
    if (!task) return 0;
    
    const milestone = dailyMilestones.find(m => m.day_number === day);
    if (milestone) {
      return milestone.required_words + milestone.words_carried_forward;
    }
    
    return Math.ceil(task.word_count / task.duration_days);
  };

  const getCurrentWordCount = (): number => {
    return countWords(currentContent);
  };

  const getTotalWordsWritten = (): number => {
    return taskFiles
      .filter(file => file.day_number > 0)
      .reduce((total, file) => total + (file.word_count || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Task Not Found</CardTitle>
            <CardDescription>The requested task could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{task.task_name}</h1>
              <p className="text-muted-foreground">Writing Task Editor</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {task.status}
          </Badge>
        </div>

        {/* Progress Overview */}
        <Card className="gradient-card border-0 shadow-warm mb-6">
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getTotalWordsWritten()}</div>
                <div className="text-sm text-muted-foreground">Words Written</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{task.word_count}</div>
                <div className="text-sm text-muted-foreground">Total Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{getDailyTarget(activeDay)}</div>
                <div className="text-sm text-muted-foreground">Today's Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((getTotalWordsWritten() / task.word_count) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Completion</div>
              </div>
            </div>
            <Progress 
              value={Math.min((getTotalWordsWritten() / task.word_count) * 100, 100)} 
              className="h-3" 
            />
          </CardContent>
        </Card>

        {/* Main Editor Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily Editors</TabsTrigger>
            <TabsTrigger value="main">Main Editor</TabsTrigger>
            <TabsTrigger value="progress">Progress Track</TabsTrigger>
          </TabsList>

          {/* Daily Editors Tab */}
          <TabsContent value="daily" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Daily Writing Pages</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Current Day:</span>
                    <Badge variant="outline">Day {activeDay}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Day Navigation */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: task.duration_days }, (_, i) => i + 1).map((day) => {
                    const milestone = dailyMilestones.find(m => m.day_number === day);
                    const isCompleted = milestone?.status === 'completed';
                    
                    return (
                      <Button
                        key={day}
                        variant={activeDay === day ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveDay(day)}
                        className="flex items-center gap-2"
                      >
                        {isCompleted && <CheckCircle className="w-3 h-3" />}
                        Day {day}
                      </Button>
                    );
                  })}
                </div>

                {/* Daily Target Info */}
                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-primary">{getCurrentWordCount()}</div>
                      <div className="text-sm text-muted-foreground">Current Words</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-accent">{getDailyTarget(activeDay)}</div>
                      <div className="text-sm text-muted-foreground">Target Words</div>
                    </div>
                    <div>
                      <div className={`text-lg font-semibold ${
                        getCurrentWordCount() >= getDailyTarget(activeDay) ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {getCurrentWordCount() >= getDailyTarget(activeDay) ? 'Target Met!' : 'Keep Writing'}
                      </div>
                      <div className="text-sm text-muted-foreground">Status</div>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min((getCurrentWordCount() / getDailyTarget(activeDay)) * 100, 100)} 
                    className="h-2 mt-3" 
                  />
                </div>

                {/* Text Editor */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Day {activeDay} Content</label>
                    <Button 
                      onClick={saveContent} 
                      disabled={isSaving}
                      className="gradient-warm hover-lift flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={currentContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={`Start writing for Day ${activeDay}... Remember, no copy-pasting allowed!`}
                    className="min-h-[400px] resize-none"
                  />
                  <div className="text-xs text-muted-foreground">
                    💡 Tip: Paste is disabled - you must type all content to ensure authenticity.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Main Editor Tab */}
          <TabsContent value="main" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Main Editor (Read-Only)</CardTitle>
                </div>
                <CardDescription>
                  This automatically syncs all content from your daily writing pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={mainEditorContent}
                  readOnly
                  className="min-h-[500px] resize-none bg-muted/50"
                  placeholder="Your daily content will appear here automatically as you write..."
                />
                <div className="text-xs text-muted-foreground mt-2">
                  📝 This content is automatically compiled from all your daily writing pages
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Track Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-4">
              {dailyMilestones.map((milestone) => {
                const isToday = milestone.target_date === new Date().toISOString().split('T')[0];
                const isPast = new Date(milestone.target_date) < new Date();
                
                return (
                  <Card key={milestone.id} className={`gradient-card border-0 shadow-warm ${
                    isToday ? 'ring-2 ring-primary' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            milestone.status === 'completed' ? 'default' : 
                            isPast ? 'destructive' : 'secondary'
                          }>
                            {milestone.status === 'completed' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                             isPast ? <AlertCircle className="w-3 h-3 mr-1" /> : 
                             <Clock className="w-3 h-3 mr-1" />}
                            Day {milestone.day_number}
                          </Badge>
                          <div>
                            <div className="font-medium">
                              {new Date(milestone.target_date).toLocaleDateString()}
                              {isToday && <span className="text-primary ml-2">(Today)</span>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {milestone.words_written} / {milestone.required_words + milestone.words_carried_forward} words
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-success">
                            {milestone.refund_status === 'approved' ? 
                              `+${milestone.refund_amount} MMK` : 
                              milestone.status === 'completed' ? 
                                `${milestone.refund_amount} MMK (Pending)` : 
                                `${milestone.refund_amount} MMK`
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {milestone.refund_status === 'approved' ? 'Refund Approved' : 
                             milestone.status === 'completed' ? 'Awaiting Review' : 
                             'Not Eligible'}
                          </div>
                        </div>
                      </div>
                      {milestone.words_carried_forward > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                          +{milestone.words_carried_forward} words carried forward from previous day
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TaskEditor;