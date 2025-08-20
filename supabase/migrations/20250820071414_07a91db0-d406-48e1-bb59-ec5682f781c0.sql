-- Insert default admin user
INSERT INTO public.signup_requests (
  full_name,
  email,
  password,
  role,
  kpay_name,
  kpay_phone
) VALUES (
  'Linn Latt Eain',
  'orchideain30@gmail.com',
  '12345678',
  'admin',
  NULL,
  NULL
);