import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, Paperclip, Brain, File, Image as ImageIcon, Settings, ChevronDown, Activity } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, streamGeminiChat, Attachment, SUPPORTED_MODELS } from '../services/geminiService';

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
  isExtensionMode?: boolean;
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
  setCustomInstructions,
  isExtensionMode = false
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'memory' | 'ruler' | 'instructions' | 'model'>('memory');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_selected_model') || 'gemini-2.5-flash');
  const [tokenUsage, setTokenUsage] = useState(() => {
    return parseInt(localStorage.getItem('gemini_token_usage') || '0');
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('gemini_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('gemini_token_usage', tokenUsage.toString());
  }, [tokenUsage]);

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
      // Estimate tokens for input (approx 1 token per 4 chars)
      const inputTokens = Math.ceil(messageToSend.length / 4) + 100; // +100 for system prompt overhead
      setTokenUsage(prev => prev + inputTokens);

      const stream = streamGeminiChat(messageToSend, currentAttachments, pageContent, messages, userMemory, promptRuler, customInstructions, selectedModel);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        // Estimate tokens for output
        setTokenUsage(prev => prev + Math.ceil(chunk.length / 4));
        
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
    <div className={`${isExtensionMode ? 'w-full' : 'w-96'} h-full bg-gray-900 border-l border-gray-700 flex flex-col shadow-lg transition-all duration-300 relative`}>
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-100">Gemini 助理</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMemoryModalOpen(true)}
            className="p-1.5 hover:bg-gray-700 rounded-md text-blue-400 transition-colors"
            title="數位身分與記憶體"
          >
            <Brain className="w-5 h-5" />
          </button>
          {!isExtensionMode && (
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isMemoryModalOpen && (
        <div className="absolute inset-0 bg-gray-900 z-50 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-gray-100">代理人設定</h3>
            </div>
            <button onClick={() => setIsMemoryModalOpen(false)} className="p-1 hover:bg-gray-700 rounded-md text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex border-b border-gray-700 bg-gray-900">
            <button 
              onClick={() => setActiveTab('memory')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'memory' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              記憶體
            </button>
            <button 
              onClick={() => setActiveTab('ruler')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ruler' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              提示詞
            </button>
            <button 
              onClick={() => setActiveTab('instructions')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'instructions' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              專屬指令
            </button>
            <button 
              onClick={() => setActiveTab('model')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'model' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              模型設定
            </button>
          </div>
          <div className="p-4 flex-1 flex flex-col bg-gray-800 overflow-y-auto">
            {activeTab === 'memory' && (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  在這裡定義您的數位資產、技能與偏好。您可以將 GPT 的記憶體直接貼在這裡，Gemini 代理人會讀取這些記憶，為您提供專屬的個人化服務。
                </p>
                <textarea
                  value={userMemory}
                  onChange={(e) => setUserMemory(e.target.value)}
                  className="flex-1 w-full p-4 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-100 leading-relaxed shadow-sm placeholder-gray-500"
                  placeholder="例如：&#10;姓名：小明&#10;職業：前端工程師&#10;技能：React, TypeScript, Node.js&#10;偏好：喜歡簡潔的程式碼，請用繁體中文回答。"
                />
              </>
            )}
            {activeTab === 'ruler' && (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  設定您的「提示詞」（Prompt）。在這裡放入您常用的提示詞模板或寫作規範，Gemini 會在回答時參考這些格式。
                </p>
                <textarea
                  value={promptRuler}
                  onChange={(e) => setPromptRuler(e.target.value)}
                  className="flex-1 w-full p-4 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-100 leading-relaxed shadow-sm placeholder-gray-500"
                  placeholder="例如：&#10;1. 摘要必須包含三個重點。&#10;2. 翻譯時請保留專業術語的英文。&#10;3. 程式碼請務必加上註解。"
                />
              </>
            )}
            {activeTab === 'instructions' && (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  給 Gemini 的專屬系統指令（Custom Instructions）。在這裡設定代理人的核心行為準則或角色扮演設定。
                </p>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="flex-1 w-full p-4 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-100 leading-relaxed shadow-sm placeholder-gray-500"
                  placeholder="例如：&#10;你是一個嚴格的程式碼審查員。&#10;回答時請直接切入重點，不要說廢話。&#10;請永遠使用繁體中文回答。"
                />
              </>
            )}
            {activeTab === 'model' && (
              <div className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" /> 選擇模型
                  </h4>
                  <div className="space-y-2">
                    {SUPPORTED_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedModel === model.id
                            ? 'bg-blue-900/30 border-blue-500 text-blue-100'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs opacity-60">{model.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" /> 使用量統計
                  </h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">本機累計 Token 使用量</span>
                    <span className="text-sm font-mono text-emerald-400">{tokenUsage.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((tokenUsage / 1000000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    * 註：此為本機估算值，實際額度請參考 Google AI Studio 帳單頁面。
                  </p>
                  <button 
                    onClick={() => setTokenUsage(0)}
                    className="mt-4 text-[10px] text-red-400 hover:text-red-300 underline"
                  >
                    重設統計
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-200">您好！我是您的 Gemini 助理。</p>
            <p className="text-sm mt-2 mb-6">我可以讀取您的數位身分與目前的網頁內容。支援上傳圖片與影片！現在還能幫您搜尋 Google Maps 與最新網路資訊！請問有什麼我可以幫忙的嗎？</p>
            
            <div className="flex flex-col gap-2 px-4">
              <button 
                onClick={() => handleSend('請幫我找附近的咖啡廳，並提供 Google Maps 連結。')}
                className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 py-2 px-4 rounded-lg transition-colors text-left"
              >
                📍 尋找附近地點
              </button>
              <button 
                onClick={() => handleSend('請幫我摘要目前網頁的內容。')}
                className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 py-2 px-4 rounded-lg transition-colors text-left"
              >
                📝 摘要網頁內容
              </button>
              <button 
                onClick={() => handleSend('根據我的數位身分與技能，這篇文章對我有什麼幫助？')}
                className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 py-2 px-4 rounded-lg transition-colors text-left"
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
                  : 'bg-gray-800 text-gray-100 rounded-tl-sm'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att, i) => (
                    <div key={i} className="w-32 h-32 bg-gray-900 rounded-md overflow-hidden border border-gray-700 relative">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                      ) : att.mimeType.startsWith('video/') ? (
                        <video src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" controls />
                      ) : att.mimeType.startsWith('audio/') ? (
                        <audio src={`data:${att.mimeType};base64,${att.data}`} className="w-full mt-10" controls />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 p-2 text-center">
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
                <div className="markdown-body prose prose-sm max-w-none prose-invert">
                  <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-gray-500 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-700 bg-gray-900">
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-b border-gray-800 bg-gray-800">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative flex-shrink-0 w-16 h-16 bg-gray-900 rounded-md border border-gray-700 flex items-center justify-center overflow-hidden">
                {att.mimeType.startsWith('image/') ? (
                  <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                ) : (
                  <File className="w-6 h-6 text-gray-400" />
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
            className="p-3 text-gray-400 hover:bg-gray-800 rounded-xl transition-colors"
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
            className="flex-1 resize-none min-h-[48px] max-h-32 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-100 placeholder-gray-500"
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
