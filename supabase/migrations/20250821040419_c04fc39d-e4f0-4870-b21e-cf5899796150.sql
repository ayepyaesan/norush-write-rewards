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

-- Enable RLS for deposits
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

-- Enable RLS for daily_milestones
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

-- Update the deposit amount calculation rule (10 MMK per word instead of 30)
ALTER TABLE public.tasks 
ALTER COLUMN base_rate_per_word SET DEFAULT 10;