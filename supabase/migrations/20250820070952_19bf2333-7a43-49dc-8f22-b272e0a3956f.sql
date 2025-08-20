-- Create signup_requests table to store user registration data
CREATE TABLE public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  kpay_name TEXT,
  kpay_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert signup requests
CREATE POLICY "Anyone can submit signup requests" 
ON public.signup_requests 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow authenticated users to view all signup requests (for admin purposes)
CREATE POLICY "Authenticated users can view signup requests" 
ON public.signup_requests 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_signup_requests_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint on email to prevent duplicate signups
ALTER TABLE public.signup_requests ADD CONSTRAINT unique_email UNIQUE (email);