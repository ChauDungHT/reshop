import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../lib/axios';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachment?: {
    data: string; // base64
    mime_type: string;
  };
  isThinking?: boolean;
  isError?: boolean;
}

const API_KEY = "AIzaSyCpBx5BQz_SmMKpoUgIWxkwdGJRM8fy1xE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;
const initialInputHeight = 47;

const Chatbot: React.FC = () => {
  const { user } = useAuth();
  const [toolPermissions, setToolPermissions] = useState<{ [key: string]: boolean }>({
    chatbot: true,
    read_image: true,
    search_image: true,
    product_recommendation: true,
    customer_consulting: true,
  });
  const [isAllowedChatbot, setIsAllowedChatbot] = useState<boolean | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Load tool permissions for the current user role
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axiosInstance.get('/tool-permissions');
        const permissions = response.data.data;
        const currentRole = user?.role || 'guest';
        
        const perms: { [key: string]: boolean } = {};
        permissions.forEach((p: any) => {
          perms[p.tool_code] = p.allowed_roles.includes(currentRole);
        });
        
        setToolPermissions(prev => ({ ...prev, ...perms }));
        setIsAllowedChatbot(perms.chatbot ?? true);
      } catch (err) {
        console.error('Failed to load chatbot tool permissions:', err);
        setIsAllowedChatbot(true); // default to true on error/fallback
      }
    };
    fetchPermissions();
  }, [user]);
  const [inputMessage, setInputMessage] = useState('');
  const [emojiMartLoaded, setEmojiMartLoaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mime_type: string; preview: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Xin chào! Tôi là trợ lý ảo CD Reshop. Tôi có thể giúp gì cho bạn hôm nay? 😊'
    }
  ]);

  const apiHistoryRef = useRef<{ role: string; parts: any[] }[]>([]);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const chatFormRef = useRef<HTMLFormElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Google Material Symbols
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@48,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,1,0';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Load EmojiMart Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js';
    script.async = true;
    script.onload = () => {
      setEmojiMartLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Toggle body class for open/close chatbot
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('show-chatbot');
    } else {
      document.body.classList.remove('show-chatbot');
    }
    return () => {
      document.body.classList.remove('show-chatbot');
    };
  }, [isOpen]);

  // Toggle body class for emoji picker
  useEffect(() => {
    if (showEmojiPicker) {
      document.body.classList.add('show-emoji-picker');
    } else {
      document.body.classList.remove('show-emoji-picker');
    }
    return () => {
      document.body.classList.remove('show-emoji-picker');
    };
  }, [showEmojiPicker]);

  // Handle outside clicks to close emoji picker
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showEmojiPicker && target.id !== 'emoji-picker' && !target.closest('em-emoji-picker')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showEmojiPicker]);

  // Initialize EmojiMart picker when loaded
  useEffect(() => {
    if (!emojiMartLoaded || !pickerContainerRef.current) return;

    pickerContainerRef.current.innerHTML = '';

    if ((window as any).EmojiMart) {
      const picker = document.createElement('em-emoji-picker');
      picker.setAttribute('theme', 'light');
      picker.setAttribute('skin-tone-position', 'none');
      picker.setAttribute('preview-position', 'none');

      picker.addEventListener('emoji-select', (e: any) => {
        const emoji = e.detail;
        const input = messageInputRef.current;
        if (!input) {
          setInputMessage(prev => prev + emoji.native);
          return;
        }

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = input.value;
        const nextText = text.substring(0, start) + emoji.native + text.substring(end);
        
        setInputMessage(nextText);

        setTimeout(() => {
          input.focus();
          const newCursorPos = start + emoji.native.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
          adjustInputHeight();
        }, 0);
      });

      pickerContainerRef.current.appendChild(picker);
    }
  }, [emojiMartLoaded, isOpen]);


  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const adjustInputHeight = () => {
    const input = messageInputRef.current;
    const form = chatFormRef.current;
    if (!input || !form) return;

    input.style.height = `${initialInputHeight}px`;
    input.style.height = `${input.scrollHeight}px`;
    form.style.borderRadius = input.scrollHeight > initialInputHeight ? "15px" : "32px";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustInputHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const userMessage = inputMessage.trim();
    if (e.key === 'Enter' && userMessage && !e.shiftKey && window.innerWidth > 768) {
      e.preventDefault();
      handleOutgoingMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const base64String = (event.target.result as string).split(",")[1];
      setSelectedFile({
        data: base64String,
        mime_type: file.type,
        preview: event.target.result as string
      });
      e.target.value = ''; // Reset file input
    };
    reader.readAsDataURL(file);
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
  };

  const handleOutgoingMessage = async () => {
    const userText = inputMessage.trim();
    if (!userText && !selectedFile) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      attachment: selectedFile ? { data: selectedFile.data, mime_type: selectedFile.mime_type } : undefined
    };

    // Store in API chat history
    apiHistoryRef.current.push({
      role: "user",
      parts: [
        { text: userText },
        ...(selectedFile ? [{ inline_data: { data: selectedFile.data, mime_type: selectedFile.mime_type } }] : []),
      ],
    });

    const thinkingId = (Date.now() + 1).toString();

    // Update messages to show user's message and the thinking state of bot
    setMessages(prev => [
      ...prev,
      userMsg,
      {
        id: thinkingId,
        role: 'model',
        text: '',
        isThinking: true
      }
    ]);

    // Reset input fields
    setInputMessage('');
    setSelectedFile(null);
    setShowEmojiPicker(false);

    if (messageInputRef.current) {
      messageInputRef.current.style.height = `${initialInputHeight}px`;
    }
    if (chatFormRef.current) {
      chatFormRef.current.style.borderRadius = "32px";
    }

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: apiHistoryRef.current,
        systemInstruction: {
          parts: [
            {
              text: "Bạn là trợ lý ảo thân thiện, chuyên nghiệp của sàn thương mại điện tử CD Reshop. Hãy hỗ trợ tư vấn khách hàng nhiệt tình, chính xác và ngắn gọn bằng tiếng Việt. Nếu người dùng tải ảnh lên, hãy phân tích ảnh đó liên quan tới câu hỏi của họ.",
            },
          ],
        },
      }),
    };

    try {
      const response = await fetch(API_URL, requestOptions);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Lỗi kết nối");

      const apiResponseText = data.candidates[0].content.parts[0].text.trim();

      // Update response text of thinking bot message
      setMessages(prev => prev.map(m => m.id === thinkingId ? {
        ...m,
        text: apiResponseText,
        isThinking: false
      } : m));

      // Store in API history
      apiHistoryRef.current.push({
        role: "model",
        parts: [{ text: apiResponseText }],
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === thinkingId ? {
        ...m,
        text: "Xin lỗi, đã xảy ra lỗi khi kết nối với máy chủ AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau! 😢",
        isThinking: false,
        isError: true
      } : m));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleOutgoingMessage();
  };

  if (isAllowedChatbot === false) {
    return null;
  }

  return (
    <>
      <button 
        id="chatbot-toggler" 
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Toggle Chatbot"
      >
        <span className="material-symbols-rounded">mode_comment</span>
        <span className="material-symbols-rounded">close</span>
      </button>

      <div className="chatbot-popup">
        <div className="chat-header">
          <div className="header-info">
            <svg className="chatbot-logo" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
              <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
            </svg>
            <h2 className="logo-text">Chatbot</h2>
          </div>
          <button id="close-chatbot" className="material-symbols-rounded" onClick={() => setIsOpen(false)}>
            keyboard_arrow_down
          </button>
        </div>

        <div className="chat-body" ref={chatBodyRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role === 'model' ? 'bot-message' : 'user-message'} ${msg.isThinking ? 'thinking' : ''}`}>
              {msg.role === 'model' && (
                <svg className="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                  <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                </svg>
              )}
              {msg.isThinking ? (
                <div className="message-text">
                  <div className="thinking-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="message-text" style={msg.isError ? { color: '#e11d48' } : undefined}>
                    {msg.text}
                  </div>
                  {msg.attachment && (
                    <img 
                      src={`data:${msg.attachment.mime_type};base64,${msg.attachment.data}`} 
                      className="attachment" 
                      alt="Attachment" 
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="chat-footer">
          <form ref={chatFormRef} onSubmit={handleFormSubmit} className="chat-form">
            <textarea 
              ref={messageInputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..." 
              className="message-input" 
              required={!selectedFile}
            />
            <div className="chat-controls">
              <button 
                type="button" 
                id="emoji-picker" 
                className="material-symbols-outlined"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                aria-label="Add Emoji"
              >
                sentiment_satisfied
              </button>
              {toolPermissions.read_image && (
                <div className={`file-upload-wrapper ${selectedFile ? 'file-uploaded' : ''}`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    hidden 
                  />
                  {selectedFile && <img src={selectedFile.preview} alt="Selected file" />}
                  <button 
                    type="button" 
                    id="file-upload" 
                    className="material-symbols-rounded"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload File"
                  >
                    attach_file
                  </button>
                  <button 
                    type="button" 
                    id="file-cancel" 
                    className="material-symbols-rounded"
                    onClick={handleCancelFile}
                    aria-label="Cancel Upload"
                  >
                    close
                  </button>
                </div>
              )}
              <button 
                type="submit" 
                id="send-message" 
                className="material-symbols-rounded"
                aria-label="Send Message"
              >
                arrow_upward
              </button>
            </div>
            {isOpen && <div ref={pickerContainerRef} />}
          </form>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
