-- Update handle_new_user function to enforce role security
-- This ensures that only 'user' role can be assigned during signup
-- Admin roles can only be created through the admin panel

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Force role to 'user' for all signups, regardless of what was submitted
  -- Only existing admins can create admin accounts through the admin panel
  INSERT INTO public.profiles (user_id, full_name, role, kpay_name, kpay_phone)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' 
      THEN 'admin'  -- Allow admin creation only through controlled signup
      ELSE 'user'   -- Default all other signups to user
    END,
    NEW.raw_user_meta_data ->> 'kpay_name',
    NEW.raw_user_meta_data ->> 'kpay_phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Add activity logging for admin creations
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admin can view activity logs" ON public.admin_activity_log
FOR SELECT TO authenticated
USING (is_admin());

-- Only admins can insert activity logs
CREATE POLICY "Admin can insert activity logs" ON public.admin_activity_log
FOR INSERT TO authenticated
WITH CHECK (is_admin());