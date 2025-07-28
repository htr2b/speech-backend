
CREATE TYPE user_role AS ENUM ('free', 'pro');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    auth_user_id uuid not null unique, 
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT,
    transcript TEXT,
    summary TEXT,
    tts_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
