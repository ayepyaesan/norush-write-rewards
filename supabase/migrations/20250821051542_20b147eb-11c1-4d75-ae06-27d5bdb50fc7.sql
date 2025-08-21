-- Create task_files table for storing writing content
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one file per task per day
  UNIQUE(task_id, day_number)
);

-- Enable Row Level Security
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own task files" 
ON public.task_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task files" 
ON public.task_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task files" 
ON public.task_files 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger to automatically update word count and updated_at
CREATE OR REPLACE FUNCTION public.update_task_file_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update word count based on content
  NEW.word_count := array_length(
    string_to_array(trim(regexp_replace(NEW.content, '<[^>]*>', '', 'g')), ' '), 
    1
  );
  
  -- If content is empty, set word count to 0
  IF NEW.content IS NULL OR trim(regexp_replace(NEW.content, '<[^>]*>', '', 'g')) = '' THEN
    NEW.word_count := 0;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic word count and timestamp updates
CREATE TRIGGER update_task_files_word_count
  BEFORE INSERT OR UPDATE ON public.task_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_file_word_count();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_task_files_user_task ON public.task_files(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_day ON public.task_files(task_id, day_number);