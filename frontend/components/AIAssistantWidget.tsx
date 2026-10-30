'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  '🔍 What components are in the catalog?',
  '📐 How to import .kicad_sym into KiCAD?',
  '👣 How to add footprint .kicad_mod?',
  '⚡ Request a custom PCB design & Gerber files',
  '❓ How to request a missing component?',
];

/**
 * Parses markdown-style links [Text](url), bold **text**, and inline code `code`
 */
function FormattedMessageContent({ content }: { content: string }) {
  // Split into paragraphs / lines
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} className="h-1.5" />;

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);
        const cleanLine = isBullet ? trimmed.replace(/^[-*]\s+|\d+\.\s+/, '') : line;

        // Parse line into tokens of [link], **bold**, `code`, or text
        const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
        const parts = cleanLine.split(tokenRegex);

        const renderedLine = parts.map((part, pIdx) => {
          // Markdown Link: [Title](url)
          const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            const [, title, href] = linkMatch;
            const isInternal = href.startsWith('/') || href.startsWith('#');
            if (isInternal) {
              return (
                <Link
                  key={pIdx}
                  href={href}
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold underline bg-blue-50/80 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
                >
                  <span>{title}</span>
                  <span className="text-[10px] no-underline">↗</span>
                </Link>
              );
            }
            return (
              <a
                key={pIdx}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold underline bg-blue-50/80 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
              >
                <span>{title}</span>
                <span className="text-[10px] no-underline">↗</span>
              </a>
            );
          }

          // Markdown Bold: **Text**
          const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) {
            return (
              <strong key={pIdx} className="font-extrabold text-slate-900">
                {boldMatch[1]}
              </strong>
            );
          }

          // Markdown Inline Code: `code`
          const codeMatch = part.match(/^`([^`]+)`$/);
          if (codeMatch) {
            return (
              <code key={pIdx} className="px-1 py-0.5 bg-slate-100 text-blue-700 font-mono text-xs rounded border border-slate-200">
                {codeMatch[1]}
              </code>
            );
          }

          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-blue-500 font-bold mt-0.5 flex-shrink-0">•</span>
              <span className="flex-1">{renderedLine}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{renderedLine}</p>;
      })}
    </div>
  );
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! 👋 I am your **S SQUARE ELECTRONICS AI Hardware Assistant** powered by Gemini. Ask me about verified KiCAD symbols, PCB footprints in our catalog, custom circuit design requests, or how to import `.kicad_sym` and `.kicad_mod` files into KiCAD!",
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Prepare conversation history payload
      const historyPayload = newMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "I couldn't process your question at the moment. Please explore our [Components Catalog](/components) or submit your request at [Request Component](/request/component).";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I ran into a connection glitch. Please check your internet connection or browse our [KiCAD Components Catalog](/components) directly.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Chat reset! 👋 How can I help you with your PCB projects, KiCAD footprints, or component library today?",
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              type="button"
              onClick={() => setIsOpen(true)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="relative flex items-center gap-2.5 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 text-white rounded-full shadow-2xl shadow-blue-900/40 border border-blue-400/30 group transition-all"
              aria-label="Open AI Hardware Assistant"
            >
              {/* Pulsing indicator beacon */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>

              <span className="text-xl">🤖</span>

              <div className="text-left hidden sm:block">
                <p className="text-xs font-black tracking-wide leading-none uppercase text-blue-200">
                  AI Hardware Assistant
                </p>
                <p className="text-[10px] text-slate-300 font-medium leading-tight mt-0.5">
                  S SQUARE ELECTRONICS
                </p>
              </div>

              <span className="text-xs font-bold sm:hidden">AI Assistant</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Chat Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-xl shadow-md border border-white/20">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white tracking-tight">
                      S SQUARE AI Assistant
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Powered by Gemini 2.5 Flash • Live Catalog
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
                >
                  🗑️
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-lg font-bold transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] ${
                      isUser ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl shadow-sm text-slate-800 ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/10'
                          : 'bg-white border border-slate-200/90 rounded-bl-none shadow-slate-200/40'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <FormattedMessageContent content={msg.content} />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 px-1 mt-1 font-semibold">
                      {isUser ? 'You' : 'S SQUARE AI'} • {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <span className="flex gap-1 items-center">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                    <span>Analyzing live catalog &amp; hardware specs...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Starter Chips (Only show if only 1 welcome message present) */}
            {messages.length === 1 && (
              <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/70 overflow-x-auto no-scrollbar">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1 tracking-wider">
                  Quick Questions:
                </p>
                <div className="flex gap-1.5 flex-nowrap pb-1">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-[11px] font-bold text-slate-700 hover:text-blue-700 whitespace-nowrap shadow-2xs transition-all flex-shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about components, KiCAD, or PCB design..."
                  disabled={loading}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Send message"
                >
                  ➤
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
