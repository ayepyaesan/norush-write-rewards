-- Fix signup_requests security vulnerabilities
-- 1. Create extension for password hashing if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create a function to securely handle signup requests with password hashing
CREATE OR REPLACE FUNCTION public.create_signup_request(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'user',
  p_kpay_name TEXT DEFAULT NULL,
  p_kpay_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long';
  END IF;
  
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  
  -- Validate email format (basic check)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Force role to 'user' for security (only admins should create admin accounts)
  p_role := 'user';
  
  -- Check if email already exists in signup requests or profiles
  IF EXISTS (SELECT 1 FROM public.signup_requests WHERE email = p_email) THEN
    RAISE EXCEPTION 'Signup request already exists for this email';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = p_email) THEN
    RAISE EXCEPTION 'User already exists with this email';
  END IF;
  
  -- Insert with hashed password
  INSERT INTO public.signup_requests (
    email,
    password,
    full_name,
    role,
    kpay_name,
    kpay_phone
  ) VALUES (
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf', 12)), -- Hash password with bcrypt
    trim(p_full_name),
    p_role,
    CASE WHEN p_kpay_name = '' THEN NULL ELSE trim(p_kpay_name) END,
    CASE WHEN p_kpay_phone = '' THEN NULL ELSE trim(p_kpay_phone) END
  ) RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

-- 3. Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit signup requests" ON public.signup_requests;

-- 4. Create a new restrictive policy that prevents direct inserts
CREATE POLICY "Signup requests via function only" 
ON public.signup_requests 
FOR INSERT 
WITH CHECK (false); -- Block all direct inserts

-- 5. Grant execute permission on the function to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.create_signup_request TO authenticated, anon;