/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MainContent } from './components/MainContent';
import { ChatSidebar } from './components/ChatSidebar';

export default function App() {
  const [content, setContent] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [userMemory, setUserMemory] = useState(() => {
    return localStorage.getItem('gemini_user_memory') || '姓名：\n職業：\n技能：\n偏好：\n數位資產：';
  });
  const [promptRuler, setPromptRuler] = useState(() => {
    return localStorage.getItem('gemini_prompt_ruler') || '';
  });
  const [customInstructions, setCustomInstructions] = useState(() => {
    return localStorage.getItem('gemini_custom_instructions') || '';
  });

  const [isExtensionMode, setIsExtensionMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('gemini_user_memory', userMemory);
  }, [userMemory]);

  useEffect(() => {
    localStorage.setItem('gemini_prompt_ruler', promptRuler);
  }, [promptRuler]);

  useEffect(() => {
    localStorage.setItem('gemini_custom_instructions', customInstructions);
  }, [customInstructions]);

  useEffect(() => {
    // 偵測是否在 Chrome 擴充功能環境中執行
    if (window.chrome && chrome.tabs && chrome.scripting) {
      setIsExtensionMode(true);
      
      const fetchCurrentTabContent = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab && activeTab.id) {
            // 檢查是否為受限的 URL (例如 chrome:// 或 edge://)
            if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
              setContent('無法讀取此頁面的內容 (受限的瀏覽器頁面)。');
              return;
            }

            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => document.body.innerText,
            }).then((results) => {
              if (results && results[0]) {
                setContent(results[0].result as string);
              }
            }).catch(err => console.error("無法讀取網頁內容: ", err));
          }
        });
      };

      // 初始抓取
      fetchCurrentTabContent();

      // 當切換分頁或網頁更新時，重新抓取內容
      chrome.tabs.onActivated.addListener(fetchCurrentTabContent);
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
          fetchCurrentTabContent();
        }
      });
    }
  }, []);

  if (isExtensionMode) {
    return (
      <div className="w-full h-screen bg-white overflow-hidden">
        <ChatSidebar 
          pageContent={content} 
          isOpen={true} 
          onClose={() => {}} 
          userMemory={userMemory}
          setUserMemory={setUserMemory}
          promptRuler={promptRuler}
          setPromptRuler={setPromptRuler}
          customInstructions={customInstructions}
          setCustomInstructions={setCustomInstructions}
          isExtensionMode={true}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-200 overflow-hidden font-sans p-2">
      <div className="flex w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-300">
        <MainContent 
          content={content} 
          setContent={setContent} 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <ChatSidebar 
          pageContent={content} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          userMemory={userMemory}
          setUserMemory={setUserMemory}
          promptRuler={promptRuler}
          setPromptRuler={setPromptRuler}
          customInstructions={customInstructions}
          setCustomInstructions={setCustomInstructions}
          isExtensionMode={false}
        />
      </div>
    </div>
  );
}


