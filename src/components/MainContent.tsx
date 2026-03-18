import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, RotateCw, PanelRightOpen, PanelRightClose, Shield } from 'lucide-react';

interface MainContentProps {
  content: string;
  setContent: (content: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function MainContent({ content, setContent, isSidebarOpen, toggleSidebar }: MainContentProps) {
  const [url, setUrl] = useState('https://example.com/article');

  return (
    <div className="flex flex-col flex-1 h-full bg-white relative transition-all duration-300">
      {/* Browser Toolbar */}
      <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-gray-300 gap-4">
        <div className="flex items-center gap-2 text-gray-500">
          <ChevronLeft className="w-5 h-5 cursor-pointer hover:text-gray-800" />
          <ChevronRight className="w-5 h-5 cursor-pointer hover:text-gray-800" />
          <RotateCw className="w-4 h-4 cursor-pointer hover:text-gray-800 ml-1" />
        </div>
        
        <div className="flex-1 max-w-2xl flex items-center bg-white rounded-full px-4 py-1.5 border border-gray-300 shadow-sm">
          <Shield className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-700"
            placeholder="Search or enter website name"
          />
        </div>

        <div className="flex items-center ml-auto gap-3">
          <button 
            onClick={toggleSidebar}
            className={`p-1.5 rounded-md transition-colors ${isSidebarOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-600'}`}
            title="Toggle Gemini Extension"
          >
            {isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Browser Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm min-h-full border border-gray-100">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">模擬網頁內容</h1>
          <p className="text-gray-500 mb-4 text-sm">
            （在真實的瀏覽器擴充功能中，這裡會是實際的網頁內容。在這裡，您可以貼上或輸入文字來模擬正在閱讀的網頁。）
          </p>
          <textarea
            className="w-full h-[calc(100vh-300px)] p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700 text-lg"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="請在此處輸入或貼上文章內容... 然後您可以請右側的 Gemini 擴充功能幫您摘要、翻譯或回答相關問題！"
          />
        </div>
      </div>
    </div>
  );
}

