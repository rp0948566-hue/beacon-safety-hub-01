-- Create storage bucket for panic mode recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'panic-recordings',
  'panic-recordings',
  false,
  104857600, -- 100MB limit per file
  ARRAY['audio/webm', 'video/webm', 'audio/mp4', 'video/mp4']
);

-- Create table to track panic mode sessions
CREATE TABLE public.panic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  recording_mode TEXT NOT NULL CHECK (recording_mode IN ('audio', 'video', 'both')),
  location_history JSONB DEFAULT '[]'::jsonb,
  emergency_contacts JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create table to track individual recordings
CREATE TABLE public.panic_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.panic_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_type TEXT NOT NULL CHECK (recording_type IN ('audio', 'video')),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on tables
ALTER TABLE public.panic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for panic_sessions
CREATE POLICY "Users can view their own panic sessions"
ON public.panic_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own panic sessions"
ON public.panic_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own panic sessions"
ON public.panic_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for panic_recordings
CREATE POLICY "Users can view their own recordings"
ON public.panic_recordings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
ON public.panic_recordings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Storage policies for panic-recordings bucket
CREATE POLICY "Users can upload their own panic recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'panic-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own panic recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'panic-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own panic recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'panic-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create indexes for better query performance
CREATE INDEX idx_panic_sessions_user_id ON public.panic_sessions(user_id);
CREATE INDEX idx_panic_recordings_session_id ON public.panic_recordings(session_id);
CREATE INDEX idx_panic_recordings_user_id ON public.panic_recordings(user_id);