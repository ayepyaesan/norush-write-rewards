-- Create task_files table for daily editors
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL, -- 0 for main editor, 1+ for daily editors
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, day_number) -- Ensure one file per day per task
);

-- Enable RLS
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_files
CREATE POLICY "Users can view their own task files" ON public.task_files
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task files" ON public.task_files
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task files" ON public.task_files
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create deposits table for payment tracking
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- in MMK
  payment_method TEXT DEFAULT 'kpay',
  screenshot_url TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID, -- admin who verified
  verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "Users can view their own deposits" ON public.deposits
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits" ON public.deposits
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposits" ON public.deposits
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits" ON public.deposits
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all deposits" ON public.deposits
FOR UPDATE 
USING (is_admin());

-- Create daily_milestones table for tracking daily progress and refunds
CREATE TABLE IF NOT EXISTS public.daily_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  target_date DATE NOT NULL,
  required_words INTEGER NOT NULL,
  words_written INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, carried_forward
  refund_amount INTEGER DEFAULT 0, -- in MMK
  refund_status TEXT DEFAULT 'pending', -- pending, eligible, paid
  content_validated BOOLEAN DEFAULT false, -- AI validation passed
  validation_notes TEXT,
  words_carried_forward INTEGER DEFAULT 0, -- words from previous days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, day_number)
);

-- Enable RLS
ALTER TABLE public.daily_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_milestones
CREATE POLICY "Users can view their own milestones" ON public.daily_milestones
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones" ON public.daily_milestones
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create milestones" ON public.daily_milestones
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all milestones" ON public.daily_milestones
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all milestones" ON public.daily_milestones
FOR UPDATE 
USING (is_admin());

-- Create function to generate daily milestones when task is created
CREATE OR REPLACE FUNCTION public.generate_daily_milestones(
  p_task_id UUID,
  p_user_id UUID,
  p_word_count INTEGER,
  p_duration_days INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_words INTEGER;
  target_date DATE;
  i INTEGER;
BEGIN
  -- Calculate words per day
  daily_words := CEIL(p_word_count::FLOAT / p_duration_days);
  
  -- Generate milestone entries for each day
  FOR i IN 1..p_duration_days LOOP
    target_date := p_start_date + (i - 1 || ' days')::INTERVAL;
    
    INSERT INTO public.daily_milestones (
      task_id,
      user_id,
      day_number,
      target_date,
      required_words,
      refund_amount
    ) VALUES (
      p_task_id,
      p_user_id,
      i,
      target_date,
      daily_words,
      FLOOR(
        (SELECT deposit_amount FROM public.tasks WHERE id = p_task_id) / p_duration_days
      )
    );
  END LOOP;
END;
$$;

-- Function to update task_files word count automatically
CREATE OR REPLACE FUNCTION public.update_task_file_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update word count based on content
  NEW.word_count := array_length(
    string_to_array(trim(regexp_replace(NEW.content, '\s+', ' ', 'g')), ' '), 
    1
  );
  
  -- If content is empty, set word count to 0
  IF NEW.content IS NULL OR trim(NEW.content) = '' THEN
    NEW.word_count := 0;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic word count updates
CREATE TRIGGER update_task_file_word_count_trigger
BEFORE INSERT OR UPDATE OF content ON public.task_files
FOR EACH ROW
EXECUTE FUNCTION public.update_task_file_word_count();

-- Function to sync daily content to main editor
CREATE OR REPLACE FUNCTION public.sync_main_editor()
RETURNS TRIGGER AS $$
DECLARE
  main_content TEXT := '';
  daily_file RECORD;
BEGIN
  -- Only proceed if this is a daily file (day_number > 0)
  IF NEW.day_number > 0 THEN
    -- Aggregate all daily content in order
    FOR daily_file IN 
      SELECT content, day_number 
      FROM public.task_files 
      WHERE task_id = NEW.task_id 
      AND day_number > 0 
      ORDER BY day_number
    LOOP
      IF daily_file.content IS NOT NULL AND trim(daily_file.content) != '' THEN
        main_content := main_content || E'\n\n--- Day ' || daily_file.day_number || E' ---\n' || daily_file.content;
      END IF;
    END LOOP;
    
    -- Update or create main editor file (day_number = 0)
    INSERT INTO public.task_files (task_id, user_id, day_number, title, content)
    VALUES (NEW.task_id, NEW.user_id, 0, 'Main Editor', main_content)
    ON CONFLICT (task_id, day_number)
    DO UPDATE SET 
      content = EXCLUDED.content,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync content to main editor
CREATE TRIGGER sync_main_editor_trigger
AFTER INSERT OR UPDATE OF content ON public.task_files
FOR EACH ROW
EXECUTE FUNCTION public.sync_main_editor();

-- Add updated_at trigger for task_files
CREATE TRIGGER update_task_files_updated_at
BEFORE UPDATE ON public.task_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for deposits
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for daily_milestones
CREATE TRIGGER update_daily_milestones_updated_at
BEFORE UPDATE ON public.daily_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();