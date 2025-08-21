-- Add total_refund_earned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN total_refund_earned INTEGER DEFAULT 0;

-- Create refund_history table to track all refund transactions
CREATE TABLE public.refund_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  refund_request_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  refund_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_review',
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on refund_history table
ALTER TABLE public.refund_history ENABLE ROW LEVEL SECURITY;

-- Create policies for refund_history table
CREATE POLICY "Users can view their own refund history" 
ON public.refund_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create refund history" 
ON public.refund_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all refund history" 
ON public.refund_history 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all refund history" 
ON public.refund_history 
FOR UPDATE 
USING (is_admin());

-- Create function to handle refund completion
CREATE OR REPLACE FUNCTION public.complete_refund(
  p_refund_request_id UUID,
  p_admin_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  refund_record RECORD;
  milestone_record RECORD;
BEGIN
  -- Get refund request details
  SELECT * INTO refund_record 
  FROM public.refund_requests 
  WHERE id = p_refund_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund request not found';
  END IF;
  
  -- Get milestone details
  SELECT * INTO milestone_record 
  FROM public.daily_milestones 
  WHERE id = refund_record.milestone_id;
  
  -- Update refund request status
  UPDATE public.refund_requests 
  SET 
    status = 'completed',
    processed_at = now(),
    processed_by = p_admin_user_id
  WHERE id = p_refund_request_id;
  
  -- Add to refund history
  INSERT INTO public.refund_history (
    user_id,
    task_id,
    refund_request_id,
    day_number,
    refund_amount,
    status,
    processed_at,
    processed_by
  ) VALUES (
    refund_record.user_id,
    refund_record.task_id,
    refund_record.id,
    milestone_record.day_number,
    refund_record.amount,
    'received',
    now(),
    p_admin_user_id
  );
  
  -- Update user's total refund earned
  UPDATE public.profiles 
  SET total_refund_earned = total_refund_earned + refund_record.amount
  WHERE user_id = refund_record.user_id;
  
END;
$$;

-- Create trigger to update refund_history updated_at
CREATE TRIGGER update_refund_history_updated_at
BEFORE UPDATE ON public.refund_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();