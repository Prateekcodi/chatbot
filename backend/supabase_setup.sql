-- Create conversations table for storing chat history
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'chatbot' or 'multibot'
    prompt TEXT NOT NULL,
    response TEXT, -- For chatbot responses
    responses JSONB, -- For multibot responses (storing all AI responses)
    model VARCHAR(100), -- For chatbot responses
    processing_time_ms INTEGER,
    error TEXT, -- Store error messages if any
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type_created_at ON conversations(type, created_at DESC);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on conversations" ON conversations
    FOR ALL USING (true);