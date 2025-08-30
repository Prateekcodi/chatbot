import React, { useState } from 'react';
import ChatBot from './components/ChatBot';
import MultiAI from './components/MultiAI';
import './index.css';

function App() {
  const [activeComponent, setActiveComponent] = useState<'chatbot' | 'multiai'>('multiai');

  return (
    <div className="App w-screen h-screen overflow-hidden">
      {/* Navigation Toggle */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveComponent('multiai')}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activeComponent === 'multiai'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
                  : 'text-purple-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Multi-AI Tool
            </button>
            <button
              onClick={() => setActiveComponent('chatbot')}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activeComponent === 'chatbot'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
                  : 'text-purple-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Chatbot
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Component */}
      <div className="w-full h-full">
        {activeComponent === 'multiai' ? <MultiAI /> : <ChatBot />}
      </div>
    </div>
  );
}

export default App;
