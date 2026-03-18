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

  useEffect(() => {
    localStorage.setItem('gemini_user_memory', userMemory);
  }, [userMemory]);

  useEffect(() => {
    localStorage.setItem('gemini_prompt_ruler', promptRuler);
  }, [promptRuler]);

  useEffect(() => {
    localStorage.setItem('gemini_custom_instructions', customInstructions);
  }, [customInstructions]);

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
        />
      </div>
    </div>
  );
}


