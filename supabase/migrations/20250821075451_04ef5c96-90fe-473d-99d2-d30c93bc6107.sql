-- Fix search_path security issue for complete_refund function
CREATE OR REPLACE FUNCTION public.complete_refund(
  p_refund_request_id UUID,
  p_admin_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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