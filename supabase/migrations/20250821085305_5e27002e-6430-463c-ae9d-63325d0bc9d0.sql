-- Add columns to daily_milestones for AI evaluation and rule compliance
ALTER TABLE public.daily_milestones 
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'target_met', 'target_not_met')),
ADD COLUMN IF NOT EXISTS rule_compliance JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
ADD COLUMN IF NOT EXISTS content_quality_score INTEGER CHECK (content_quality_score >= 0 AND content_quality_score <= 100),
ADD COLUMN IF NOT EXISTS words_deficit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_day_target INTEGER,
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paste_attempts INTEGER DEFAULT 0;

-- Create table for tracking daily evaluations
CREATE TABLE IF NOT EXISTS public.daily_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  milestone_id UUID NOT NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_analyzed TEXT NOT NULL,
  word_count_actual INTEGER NOT NULL,
  word_count_target INTEGER NOT NULL,
  rule_violations JSONB DEFAULT '[]',
  quality_checks JSONB DEFAULT '{}',
  ai_verdict TEXT NOT NULL CHECK (ai_verdict IN ('target_met', 'target_not_met')),
  ai_reasoning TEXT,
  flagged_issues JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on daily_evaluations table
ALTER TABLE public.daily_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_evaluations
CREATE POLICY "Users can view their own evaluations" 
ON public.daily_evaluations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluations" 
ON public.daily_evaluations 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can create evaluations" 
ON public.daily_evaluations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update evaluations" 
ON public.daily_evaluations 
FOR UPDATE 
USING (is_admin());

-- Create function to calculate next day target with carry-over deficit
CREATE OR REPLACE FUNCTION public.calculate_next_day_target(
  p_task_id UUID,
  p_current_day INTEGER,
  p_words_written INTEGER,
  p_daily_target INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deficit INTEGER := 0;
  base_daily_words INTEGER;
  remaining_days INTEGER;
  total_task_words INTEGER;
BEGIN
  -- Get task details
  SELECT word_count, duration_days 
  INTO total_task_words, remaining_days
  FROM public.tasks 
  WHERE id = p_task_id;
  
  -- Calculate base daily words
  base_daily_words := CEIL(total_task_words::FLOAT / remaining_days);
  
  -- Calculate deficit from current day
  deficit := GREATEST(0, p_daily_target - p_words_written);
  
  -- Return base target plus any deficit
  RETURN base_daily_words + deficit;
END;
$$;

-- Create trigger to update updated_at on daily_evaluations
CREATE TRIGGER update_daily_evaluations_updated_at
  BEFORE UPDATE ON public.daily_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();