import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, RefreshCw, Bot, User, Settings2, Code, Briefcase, FileDigit, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { apiUrl, getApiConfigurationError } from '../api';

function MockInterview() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hello! I'm your AI Interview Coach. Ready to begin?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const chatEndRef = useRef(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const history = messages.map((message) => ({
      role: message.role,
      text: message.text,
    }));

    const userMsg = {
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const configurationError = getApiConfigurationError();
      if (configurationError) {
        throw new Error(configurationError);
      }

      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          history,
          message: userText,
        }),
      });

      const rawResponse = await res.text();
      let data = {};

      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          throw new Error(rawResponse.trim() || `Request failed with status ${res.status}`);
        }
      }

      if (!res.ok) {
        throw new Error(data?.detail || data?.message || `Request failed with status ${res.status}`);
      }

      setMessages((prev) => [...prev, {
        role: 'ai',
        text: data.reply || 'No reply received from backend.',
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: `Error: ${error.message}`,
        timestamp: new Date(),
      }]);
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetInterview = () => {
    setMessages([{
      role: 'ai',
      text: "Let's start a fresh interview session. Tell me about yourself.",
      timestamp: new Date(),
    }]);
    setInput('');
    setIsTyping(false);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-6">
      
      {/* THEATER MODE MAIN VIEW */}
      <motion.div 
        layout
        className={`flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-3/4' : 'w-full'} min-h-[500px]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:px-8 md:py-6 border-b border-slate-100 bg-white z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white relative shrink-0">
                <Bot size={24} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse blur-[1px]"></span>
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute"></span>
                </div>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Coach</h3>
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                System Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={resetInterview} className="px-4 py-2 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition-colors">
               <RefreshCw size={16} /> <span className="hidden sm:inline">Reset</span>
             </button>
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex p-2 items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors shrink-0"
             >
                {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
             </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/50">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                className={`flex gap-4 max-w-4xl mx-auto w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm mt-1 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-800 text-white'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 rounded-[1.25rem] text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-widest">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 max-w-4xl mx-auto w-full">
                <div className="w-10 h-10 shrink-0 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-sm mt-1">
                  <Bot size={20} />
                </div>
                <div className="px-6 py-5 rounded-[1.25rem] bg-white border border-slate-100 rounded-tl-sm flex items-center gap-1.5 shadow-sm h-14">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></motion.div>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></motion.div>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 lg:p-8 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <button className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors border border-slate-100 shrink-0 h-[60px] flex items-center justify-center">
              <Mic size={24} />
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl transition-all relative overflow-hidden flex items-end min-h-[60px]">
                <textarea
                  className="w-full bg-transparent px-5 py-4 text-[15px] outline-none text-slate-800 resize-none flex-1"
                  placeholder="Type your response... (Press Enter to send)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={Math.min(4, Math.max(1, input.split('\n').length))}
                  style={{ minHeight: '60px' }}
                />
            </div>
            <button 
              onClick={sendMessage} 
              disabled={!input.trim() || isTyping}
              className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                input.trim() && !isTyping ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={24} className={input.trim() && !isTyping ? 'translate-x-0.5' : ''} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* COLLAPSIBLE RIGHT DRAWER (Settings/Context) */}
      <AnimatePresence>
          {isSidebarOpen && (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-6 shrink-0 lg:h-full lg:overflow-hidden w-full lg:w-1/4"
              >
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 h-full flex flex-col overflow-y-auto w-full">
                      <div className="flex items-center gap-2 mb-8">
                          <Settings2 className="text-indigo-600" size={24} />
                          <h3 className="text-lg font-bold text-slate-800">Parameters</h3>
                      </div>
                      
                      <div className="space-y-6 flex-1">
                          <label className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interview Role</span>
                              <div className="relative">
                                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-indigo-400 text-slate-700 appearance-none font-semibold">
                                      <option>Frontend Developer</option>
                                      <option>Backend Engineer</option>
                                      <option>Product Manager</option>
                                  </select>
                              </div>
                          </label>
                          
                          <label className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Difficulty</span>
                              <div className="relative">
                                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-indigo-400 text-slate-700 appearance-none font-semibold">
                                      <option>Junior Level</option>
                                      <option>Mid Level</option>
                                      <option>Senior Level</option>
                                  </select>
                              </div>
                          </label>

                          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mt-4">
                              <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-2"><FileDigit size={16} /> Live Feedback</h4>
                              <p className="text-sm font-medium text-indigo-700/80 leading-relaxed">
                                  The AI Coach is evaluating your responses for clarity, STAR-method structuring, and technical accuracy.
                              </p>
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
}

export default MockInterview;
