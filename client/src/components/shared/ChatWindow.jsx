import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Bot, User, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../../lib/api';

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' }
];

export default function ChatWindow({ role }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Set initial welcome messages based on role
  useEffect(() => {
    let welcomeText = '';
    if (role === 'fan') {
      welcomeText = 'Hi there! I am GameField, your World Cup stadium assistant. How can I help you find your gate, parking, transit, or accessibility facilities today?';
    } else if (role === 'volunteer') {
      welcomeText = 'Staff Assist Ready. Describe your query or stadium section issue to retrieve standard procedures and active tasks.';
    } else {
      welcomeText = 'Tactical Command Engine Online. Enter incident queries, request SOP details, or ask me to draft a multilingual alert.';
    }

    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date()
      }
    ]);
  }, [role]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput('');
    
    // Append user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMessageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendChatMessage(role, userMessageText, lang);
      
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `Sorry, I encountered an error: ${err.message}. Please check that the server is running and try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-window-container glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="chat-header" style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Bot size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {role === 'fan' ? 'GameField AI' : role === 'volunteer' ? 'Staff Assist' : 'Command Engine'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {loading ? 'Thinking...' : 'Online'}
            </span>
          </div>
        </div>

        {/* Language Selector for Fan role */}
        {role === 'fan' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Globe size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code} style={{ background: '#12141d' }}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Message Area */}
      <div className="chat-messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxHeight: '450px'
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.6rem',
                animation: 'slideIn 0.25s ease-out forwards'
              }}
            >
              {!isUser && (
                <div style={{
                  background: msg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                  color: msg.isError ? 'var(--status-incident)' : 'var(--text-secondary)',
                  padding: '0.3rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '0.15rem'
                }}>
                  <Bot size={14} />
                </div>
              )}
              
              <div style={{
                maxWidth: '75%',
                background: isUser ? 'var(--primary)' : msg.isError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: isUser ? 'none' : msg.isError ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)',
                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                padding: '0.75rem 1rem',
                color: msg.isError ? '#ff8a8a' : 'var(--text-primary)',
                boxShadow: isUser ? '0 4px 10px var(--primary-glow)' : 'var(--shadow-sm)',
                lineHeight: 1.5,
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
                <div style={{
                  fontSize: '0.65rem',
                  color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                  textAlign: 'right',
                  marginTop: '0.35rem'
                }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div style={{
                  background: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  padding: '0.3rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '0.15rem'
                }}>
                  <User size={14} />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              padding: '0.3rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Bot size={14} />
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px 14px 14px 2px',
              padding: '0.75rem 1rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <Loader2 className="animate-spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
              GameField is compiling live context...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            role === 'fan' 
              ? 'Ask about gates, parking, sensory rooms...' 
              : role === 'volunteer' 
                ? 'Ask for help with crowd control, overflow bins...' 
                : 'Query active SOPs, draft announcements...'
          }
          style={{ flex: 1 }}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)'
          }}
          disabled={loading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Extra styles inside tag to support custom keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
