import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  MessageCircle,
  Volume2,
  Smile,
  Clock,
  Sparkles,
  Heart,
  CheckCheck
} from "lucide-react";
import { useAppState, getActiveParentId } from "../store";
import {
  sendCloudChatMessage,
  subscribeCloudChatMessages,
  CloudChatMessage,
} from "../firebase/cloudSyncService";

export interface ChatMessage {
  id: string;
  sender: "parent" | "kid";
  senderName: string;
  text: string;
  time: string;
  speakTTS?: boolean;
  requireResponse?: boolean;
  timestamp?: number;
}

interface FamilyChatModalProps {
  currentRole: "parent" | "kid";
  childId: string;
  childName: string;
  onClose: () => void;
}

const LOCAL_CHAT_STORAGE_KEY = "family_chat_messages_";

const KID_QUICK_RESPONSES = [
  "Con đang học bài 📚",
  "Con sắp về nhà rồi 🚲",
  "Bố/Mẹ đón con nhé 🚗",
  "Con làm xong bài tập rồi! ⭐",
  "Con yêu Bố Mẹ ❤️",
];

const PARENT_QUICK_MESSAGES = [
  "Con nhớ uống nước nhé 💧",
  "Chuẩn bị về ăn cơm con nhé 🍲",
  "Tập trung học bài đi con 📖",
  "Bố/Mẹ đang trên đường đến đón con 🚗",
  "Hôm nay con rất ngoan! 🌟",
];

// Helper to check if two messages represent the same chat entry
function isSameChatMessage(a: ChatMessage, b: ChatMessage | CloudChatMessage): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.sender === b.sender && a.text.trim() === b.text.trim()) {
    if (a.time && b.time && a.time === b.time) return true;
    if (a.timestamp && b.timestamp && Math.abs(a.timestamp - b.timestamp) < 5000) return true;
  }
  return false;
}

// Helper to play message chime
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
}

// Helper to speak Vietnamese text aloud via Web Speech Synthesis
function speakTextAloud(text: string) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
    }
  }
}

export const FamilyChatModal: React.FC<FamilyChatModalProps> = ({
  currentRole,
  childId,
  childName,
  onClose,
}) => {
  const { state } = useAppState();
  const [inputText, setInputText] = useState("");
  const [speakOnKid, setSpeakOnKid] = useState(true);
  const [requireResponse, setRequireResponse] = useState(false);

  const storageKey = `${LOCAL_CHAT_STORAGE_KEY}${childId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}

    return [
      {
        id: "msg_1",
        sender: "parent",
        senderName: "Bố/Mẹ",
        text: `Chào ${childName}! Con đã hoàn thành bài tập về nhà chưa? 🌟`,
        time: "07:30",
        timestamp: Date.now() - 3600000,
      },
      {
        id: "msg_2",
        sender: "kid",
        senderName: childName,
        text: "Dạ vâng ạ! Con đang làm bài tập Toán! 📚",
        time: "07:32",
        timestamp: Date.now() - 3500000,
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages]);

  // Subscribe to Cloud Chat Messages in real-time
  useEffect(() => {
    const parentId = getActiveParentId();
    const unsubscribe = subscribeCloudChatMessages(
      parentId,
      childId,
      (cloudMsgs) => {
        if (cloudMsgs && cloudMsgs.length > 0) {
          setMessages((prev) => {
            // Remove mock messages once we have real cloud messages
            const base = prev.filter((m) => m.id !== "msg_1" && m.id !== "msg_2");
            const merged = [...base];

            cloudMsgs.forEach((cm) => {
              const idx = merged.findIndex((m) => isSameChatMessage(m, cm));
              const formatted: ChatMessage = {
                id: cm.id || "msg_" + (cm.timestamp || Date.now()),
                sender: cm.sender,
                senderName: cm.senderName,
                text: cm.text,
                time: cm.time,
                speakTTS: cm.speakTTS,
                requireResponse: cm.requireResponse,
                timestamp: typeof cm.timestamp === "number" ? cm.timestamp : Date.now(),
              };

              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...formatted };
              } else {
                merged.push(formatted);
                // Only speak aloud on KID device if message is recent
                const isRecent = cm.timestamp && Date.now() - cm.timestamp < 60000;
                if (currentRole === "kid" && cm.sender === "parent" && isRecent) {
                  playNotificationChime();
                  if (cm.speakTTS) {
                    speakTextAloud(`Bố mẹ dặn: ${cm.text}`);
                  }
                }
              }
            });

            merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            localStorage.setItem(storageKey, JSON.stringify(merged));
            return merged;
          });
        }
      },
      childName
    );

    return () => unsubscribe();
  }, [childId, childName, currentRole, storageKey]);

  const handleSend = (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const nowTs = now.getTime();

    const newMsg: ChatMessage = {
      id: "msg_" + nowTs,
      sender: currentRole,
      senderName: currentRole === "parent" ? "Bố/Mẹ" : childName,
      text: textToSend,
      time: timeStr,
      speakTTS: currentRole === "parent" ? speakOnKid : false,
      requireResponse: currentRole === "parent" ? requireResponse : false,
      timestamp: nowTs,
    };

    const updated = [...messages.filter((m) => m.id !== "msg_1" && m.id !== "msg_2"), newMsg];
    setMessages(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setInputText("");

    // Sync message to Cloud (Local Server & Firestore)
    const parentId = getActiveParentId();
    sendCloudChatMessage(parentId, childId, newMsg, childName).catch((e) => {
      console.warn("sendCloudChatMessage error:", e);
    });

    // Parent UI feedback: DO NOT speak on Parent device!
    // Parent device should stay quiet so voice only plays on Kid device.
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-sm w-full h-[520px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Nhắn Tin Gia Đình</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentRole === "parent" ? `Trò chuyện với ${childName}` : "Trò chuyện với Bố Mẹ"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <div className="text-center my-1">
            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
              Tin nhắn mã hóa hai chiều • Đồng bộ Cloud
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.sender === currentRole;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center space-x-1 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-500">
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-400">{msg.time}</span>
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.speakTTS && (
                    <div className="flex items-center space-x-1 mt-1 text-[10px] text-blue-200">
                      <Volume2 size={11} className="animate-pulse" />
                      <span>Đã phát âm thanh trên máy con</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none flex space-x-1.5">
          {(currentRole === "parent" ? PARENT_QUICK_MESSAGES : KID_QUICK_RESPONSES).map(
            (phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(phrase)}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition cursor-pointer shrink-0"
              >
                {phrase}
              </button>
            )
          )}
        </div>

        {/* Parent Option: Text-to-speech & Mandatory Response */}
        {currentRole === "parent" && (
          <div className="px-4 py-1.5 bg-blue-50/60 border-t border-blue-100/50 flex items-center justify-between text-xs gap-2 flex-wrap">
            <label className="flex items-center space-x-1.5 text-[11px] text-blue-900 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={speakOnKid}
                onChange={(e) => setSpeakOnKid(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Volume2 size={12} className="text-blue-600" />
                <span>Đọc TTS máy con</span>
              </span>
            </label>

            <label className="flex items-center space-x-1.5 text-[11px] text-amber-900 font-bold cursor-pointer bg-amber-100/60 px-2 py-0.5 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                checked={requireResponse}
                onChange={(e) => setRequireResponse(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>Bắt buộc con trả lời</span>
            </label>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              currentRole === "parent"
                ? "Gửi lời dặn dò cho con..."
                : "Nhắn lại cho Bố/Mẹ..."
            }
            className="flex-1 bg-slate-100 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-2xl border-none focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
