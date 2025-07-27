-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_seen ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can insert reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view seen status" ON public.message_seen;
DROP POLICY IF EXISTS "Users can insert seen status" ON public.message_seen;

-- Create policies for users table
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own data" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (true);

-- Create policies for messages table
CREATE POLICY "Users can view messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete messages" ON public.messages FOR DELETE USING (true);

-- Create policies for reactions table
CREATE POLICY "Users can view reactions" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert reactions" ON public.message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their reactions" ON public.message_reactions FOR DELETE USING (true);

-- Create policies for seen table
CREATE POLICY "Users can view seen status" ON public.message_seen FOR SELECT USING (true);
CREATE POLICY "Users can insert seen status" ON public.message_seen FOR INSERT WITH CHECK (true);
