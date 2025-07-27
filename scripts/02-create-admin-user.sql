-- Insert admin user
INSERT INTO public.users (email, name, password_hash, is_admin) 
VALUES ('admin@gmail.com', 'Admin', 'admin123', TRUE)
ON CONFLICT (email) DO NOTHING;
