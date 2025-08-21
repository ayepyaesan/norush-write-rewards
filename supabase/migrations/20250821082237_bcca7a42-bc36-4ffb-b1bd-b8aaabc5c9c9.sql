-- Create the missing refund_history table
CREATE TABLE public.refund_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  refund_request_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  refund_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.refund_history 
ADD CONSTRAINT fk_refund_history_refund_request 
FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id) ON DELETE CASCADE;

ALTER TABLE public.refund_history 
ADD CONSTRAINT fk_refund_history_task 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_refund_history_user_id ON public.refund_history(user_id);
CREATE INDEX idx_refund_history_task_id ON public.refund_history(task_id);
CREATE INDEX idx_refund_history_request_id ON public.refund_history(refund_request_id);

-- Enable Row Level Security
ALTER TABLE public.refund_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own refund history" 
ON public.refund_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all refund history" 
ON public.refund_history 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can create refund history records" 
ON public.refund_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update refund history" 
ON public.refund_history 
FOR UPDATE 
USING (is_admin());

-- Add trigger for automatic updated_at updates
CREATE TRIGGER update_refund_history_updated_at
BEFORE UPDATE ON public.refund_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the refund_history table
ALTER TABLE public.refund_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_history;