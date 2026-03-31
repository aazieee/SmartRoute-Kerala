import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithAI } from '../services/ai';
import { Route } from '../types';
import { cn } from '../lib/utils';

interface ChatProps {
  routes: Route[];
  source: string;
  destination: string;
  scenario: string;
  onSetScenario: (mode: any) => void;
  onSelectRoute: (id: string) => void;
  onUpdateDestination: (source?: string, destination?: string) => void;
  inline?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ 
  routes, 
  source, 
  destination, 
  scenario,
  onSetScenario,
  onSelectRoute,
  onUpdateDestination,
  inline = false
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I'm your SmartRoute Assistant. How can I help you navigate today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inline) setIsOpen(true);
  }, [inline]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const aiRes = await chatWithAI(userMsg, routes, source, destination, scenario);
      
      if (aiRes.text) {
        setMessages(prev => [...prev, { role: 'ai', content: aiRes.text || '' }]);
      }

      if (aiRes.functionCalls) {
        aiRes.functionCalls.forEach(call => {
          console.log("AI Function Call:", call.name, call.args);
          if (call.name === 'setScenario') {
            onSetScenario(call.args.mode as string);
            setMessages(prev => [...prev, { role: 'ai', content: `*System: Switching to ${call.args.mode as string} mode...*` }]);
          } else if (call.name === 'selectRoute') {
            onSelectRoute(call.args.routeId as string);
            const routeName = routes.find(r => r.id === (call.args.routeId as string))?.name || 'selected route';
            setMessages(prev => [...prev, { role: 'ai', content: `*System: Selecting ${routeName}...*` }]);
          } else if (call.name === 'updateDestination') {
            onUpdateDestination(call.args.source as string, call.args.destination as string);
            setMessages(prev => [...prev, { role: 'ai', content: `*System: Updating route parameters...*` }]);
          }
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "I encountered an error while processing your request. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const chatContent = (
    <motion.div
      initial={inline ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
      animate={inline ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={inline ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
      className={cn(
        "glass-card flex flex-col overflow-hidden border-white/10",
        inline ? "w-full h-full rounded-none border-none" : "w-80 sm:w-[400px] h-[550px] rounded-[2.5rem] mb-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
              <Bot size={24} className="text-brand-primary" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-secondary border-2 border-brand-bg shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight text-white">AI Navigator</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary/80">
                System Online
              </span>
            </div>
          </div>
        </div>
        {!inline && (
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2.5 hover:bg-white/5 rounded-2xl transition-all duration-300 text-brand-text-muted hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={cn(
              "max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? 'bg-brand-primary text-white rounded-tr-none shadow-lg shadow-brand-primary/20' 
                : 'bg-white/5 text-brand-text rounded-tl-none border border-white/5'
            )}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none flex gap-1.5 border border-white/5">
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-white/[0.02]">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your journey..."
            className="w-full bg-brand-bg/50 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-brand-primary/50 focus:ring-4 ring-brand-primary/10 transition-all duration-500 placeholder:text-brand-text-muted"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all duration-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-brand-primary"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (inline) return chatContent;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && chatContent}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-[1.5rem] bg-brand-primary shadow-[0_10px_30px_rgba(37,99,235,0.4)] flex items-center justify-center text-white relative group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen && (
          <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-brand-primary animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
        )}
      </motion.button>
    </div>
  );
};
