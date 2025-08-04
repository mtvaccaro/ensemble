-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables in reverse dependency order for clean recreation
DROP TABLE IF EXISTS public.clips CASCADE;
DROP TABLE IF EXISTS public.episodes CASCADE;
DROP TABLE IF EXISTS public.podcasts CASCADE;

-- Create podcasts table
CREATE TABLE IF NOT EXISTS public.podcasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    feed_url TEXT NOT NULL UNIQUE,
    image_url TEXT,
    author TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    categories TEXT[] DEFAULT '{}',
    episode_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    image_url TEXT,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clips table
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time INTEGER NOT NULL, -- in seconds
    end_time INTEGER NOT NULL, -- in seconds
    duration INTEGER NOT NULL, -- in seconds
    audio_url TEXT,
    transcript TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_podcasts_feed_url;
DROP INDEX IF EXISTS idx_episodes_podcast_id;
DROP INDEX IF EXISTS idx_episodes_published_at;
DROP INDEX IF EXISTS idx_clips_user_id;
DROP INDEX IF EXISTS idx_clips_episode_id;
DROP INDEX IF EXISTS idx_clips_created_at;

-- Create indexes for performance
CREATE INDEX idx_podcasts_feed_url ON public.podcasts(feed_url);
CREATE INDEX idx_episodes_podcast_id ON public.episodes(podcast_id);
CREATE INDEX idx_episodes_published_at ON public.episodes(published_at);
CREATE INDEX idx_clips_user_id ON public.clips(user_id);
CREATE INDEX idx_clips_episode_id ON public.clips(episode_id);
CREATE INDEX idx_clips_created_at ON public.clips(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Only authenticated users can insert podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Only authenticated users can update podcasts" ON public.podcasts;

DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;
DROP POLICY IF EXISTS "Only authenticated users can insert episodes" ON public.episodes;
DROP POLICY IF EXISTS "Only authenticated users can update episodes" ON public.episodes;

DROP POLICY IF EXISTS "Users can view their own clips" ON public.clips;
DROP POLICY IF EXISTS "Users can insert their own clips" ON public.clips;
DROP POLICY IF EXISTS "Users can update their own clips" ON public.clips;
DROP POLICY IF EXISTS "Users can delete their own clips" ON public.clips;

-- Create RLS policies for podcasts table (public read, admin write)
CREATE POLICY "Anyone can view podcasts" ON public.podcasts
    FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert podcasts" ON public.podcasts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update podcasts" ON public.podcasts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for episodes table (public read, admin write)
CREATE POLICY "Anyone can view episodes" ON public.episodes
    FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert episodes" ON public.episodes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update episodes" ON public.episodes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for clips table (user-specific)
CREATE POLICY "Users can view their own clips" ON public.clips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clips" ON public.clips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clips" ON public.clips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clips" ON public.clips
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_podcasts_updated_at ON public.podcasts;
DROP TRIGGER IF EXISTS handle_episodes_updated_at ON public.episodes;
DROP TRIGGER IF EXISTS handle_clips_updated_at ON public.clips;

-- Create triggers for updated_at
CREATE TRIGGER handle_podcasts_updated_at
    BEFORE UPDATE ON public.podcasts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_episodes_updated_at
    BEFORE UPDATE ON public.episodes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_clips_updated_at
    BEFORE UPDATE ON public.clips
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Clear existing sample data and insert fresh data
DELETE FROM public.podcasts WHERE feed_url LIKE 'https://feeds.example.com%';

-- Insert some sample data for testing
INSERT INTO public.podcasts (title, description, feed_url, author, language, categories) VALUES
('Tech Talk Daily', 'Daily insights into the world of technology', 'https://feeds.example.com/techtalkdaily', 'Tech Media Inc', 'en', ARRAY['Technology', 'News']),
('Engineering Insights', 'Deep dives into software engineering topics', 'https://feeds.example.com/engineeringinsights', 'Code Academy', 'en', ARRAY['Technology', 'Education']),
('Founder Stories', 'Stories from successful entrepreneurs', 'https://feeds.example.com/founderstories', 'Startup Network', 'en', ARRAY['Business', 'Entrepreneurship']); 