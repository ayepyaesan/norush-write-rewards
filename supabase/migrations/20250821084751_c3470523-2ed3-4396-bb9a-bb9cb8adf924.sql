-- Update the complete_refund function to also update daily_milestones.refund_status
CREATE OR REPLACE FUNCTION public.complete_refund(p_refund_request_id uuid, p_admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Update daily milestone refund status
  UPDATE public.daily_milestones 
  SET refund_status = 'completed'
  WHERE id = refund_record.milestone_id;
  
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
$function$;

-- Fix existing mismatched records where refund_requests is 'completed' but daily_milestones is still 'awaiting_review'
UPDATE public.daily_milestones 
SET refund_status = 'completed'
WHERE id IN (
  SELECT dm.id 
  FROM public.daily_milestones dm
  JOIN public.refund_requests rr ON dm.id = rr.milestone_id
  WHERE rr.status = 'completed' 
  AND dm.refund_status = 'awaiting_review'
);