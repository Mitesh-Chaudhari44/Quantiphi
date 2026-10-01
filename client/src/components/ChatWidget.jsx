import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getChatHistory } from '../api/chat';
import EventCard from './EventCard';

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const loadHistory = async () => {
        setLoading(true);
        try {
          const res = await getChatHistory();
          if (res.success && res.data) {
            setMessages(res.data || []);
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
        } finally {
          setLoading(false);
        }
      };
      loadHistory();
    }
  }, [isOpen, isAuthenticated]);

  // Socket event listeners for chat:reply and chat:typing
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

    if (!isAuthenticated) {
      toast.error('Please sign in to chat with the assistant');
      return;
    }

    if (!socket) {
      toast.error('Real-time connection unavailable');
      return;
    }

    // Add user message locally
    const localUserMsg = {
      _id: 'temp-' + Date.now(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, localUserMsg]);
    setInputText('');
    setIsTyping(true);

    // Emit chat:message via socket
    socket.emit('chat:message', { text });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-2xl shadow-2xl hover:scale-105 transition-all border border-indigo-400/30 group"
          aria-label="Open Chat Assistant"
        >
          <span className="group-hover:rotate-12 transition-transform">🤖</span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-ping"></span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[550px] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl flex flex-col backdrop-blur-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-lg shadow-md">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">EventPulse Assistant</h3>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${socket ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="text-[11px] text-slate-400">{socket ? 'Real-time Online' : 'Connecting...'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-all"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="text-3xl">💬</div>
                <h4 className="text-sm font-bold text-white">How can I help you today?</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Ask me to search for events, check your RSVPs, generate invite links, or set reminders!
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg._id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Render inline event cards payload */}
                    {!isUser && msg.payload?.events && (
                      <div className="w-full space-y-3 pt-2">
                        {msg.payload.events.map((evt) => (
                          <EventCard key={evt.eventId} event={evt} />
                        ))}
                      </div>
                    )}

                    {/* Render suggestion chips */}
                    {!isUser && msg.payload?.suggestions && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.payload.suggestions.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(chip)}
                            className="px-3 py-1 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-semibold transition-all hover:scale-105"
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

            {/* Typing Indicator Bubble */}
            {isTyping && (
              <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 text-slate-300 px-3.5 py-2 rounded-2xl rounded-bl-none w-20">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask assistant or type 'help'..."
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center"
            >
              <span>➔</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
