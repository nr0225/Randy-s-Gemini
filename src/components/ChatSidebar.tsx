import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, Paperclip, Brain, File, Image as ImageIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, streamGeminiChat, Attachment } from '../services/geminiService';

interface ChatSidebarProps {
  pageContent: string;
  isOpen: boolean;
  onClose: () => void;
  userMemory: string;
  setUserMemory: (memory: string) => void;
  promptRuler: string;
  setPromptRuler: (ruler: string) => void;
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
}

export function ChatSidebar({ 
  pageContent, 
  isOpen, 
  onClose, 
  userMemory, 
  setUserMemory,
  promptRuler,
  setPromptRuler,
  customInstructions,
  setCustomInstructions
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'memory' | 'ruler' | 'instructions'>('memory');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setPendingAttachments(prev => [...prev, {
          mimeType: file.type,
          data: base64String,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input;
    if ((!messageToSend.trim() && pendingAttachments.length === 0) || isLoading) return;

    const currentAttachments = [...pendingAttachments];
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageToSend,
      attachments: currentAttachments,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setPendingAttachments([]);
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: 'model', text: '', isStreaming: true },
    ]);

    try {
      const stream = streamGeminiChat(messageToSend, currentAttachments, pageContent, messages, userMemory, promptRuler, customInstructions);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: fullText } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, text: '抱歉，我遇到了一些錯誤，請再試一次。' }
            : msg
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg transition-all duration-300 relative">
      <div className="p-4 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Gemini 助理</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMemoryModalOpen(true)}
            className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
            title="數位身分與記憶體"
          >
            <Brain className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-blue-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isMemoryModalOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-800">代理人設定</h3>
            </div>
            <button onClick={() => setIsMemoryModalOpen(false)} className="p-1 hover:bg-purple-100 rounded-md text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex border-b border-gray-200 bg-white">
            <button 
              onClick={() => setActiveTab('memory')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'memory' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              記憶體
            </button>
            <button 
              onClick={() => setActiveTab('ruler')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ruler' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              提示詞
            </button>
            <button 
              onClick={() => setActiveTab('instructions')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'instructions' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              專屬指令
            </button>
          </div>
          <div className="p-4 flex-1 flex flex-col bg-gray-50 overflow-y-auto">
            {activeTab === 'memory' && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  在這裡定義您的數位資產、技能與偏好。您可以將 GPT 的記憶體直接貼在這裡，Gemini 代理人會讀取這些記憶，為您提供專屬的個人化服務。
                </p>
                <textarea
                  value={userMemory}
                  onChange={(e) => setUserMemory(e.target.value)}
                  className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-700 leading-relaxed shadow-sm"
                  placeholder="例如：&#10;姓名：小明&#10;職業：前端工程師&#10;技能：React, TypeScript, Node.js&#10;偏好：喜歡簡潔的程式碼，請用繁體中文回答。"
                />
              </>
            )}
            {activeTab === 'ruler' && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  設定您的「提示詞」（Prompt）。在這裡放入您常用的提示詞模板或寫作規範，Gemini 會在回答時參考這些格式。
                </p>
                <textarea
                  value={promptRuler}
                  onChange={(e) => setPromptRuler(e.target.value)}
                  className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-700 leading-relaxed shadow-sm"
                  placeholder="例如：&#10;1. 摘要必須包含三個重點。&#10;2. 翻譯時請保留專業術語的英文。&#10;3. 程式碼請務必加上註解。"
                />
              </>
            )}
            {activeTab === 'instructions' && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  給 Gemini 的專屬系統指令（Custom Instructions）。在這裡設定代理人的核心行為準則或角色扮演設定。
                </p>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-700 leading-relaxed shadow-sm"
                  placeholder="例如：&#10;你是一個嚴格的程式碼審查員。&#10;回答時請直接切入重點，不要說廢話。&#10;請永遠使用繁體中文回答。"
                />
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>您好！我是您的 Gemini 助理。</p>
            <p className="text-sm mt-2 mb-6">我可以讀取您的數位身分與目前的網頁內容。支援上傳圖片與影片！現在還能幫您搜尋 Google Maps 與最新網路資訊！請問有什麼我可以幫忙的嗎？</p>
            
            <div className="flex flex-col gap-2 px-4">
              <button 
                onClick={() => handleSend('請幫我找附近的咖啡廳，並提供 Google Maps 連結。')}
                className="text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-left"
              >
                📍 尋找附近地點
              </button>
              <button 
                onClick={() => handleSend('請幫我摘要目前網頁的內容。')}
                className="text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-left"
              >
                📝 摘要網頁內容
              </button>
              <button 
                onClick={() => handleSend('根據我的數位身分與技能，這篇文章對我有什麼幫助？')}
                className="text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-left"
              >
                🧠 結合我的數位身分分析
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att, i) => (
                    <div key={i} className="w-32 h-32 bg-white rounded-md overflow-hidden border border-gray-200 relative">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                      ) : att.mimeType.startsWith('video/') ? (
                        <video src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" controls />
                      ) : att.mimeType.startsWith('audio/') ? (
                        <audio src={`data:${att.mimeType};base64,${att.data}`} className="w-full mt-10" controls />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 p-2 text-center">
                          <File className="w-8 h-8 mb-1" />
                          <span className="truncate w-full">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="markdown-body prose prose-sm max-w-none dark:prose-invert">
                  <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white">
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-b border-gray-100 bg-gray-50">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative flex-shrink-0 w-16 h-16 bg-white rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
                {att.mimeType.startsWith('image/') ? (
                  <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                ) : (
                  <File className="w-6 h-6 text-gray-500" />
                )}
                <button 
                  onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} 
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5 hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 flex gap-2 items-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,video/*,audio/*"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            title="上傳圖片、影片或音訊"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="詢問 Gemini..."
            className="flex-1 resize-none min-h-[48px] max-h-32 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
