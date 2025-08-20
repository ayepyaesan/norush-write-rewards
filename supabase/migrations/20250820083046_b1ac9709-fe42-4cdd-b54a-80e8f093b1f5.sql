-- Add new columns to tasks table for enhanced tracking
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS base_rate_per_word INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS refund_earned_mmk INTEGER DEFAULT 0;

-- Create daily_progress table for tracking daily writing progress
CREATE TABLE IF NOT EXISTS public.daily_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_words INTEGER NOT NULL,
  words_written INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  refund_earned_mmk INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, date)
);

-- Enable RLS for daily_progress
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_progress
CREATE POLICY "Users can view their own daily progress" 
ON public.daily_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily progress" 
ON public.daily_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily progress" 
ON public.daily_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create refunds table for tracking refund requests
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  refund_amount_mmk INTEGER NOT NULL,
  refund_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for refunds
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for refunds
CREATE POLICY "Users can view their own refunds" 
ON public.refunds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own refunds" 
ON public.refunds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to auto-generate daily progress entries
CREATE OR REPLACE FUNCTION public.generate_daily_progress_entries(
  p_task_id UUID,
  p_user_id UUID,
  p_word_count INTEGER,
  p_duration_days INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_words INTEGER;
  current_date DATE;
  i INTEGER;
BEGIN
  -- Calculate words per day
  daily_words := CEIL(p_word_count::FLOAT / p_duration_days);
  
  -- Generate entries for each day
  FOR i IN 0..(p_duration_days - 1) LOOP
    current_date := p_start_date + (i || ' days')::INTERVAL;
    
    INSERT INTO public.daily_progress (
      task_id,
      user_id,
      date,
      goal_words,
      status
    ) VALUES (
      p_task_id,
      p_user_id,
      current_date,
      daily_words,
      'pending'
    );
  END LOOP;
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_daily_progress_updated_at
BEFORE UPDATE ON public.daily_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();