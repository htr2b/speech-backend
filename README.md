# speech-backend

A Node.js/Express API for uploading, transcribing, summarizing, and managing speech data.  
Integrates Google Cloud Speech-to-Text, Google Cloud Storage, Cohere.ai (for summarization), Supabase (for auth & persistence), and optional TTS generation.

---

## Table of Contents

1. [Introduction](#introduction)  
2. [Features](#features)  
3. [Tech Stack & Dependencies](#tech-stack--dependencies)  
4. [Database Schema](#database-schema)  

---

## Introduction

**speech-backend** provides a RESTful API for:

- Authenticated users to **upload** audio files  
- **Transcribing** speech via Google Cloud Speech-to-Text  
- **Storing** and **retrieving** transcripts, summaries, and TTS audio in Supabase  
- Generating **concise titles** and **summaries** using Cohere.ai  
- Managing user roles **(free vs. pro)** and usage history  

> **[TODO]**: Briefly describe your overall application context (e.g. “This API powers the speech transcription web app at https://…”).

---

## Features

- 🔐 **User registration & login** via Supabase Auth (`/user/register`, `/user/login`)  
- 🎤 **Audio upload** endpoint with token verification (`/speech/upload`)  
- ☁️ **Automatic upload** of audio to Google Cloud Storage  
- 📝 **Speech-to-text transcription** using Google Cloud Speech API  
- 🔖 **Short title generation** (≤3 words) via Cohere.ai  
- 📄 **Text summarization** (pro users only) via Cohere.ai (`/speech/summary`)  
- 🎧 **Text-to-speech (TTS)** integration (via Google Cloud TTS or OpenAI/Gemini?) **[TODO: clarify TTS route]**  
- 📜 **Transcript history** retrieval (`/history`)  
- ✨ **Role upgrade** endpoint for free→pro (`/pro`)  

---

## Tech Stack & Dependencies

- **Node.js** (ES Modules)  
- **Express** v5  
- **Supabase JS** for Auth & Database  
- **Google-Cloud**:  
  - `@google-cloud/speech` (STT)  
  - `@google-cloud/storage` (GCS upload)  
  - `@google-cloud/text-to-speech` (if utilized)  
- **Cohere AI** (`cohere-ai`) for chat-based summarization & title generation  
- **OpenAI** & **Gemini AI** (installed but usage TBD)  
- **Compromise** (`nlp`) for sentence splitting  
- **Multer** for multipart/form-data file handling  
- **dotenv** for env var management  
- **cors**, **path**, **fs**, etc.

_All dependencies are listed in [package.json](package.json)._

---

## Database Schema

Defined in `supabase-schema.sql`:

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('free', 'pro');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  audio_url TEXT,
  transcript TEXT,
  summary TEXT,
  tts_url TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
