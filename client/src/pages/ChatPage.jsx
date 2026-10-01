import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getChatHistory } from '../api/chat';
import EventCard from '../components/EventCard';

const QUICK_PROMPTS = [
  'Find music events in San Francisco',
  'Show my RSVPs',
  'Find AI and Tech summits',
  'What events are happening this weekend?',
  'Help',
];

const ChatPage = () => {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await getChatHistory();
        if (res.success && res.data) {
          setMessages(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;

    const handleReply = (msg) => {
      setIsTyping(false);
      setMessages((prev) => [...prev, msg]);
    };

    const handleTyping = (data) => {
      setIsTyping(!!data?.typing);
    };

    socket.on('chat:reply', handleReply);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:reply', handleReply);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket]);

  const handleSendMessage = (textToSend = inputText) => {
    const text = textToSend.trim();
    if (!text) return;

    if (!socket) {
      toast.error('Real-time socket connection unavailable');
      return;
    }

    const localUserMsg = {
      _id: 'temp-' + Date.now(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, localUserMsg]);
    setInputText('');
    setIsTyping(true);

    socket.emit('chat:message', { text });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <span>🤖</span>
            <span>Real-time Chat Assistant</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Converse with EventPulse AI to search live events, manage RSVPs, generate invite links & set reminders.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <span className={`w-2.5 h-2.5 rounded-full ${socket ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span>{socket ? 'Socket.IO Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Main Grid: Prompts Sidebar & Chat Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: Quick Prompts */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Prompts</h3>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-300 border border-slate-800/80 hover:border-indigo-500/30 text-xs font-medium transition-all"
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Chat Interface */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-3xl h-[650px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">💬</div>
                <h3 className="text-lg font-bold text-white">Start a Conversation</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Type a prompt below like *"Find music events in San Francisco"* to get started!
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg._id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3`}>
                    <div
                      className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-100 border border-slate-800 rounded-bl-none shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Inline Events Payload */}
                    {!isUser && msg.payload?.events && (
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {msg.payload.events.map((evt) => (
                          <EventCard key={evt.eventId} event={evt} />
                        ))}
                      </div>
                    )}

                    {/* Suggestion Chips */}
                    {!isUser && msg.payload?.suggestions && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.payload.suggestions.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(chip)}
                            className="px-3.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold transition-all hover:scale-105"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-2xl rounded-bl-none w-20">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask assistant or type 'help'..."
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 text-sm flex items-center space-x-1"
            >
              <span>Send</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
