import React, { useState } from 'react';
import { ChevronLeft, Bot, Send, Sparkles, Lightbulb, Shield, BarChart3 } from 'lucide-react';
import { AIMessage } from '@shared/types';
import { useAppState } from '@shared/store';

interface AIAssistantScreenProps {
  onBack: () => void;
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ onBack }) => {
  const { state } = useAppState();
  const currentChild = state.children?.find((c) => c.id === state.selectedChildId) || state.child;
  const childName = currentChild?.name || 'con';
  const childSettings = state.childSettings?.[currentChild?.id];
  const usedMins = childSettings?.screenTime?.todayTotalMinutes ?? state.screenTime?.todayTotalMinutes ?? 0;
  const limitMins = childSettings?.screenTimeLimitMinutes ?? 135;
  const apps = childSettings?.apps || state.apps || [];
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

  const quickPrompts = [
    { label: 'Gợi ý lịch học phù hợp', icon: Lightbulb },
    { label: 'Tư vấn bảo vệ con trên mạng', icon: Shield },
    { label: 'Phân tích thói quen sử dụng thiết bị', icon: BarChart3 },
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: AIMessage = {
      id: 'm_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // AI smart response synthesized from actual real state
    setTimeout(() => {
      let aiReply = '';
      const lower = text.toLowerCase();
      if (lower.includes('lịch học') || lower.includes('thời khóa biểu')) {
        const bedStart = routines?.bedtimeStart || '21:30';
        aiReply = `Dựa trên lịch sinh hoạt hiện tại của ${childName}, con có giờ đi ngủ bắt đầu lúc ${bedStart}. Tôi đề xuất: 19:30 - 20:30 tập trung học bài & làm bài tập trực tuyến, 20:30 nghỉ ngơi vận động nhẹ hoặc đọc sách cùng gia đình, sau 21:00 cất thiết bị để chuẩn bị đi ngủ đúng giờ.`;
      } else if (lower.includes('bảo vệ') || lower.includes('mạng') || lower.includes('an toàn')) {
        const blockedCount = apps.filter(a => a.status === 'blocked').length;
        aiReply = `Hệ thống hiện đang quản lý ${apps.length} ứng dụng trên máy ${childName} (trong đó đã chặn ${blockedCount} ứng dụng không phù hợp). Để bảo vệ con tốt nhất, hãy nhắc con nguyên tắc: 1. Không chia sẻ mật khẩu/vị trí nhà cho người lạ, 2. Báo ngay cho cha mẹ khi gặp nội dung lạ hoặc bắt nạt trên mạng.`;
      } else if (lower.includes('thói quen') || lower.includes('thiết bị') || lower.includes('thời gian')) {
        const usedHours = Math.floor(usedMins / 60);
        const usedRemainMins = usedMins % 60;
        const limitHours = Math.floor(limitMins / 60);
        const limitRemainMins = limitMins % 60;
        const remainingMins = Math.max(0, limitMins - usedMins);
        aiReply = `Hôm nay ${childName} đã sử dụng ${usedHours > 0 ? `${usedHours}h ` : ''}${usedRemainMins}p trên tổng hạn mức ${limitHours > 0 ? `${limitHours}h ` : ''}${limitRemainMins}p mà bạn đã đặt (còn lại ${remainingMins} phút). ${usedMins >= limitMins ? 'Thiết bị hiện đã chạm giới hạn an toàn trong ngày.' : 'Thời lượng sử dụng đang được kiểm soát rất tốt!'}`;
      } else {
        aiReply = `Cảm ơn bạn đã hỏi. Tôi ghi nhận thắc mắc "${text}" và luôn sẵn sàng phân tích dữ liệu thực tế trên máy con để hỗ trợ bạn đồng hành cùng ${childName} một cách an toàn và khoa học nhất!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 700);
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
      </div>

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
