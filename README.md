# AI Chatbot & Multi-AI Comparison Tool

A full-stack JavaScript application featuring both a modern chatbot and a multi-AI comparison tool. Built with React, Node.js, Express, and Tailwind CSS.

## 🚀 Features

### 🤖 **Modern Chatbot**
- Clean, professional messaging interface
- Real-time AI responses from Gemini Pro
- Smooth animations with Framer Motion
- Responsive design for all devices
- Message status indicators and timestamps

### 🔄 **Multi-AI Comparison Tool**
- Send prompts to **3 different AI services simultaneously**:
  - **Google Gemini** (Gemini 1.5 Flash)
  - **Hugging Face** (DialoGPT Medium)
  - **Cohere** (Command model)
- Side-by-side response comparison
- Real-time processing with loading states
- Error handling for individual API failures
- Beautiful card-based UI with modern styling

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Modern UI/UX** with glassmorphism effects

### Backend
- **Node.js** with Express
- **Axios** for API calls
- **CORS** and security middleware
- **Rate limiting** and error handling

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure API Keys

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent

# Hugging Face Inference API Configuration
HUGGINGFACE_API_KEY=your-huggingface-api-key-here
HUGGINGFACE_API_URL=https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium

# Cohere API Configuration
COHERE_API_KEY=your-cohere-api-key-here
COHERE_API_URL=https://api.cohere.ai/v1/generate
```

### 3. Get API Keys

#### **Google Gemini API**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in and create an API key
3. Replace `your-gemini-api-key-here` with your key

#### **Hugging Face Inference API**
1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. Create a new access token
3. Replace `your-huggingface-api-key-here` with your token

#### **Cohere API**
1. Go to [Cohere Console](https://console.cohere.ai/)
2. Sign up and get your API key
3. Replace `your-cohere-api-key-here` with your key

### 4. Start the Application

```bash
# Terminal 1: Start the backend server
cd backend
npm run dev

# Terminal 2: Start the frontend (in a new terminal)
npm start
```

## 🌐 Usage

### Multi-AI Comparison Tool
1. **Enter a prompt** in the text input
2. **Click "Send to All AIs"** to process with all three services
3. **View responses** in side-by-side cards
4. **Compare results** from different AI models

### Chatbot
1. **Switch to Chatbot mode** using the navigation toggle
2. **Type messages** and get responses from Gemini Pro
3. **Enjoy the modern chat interface** with animations

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ChatBot.tsx          # Original chatbot component
│   │   └── MultiAI.tsx          # Multi-AI comparison tool
│   ├── services/
│   │   └── api.ts              # Frontend API service
│   ├── App.tsx                 # Main app with navigation
│   └── index.css               # Global styles
├── backend/
│   ├── routes/
│   │   └── ai.js               # API routes
│   ├── services/
│   │   ├── geminiService.js    # Gemini API service
│   │   ├── huggingfaceService.js # Hugging Face API service
│   │   └── cohereService.js    # Cohere API service
│   ├── server.js               # Express server
│   ├── package.json            # Backend dependencies
│   └── .env                    # Environment variables
└── README.md
```

## 🔧 API Endpoints

### Backend Endpoints

- `GET /health` - Health check
- `GET /api/status` - Check API key configuration status
- `POST /api/ask` - Send prompt to all AI services

### Request Format
```json
{
  "prompt": "Your text prompt here"
}
```

### Response Format
```json
{
  "prompt": "Your text prompt here",
  "processingTime": "1234ms",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "responses": {
    "gemini": {
      "success": true,
      "response": "AI response text",
      "model": "Gemini 1.5 Flash",
      "tokens": 150
    },
    "huggingface": {
      "success": true,
      "response": "AI response text",
      "model": "DialoGPT Medium",
      "tokens": 120
    },
    "cohere": {
      "success": true,
      "response": "AI response text",
      "model": "Cohere Command",
      "tokens": 100
    }
  }
}
```

## 🎨 UI Features

### Modern Design
- **Glassmorphism effects** with backdrop blur
- **Gradient backgrounds** and animations
- **Responsive grid layout** for AI responses
- **Smooth transitions** and hover effects
- **Loading spinners** and error states

### Color Scheme
- **Gemini**: Blue to Purple gradient
- **Hugging Face**: Yellow to Orange gradient
- **Cohere**: Green to Teal gradient

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the build folder
```

### Backend (Railway/Heroku)
```bash
cd backend
# Set environment variables in your hosting platform
npm start
```

## 🔒 Security Features

- **Rate limiting** (100 requests per 15 minutes)
- **CORS protection** with configurable origins
- **Helmet.js** for security headers
- **Input validation** and sanitization
- **Error handling** without exposing sensitive data

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend is running on port 5000
2. **API Key Errors**: Check your `.env` file configuration
3. **Rate Limits**: Wait before making more requests
4. **Model Loading**: Hugging Face models may take time to load

### Debug Mode
```bash
# Backend with detailed logging
NODE_ENV=development npm run dev
```

## 📝 License

MIT License - feel free to use this project for your own applications!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This application requires valid API keys for all three AI services to function properly. The chatbot will work with just the Gemini API key, but the multi-AI comparison tool needs all three keys configured.
# chatbot
