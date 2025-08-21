-- Fix security vulnerability: Restrict contact messages viewing to admin users only
-- Drop the existing policy that allows all authenticated users to view contact messages
DROP POLICY "Authenticated users can view all contact messages" ON public.contact_messages;

-- Create new policy that only allows admin users to view contact messages
CREATE POLICY "Only admins can view contact messages" 
ON public.contact_messages 
FOR SELECT 
USING (is_admin());

-- Keep the existing insert policy unchanged so anyone can still submit contact messages
-- This ensures the contact form functionality continues to work