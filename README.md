# Chatbot Application

A multi-AI chatbot application built with React, TypeScript, and Netlify Functions.

## Features

- **Multi-AI Support**: Get responses from multiple AI models simultaneously
  - Gemini 1.5 Pro (Google AI)
  - Claude 3.5 Sonnet (via Cohere)
  - GPT-4o (via OpenRouter)
- **Real-time Chat**: Interactive chatbot interface
- **Authentication**: Secure user authentication with Supabase
- **Responsive Design**: Modern UI with Tailwind CSS
- **Modal Interface**: Clean modal for viewing full AI responses

## Setup

### Environment Variables

For the MultiAI functionality to work, you need to set these environment variables in your Netlify deployment:

1. **Gemini API Key** (choose one):
   - `GEMINI_API_KEY` - Your Google AI API key
   - `GOOGLE_API_KEY` - Alternative name for Google AI API key
   - Get it from: [Google AI Studio](https://aistudio.google.com/app/apikey)

2. **Cohere API Key**:
   - `COHERE_API_KEY` - Your Cohere API key
   - Get it from: [Cohere Dashboard](https://dashboard.cohere.ai/)

3. **OpenRouter API Key**:
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
   - Get it from: [OpenRouter Dashboard](https://openrouter.ai/keys)

### Setting Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add each API key as a new variable
5. Redeploy your site

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Deployment

The application is configured for Netlify deployment with:
- **Netlify Functions**: Serverless functions for AI API calls
- **Build Command**: `npm run build`
- **Publish Directory**: `build`
- **Functions Directory**: `netlify/functions`

## API Endpoints

- `/.netlify/functions/multi-ai` - MultiAI endpoint for getting responses from all AI services

## Recent Fixes

✅ **ESLint Errors**: Fixed unused imports and variables
✅ **Modal Functionality**: Proper positioning and scrolling
✅ **Netlify Functions**: Complete serverless AI integration
✅ **API Integration**: Correct endpoint calls and request formatting
✅ **Build Process**: Clean compilation without errors
