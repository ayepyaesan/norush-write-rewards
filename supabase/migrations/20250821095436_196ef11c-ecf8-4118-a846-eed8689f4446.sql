-- Add status column to profiles table for better user management
ALTER TABLE public.profiles 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Update existing records to have proper status based on has_access
UPDATE public.profiles 
SET status = CASE 
  WHEN has_access = true THEN 'active'
  WHEN has_access = false THEN 'suspended'
  ELSE 'active'
END;

-- Make status not nullable after setting default values
ALTER TABLE public.profiles 
ALTER COLUMN status SET NOT NULL;

-- Create index for performance on status queries
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Create index for combined status and role queries
CREATE INDEX idx_profiles_status_role ON public.profiles(status, role);