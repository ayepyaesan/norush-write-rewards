-- Create refund requests table to track admin refund actions
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  milestone_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_review', -- awaiting_review, refund_sent, completed
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for refund_requests
CREATE POLICY "Users can view their own refund requests" 
ON public.refund_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create refund requests" 
ON public.refund_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all refund requests" 
ON public.refund_requests 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all refund requests" 
ON public.refund_requests 
FOR UPDATE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create refund request when milestone is completed
CREATE OR REPLACE FUNCTION public.check_milestone_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if milestone status changed to 'completed' and words_written meets target
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND 
     NEW.words_written >= NEW.required_words THEN
    
    -- Create refund request
    INSERT INTO public.refund_requests (
      user_id,
      task_id,
      milestone_id,
      amount,
      status
    ) VALUES (
      NEW.user_id,
      NEW.task_id,
      NEW.id,
      NEW.refund_amount,
      'awaiting_review'
    );
    
    -- Update milestone refund status
    NEW.refund_status := 'awaiting_review';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for milestone completion check
CREATE TRIGGER milestone_completion_trigger
BEFORE UPDATE ON public.daily_milestones
FOR EACH ROW
EXECUTE FUNCTION public.check_milestone_completion();