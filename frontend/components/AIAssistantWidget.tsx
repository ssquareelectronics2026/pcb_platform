'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Compass,
  Cpu,
  HelpCircle,
  Layers,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface MatchedComponent {
  id: number | string;
  name: string;
  description?: string | null;
  tags?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  matchedComponents?: MatchedComponent[];
}

const STARTER_PROMPTS = [
  {
    label: 'What components are in the catalog?',
    icon: Search,
  },
  {
    label: 'How to import .kicad_sym into KiCAD?',
    icon: Compass,
  },
  {
    label: 'How to add footprint .kicad_mod?',
    icon: Layers,
  },
  {
    label: 'Request a custom PCB design',
    icon: Cpu,
  },
  {
    label: 'How to request a missing component?',
    icon: HelpCircle,
  },
];

const WELCOME_TEXT =
  'I am the **S SQUARE ELECTRONICS AI Assistant**. Ask me about components in our catalog, KiCAD `.kicad_sym` / `.kicad_mod` imports, or custom PCB design.';

/**
 * Parses markdown-style links [Text](url), bold **text**, and inline code `code`,
 * while stripping raw markdown headers or blockquotes.
 */
function FormattedMessageContent({ content }: { content: string }) {
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .trim();

  const lines = cleaned.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} className="h-1" />;

        const isBullet =
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ') ||
          /^\d+\.\s/.test(trimmed);
        const cleanLine = isBullet
          ? trimmed.replace(/^[-*]\s+|\d+\.\s+/, '')
          : trimmed;

        const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
        const parts = cleanLine.split(tokenRegex);

        const renderedLine = parts.map((part, pIdx) => {
          if (!part) return null;

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
                  className="inline-flex items-center gap-0.5 text-[#9a6320] hover:text-[#7a4c14] font-medium underline underline-offset-2 bg-[#eeede8] hover:bg-[#e4e2dc] px-1.5 py-0.5 rounded transition-colors duration-150"
                >
                  <span>{title}</span>
                  <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
                </Link>
              );
            }
            return (
              <a
                key={pIdx}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[#9a6320] hover:text-[#7a4c14] font-medium underline underline-offset-2 bg-[#eeede8] hover:bg-[#e4e2dc] px-1.5 py-0.5 rounded transition-colors duration-150"
              >
                <span>{title}</span>
                <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
              </a>
            );
          }

          // Markdown Bold: **Text**
          const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) {
            return (
              <strong key={pIdx} className="font-semibold text-[#161513]">
                {boldMatch[1]}
              </strong>
            );
          }

          // Markdown Inline Code: `code`
          const codeMatch = part.match(/^`([^`]+)`$/);
          if (codeMatch) {
            return (
              <code
                key={pIdx}
                className="px-1.5 py-0.5 bg-[#eeede8] text-[#9a6320] font-mono text-xs rounded border border-[#161513]/10"
              >
                {codeMatch[1]}
              </code>
            );
          }

          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span
                className="w-1 h-1 rounded-full bg-[#9a6320] mt-2 flex-shrink-0"
                aria-hidden="true"
              />
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
      content: WELCOME_TEXT,
      timestamp: 'Now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
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
        'You can browse our [Components Catalog](/components) or submit your request at [Request Component](/request/component).';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        matchedComponents: data.matchedComponents,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Unable to reach the assistant right now. You can browse our [Components Catalog](/components) or try again.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
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
        content: WELCOME_TEXT,
        timestamp: 'Now',
      },
    ]);
  };

  return (
    <>
      {/* Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              type="button"
              onClick={() => setIsOpen(true)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 px-4 h-12 bg-[#151514] hover:bg-[#242320] text-white rounded-xl border border-white/15 shadow-[0_8px_24px_rgba(22,21,19,0.2)] transition-colors duration-150 ease-unslop active:scale-[0.98]"
              aria-label="Open S SQUARE AI Assistant"
            >
              <div className="w-7 h-7 rounded-md bg-[#1f1e1c] border border-white/10 text-[#c89452] flex items-center justify-center flex-shrink-0">
                <Cpu className="w-4 h-4" strokeWidth={1.5} />
              </div>

              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-medium text-white leading-none">
                    S SQUARE AI Assistant
                  </p>
                </div>
                <p className="font-mono text-[10px] text-[#a6a39c] leading-tight mt-0.5">
                  Instant Hardware Support
                </p>
              </div>

              <span className="text-xs font-medium sm:hidden">AI Assistant</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Instrument Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-[0_12px_36px_rgba(22,21,19,0.16)] border border-[#161513]/14 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#151514] px-4 py-3.5 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#1f1e1c] border border-white/10 flex items-center justify-center text-[#c89452] flex-shrink-0">
                  <Cpu className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-white tracking-tight truncate">
                      S SQUARE AI Assistant
                    </h3>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#4cc38a] bg-[#1f1e1c] border border-white/10 px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a6a39c] truncate">
                    S SQUARE ELECTRONICS • Instant Hardware Support
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  className="w-8 h-8 rounded-lg text-[#a6a39c] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors duration-150"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  aria-label="Close chat"
                  className="w-8 h-8 rounded-lg text-[#a6a39c] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors duration-150"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f6f5f1]">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end ml-auto' : 'items-start mr-auto'
                    } max-w-[92%]`}
                  >
                    <div
                      className={`p-3.5 rounded-xl ${
                        isUser
                          ? 'bg-[#161513] text-white rounded-br-sm'
                          : 'bg-white border border-[#161513]/10 text-[#161513] rounded-bl-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-sm font-normal whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : (
                        <div>
                          <FormattedMessageContent content={msg.content} />

                          {/* Interactive Component Cards */}
                          {msg.matchedComponents && msg.matchedComponents.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-[#161513]/8 space-y-2">
                              <div className="flex items-center justify-between font-mono text-[11px] text-[#76736c] tabular-nums">
                                <span>
                                  Verified catalog parts ({msg.matchedComponents.length})
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {msg.matchedComponents.map((comp) => (
                                  <div
                                    key={comp.id}
                                    className="bg-[#f6f5f1] hover:bg-[#eeede8] border border-[#161513]/10 rounded-lg p-2.5 transition-colors duration-150 flex items-center justify-between gap-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono font-medium text-[#161513] text-xs truncate">
                                          {comp.name}
                                        </span>
                                        <span className="font-mono tabular-nums bg-white text-[#9a6320] text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#161513]/10">
                                          ID #{comp.id}
                                        </span>
                                      </div>
                                      {comp.description && (
                                        <p className="text-[11px] text-[#52504a] truncate mt-0.5">
                                          {comp.description}
                                        </p>
                                      )}
                                    </div>
                                    <Link
                                      href={`/components/${comp.id}`}
                                      className="flex-shrink-0 inline-flex items-center gap-1 h-7 px-2.5 bg-[#161513] hover:bg-[#9a6320] text-white text-[11px] font-medium rounded-md transition-colors duration-150"
                                    >
                                      <span>Open Component</span>
                                      <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[#76736c] px-1 mt-1 tabular-nums">
                      {isUser ? 'You' : 'S SQUARE AI'} · {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto">
                  <div className="px-3 py-2.5 bg-white border border-[#161513]/10 rounded-xl rounded-bl-sm flex items-center gap-2 text-[#52504a] text-xs font-mono">
                    <Loader2
                      className="w-3.5 h-3.5 text-[#9a6320] animate-spin"
                      strokeWidth={1.5}
                    />
                    <span>Checking catalog</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Starter Prompts Strip */}
            {messages.length === 1 && (
              <div className="px-3 py-2.5 bg-white border-t border-[#161513]/10 overflow-x-auto no-scrollbar">
                <p className="font-mono text-[11px] text-[#76736c] mb-1.5 px-0.5">
                  Quick questions
                </p>
                <div className="flex gap-1.5 flex-nowrap pb-0.5 pr-4">
                  {STARTER_PROMPTS.map((item, i) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(item.label)}
                        className="h-8 px-2.5 bg-[#f6f5f1] hover:bg-[#eeede8] border border-[#161513]/10 rounded-lg text-[11px] font-medium text-[#161513] whitespace-nowrap inline-flex items-center gap-1.5 transition-colors duration-150 flex-shrink-0"
                      >
                        <IconComponent
                          className="w-3.5 h-3.5 text-[#76736c]"
                          strokeWidth={1.5}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-[#161513]/10">
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
                  placeholder="Ask about components, KiCAD, or PCB design"
                  disabled={loading}
                  className="flex-1 h-10 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-3 text-xs sm:text-sm text-[#161513] placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-lg bg-[#161513] hover:bg-[#2a2824] text-white flex items-center justify-center transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
