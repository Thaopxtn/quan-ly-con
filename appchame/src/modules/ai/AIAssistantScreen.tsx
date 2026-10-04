import React, { useState, useEffect } from 'react';
import { ChevronLeft, Bot, Send, Sparkles, Lightbulb, Shield, BarChart3, Settings, Key, AlertTriangle } from 'lucide-react';
import { AIMessage } from '@shared/types';
import { useAppState, getTodayScreenTime, DEFAULT_SCREEN_TIME_LIMIT } from '@shared/store';
import { serverApiClient } from '@shared/services/serverApiClient';

interface AIAssistantScreenProps {
  onBack: () => void;
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ onBack }) => {
  const { state } = useAppState();
  const currentChild = state.children?.find((c) => c.id === state.selectedChildId) || state.child;
  const childName = currentChild?.name || 'con';
  const childSettings = state.childSettings?.[currentChild?.id || ''];
  const todayST = getTodayScreenTime(childSettings?.screenTime);
  const usedMins = todayST.todayTotalMinutes;
  const limitMins = childSettings?.screenTimeLimitMinutes ?? todayST.dailyLimitMinutes ?? DEFAULT_SCREEN_TIME_LIMIT;
  const apps = childSettings?.apps || (state.selectedChildId === currentChild?.id ? state.apps : []);
  const routines = childSettings?.smartRoutines || state.smartRoutines;

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'm_1',
      sender: 'ai',
      text: `Xin chào! Tôi là trợ lý AI thông minh của ParentPro. Tôi có thể giúp bạn phân tích thói quen sử dụng máy của ${childName}, gợi ý thời khóa biểu học tập hoặc giải đáp các thắc mắc an toàn của con.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState('');

  useEffect(() => {
    serverApiClient.checkAIConfig().then(hasKey => {
      setHasApiKey(hasKey);
      if (!hasKey) setShowConfig(true);
    });
  }, []);

  const handleSaveConfig = async () => {
    if (!apiKeyValue.trim()) return;
    const ok = await serverApiClient.saveAIConfig(apiKeyValue.trim());
    if (ok) {
      setHasApiKey(true);
      setShowConfig(false);
      setApiKeyValue('');
    }
  };

  const quickPrompts = [
    { label: 'Gợi ý lịch học phù hợp', icon: Lightbulb },
    { label: 'Tư vấn bảo vệ con trên mạng', icon: Shield },
    { label: 'Phân tích thói quen sử dụng thiết bị', icon: BarChart3 },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!hasApiKey) {
      setShowConfig(true);
      return;
    }

    const userMsg: AIMessage = {
      id: 'm_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    const childContext = {
      name: childName,
      usedMinutesToday: usedMins,
      dailyLimitMinutes: limitMins,
      installedApps: apps.length,
      routinesEnabled: routines?.bedtimeLock || routines?.mealtimeLock,
    };

    const result = await serverApiClient.chatWithAI(newMessages, childContext);
    
    setIsTyping(false);
    if (result.success && result.reply) {
      setMessages(prev => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          sender: 'ai',
          text: result.reply!,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } else {
      if (result.error === 'MISSING_API_KEY') {
        setHasApiKey(false);
        setShowConfig(true);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: 'ai_' + Date.now(),
            sender: 'ai',
            text: `⚠️ Lỗi kết nối AI: ${result.error}`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <span>Trợ lý AI thông minh</span>
              <Sparkles size={16} className="text-amber-500 fill-amber-500" />
            </h2>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500"
        >
          <Settings size={18} />
        </button>
      </div>

      {showConfig && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Key size={24} />
              </div>
              <h3 className="font-bold text-lg">Cấu hình API AI</h3>
            </div>
            
            <p className="text-xs text-slate-500">
              Để sử dụng tính năng Trợ lý AI thực tế, bạn cần cung cấp một khóa API của Google Gemini (Miễn phí).
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Gemini API Key</label>
              <input
                type="password"
                value={apiKeyValue}
                onChange={e => setApiKeyValue(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition"
              />
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline block pt-1">
                Lấy API Key miễn phí tại Google AI Studio
              </a>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
        {/* Cute AI Bot Banner */}
        <div className="text-center py-2">
          <div className="relative w-16 h-16 mx-auto bg-gradient-to-tr from-blue-600 to-sky-400 rounded-3xl p-3 shadow-lg flex items-center justify-center text-white ring-4 ring-blue-100 mb-2">
            <Bot size={34} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <span className="text-xs font-bold text-slate-700">ParentPro Copilot 2.0</span>
          <p className="text-[10px] text-slate-400">Luôn sẵn sàng hỗ trợ phụ huynh 24/7</p>
        </div>

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-white text-slate-800 border border-slate-100 shadow-soft rounded-tl-none'
              }`}
            >
              <p>{msg.text}</p>
              <span
                className={`text-[9px] block text-right mt-1 ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="pt-2 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Gợi ý câu hỏi nhanh:
          </span>
          <div className="space-y-1.5">
            {quickPrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(p.label)}
                  className="w-full text-left p-2.5 bg-white hover:bg-blue-50/60 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-2.5 shadow-sm transition active:scale-[0.99]"
                >
                  <Icon size={16} className="text-blue-600 shrink-0" />
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Input Bottom */}
      <div className="p-3 bg-white border-t border-slate-100 select-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
