-- Fix critical security vulnerability: Restrict signup_requests access to admins only
-- Drop the existing broad SELECT policy that allows any authenticated user to view signup data
DROP POLICY IF EXISTS "Authenticated users can view signup requests" ON public.signup_requests;

-- Create a new policy that only allows admins to view signup requests
CREATE POLICY "Only admins can view signup requests" 
ON public.signup_requests 
FOR SELECT 
USING (is_admin());