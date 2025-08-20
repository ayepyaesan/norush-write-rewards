-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_screenshots', 'payment_screenshots', true);

-- Create policies for payment screenshots storage
CREATE POLICY "Users can upload their own screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment_screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own screenshots" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payment_screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public access to payment screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment_screenshots');