-- Add verification fields to payments table for admin review
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update payment_status enum values to include verification states
-- Current states: pending, approved, rejected
-- We'll use: pending, approved, rejected (keeping existing)

-- Add has_access column to profiles table for task gating
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_access BOOLEAN DEFAULT false;

-- Create admin policies for payments table
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all payments" 
ON public.payments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update existing user profiles to have access if they have approved payments
UPDATE public.profiles 
SET has_access = true 
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.payments 
  WHERE payment_status = 'approved'
);