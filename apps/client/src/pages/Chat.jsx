import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { SendIcon, PlusIcon, MenuIcon, XIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import axios from "axios";
import { useParams, useNavigate } from "react-router";
import "katex/dist/katex.min.css";
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';

// API Service
const API_BASE_URL = "http://localhost:8000/api";

const apiService = {
  getChats: () => axios.get(`${API_BASE_URL}/chat/`, { withCredentials: true }),
  getChat: (chatId) => axios.get(`${API_BASE_URL}/chat/${chatId}`, { withCredentials: true }),
  createChat: (agentId, title) => axios.post(`${API_BASE_URL}/chat/create`, { agentId, title }, { withCredentials: true }),
  sendMessage: (chatId, message) => axios.post(`${API_BASE_URL}/chat/${chatId}/message`, { message }, { withCredentials: true }),
  updateChatTitle: (chatId, title) => axios.patch(`${API_BASE_URL}/chat/${chatId}/title`, { title }, { withCredentials: true }),
  deleteChat: (chatId) => axios.delete(`${API_BASE_URL}/chat/${chatId}`, { withCredentials: true }),
 sendMessage: (chatId, message, selectedFile = null) => 
    axios.post(
      `${API_BASE_URL}/chat/${chatId}/message`, 
      { message, selectedFile }, 
      { withCredentials: true }
    ),
};
// Add this component to display file selection options
const FileSelector = ({ files, onSelectFile, selectedFile }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md"
      >
        <span>{selectedFile ? selectedFile : "Select file"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-56 bg-gray-800 rounded-md shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                onSelectFile(null);
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
            >
              Use normal search
            </button>
            {files.map((file) => (
              <button
                key={file._id}
                onClick={() => {
                  onSelectFile(file.originalName);
                  setShowDropdown(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
              >
                {file.originalName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
// Message Component
const Message = React.memo(({ message }) => {
  return message.role === 'user' ? (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg px-4 py-3 bg-blue-600 text-white ml-auto max-w-3xl">
          {message.content}
        </div>
      </div>
    </div>
  ) : (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        <div className="rounded-lg px-4 py-3 bg-gray-800 text-white max-w-3xl">
          <ReactMarkdown
            children={message.content}
            remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre className="bg-gray-700 rounded p-3 overflow-x-auto my-3">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={inline ? "bg-gray-700 px-1 rounded" : className} {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 last:mb-0">{children}</ol>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="w-full border border-gray-700 border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-800 text-white">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-gray-700">{children}</tbody>,
              tr: ({ children }) => <tr className="hover:bg-gray-700 transition">{children}</tr>,
              th: ({ children }) => <th className="border border-gray-600 px-4 py-2 text-left font-medium">{children}</th>,
              td: ({ children }) => <td className="border border-gray-600 px-4 py-2">{children}</td>
            }}
          />
        </div>
      </div>
    </div>
  );
});

// Chat List Item Component
const ChatListItem = ({ chatId, title, isActive, onSelect, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };
  
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(chatId);
    setShowMenu(false);
  };
  
  return (
    <div
      onClick={() => onSelect(chatId)}
      className={`flex items-center justify-between px-4 py-2 mx-2 rounded-md cursor-pointer ${
        isActive ? 'bg-gray-700' : 'hover:bg-gray-700/50'
      }`}
    >
      <span className="truncate flex-1">{title}</span>
      <div className="relative">
        <button
          onClick={handleMenuClick}
          className="text-gray-400 hover:text-white"
        >
          <MoreVerticalIcon size={16} />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-36 bg-gray-700 rounded-md shadow-lg z-40">
            <button
              onClick={handleDeleteClick}
              className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-600 rounded-md"
            >
              <TrashIcon size={14} className="mr-2" />
              Delete Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Chat Component
const Chat = () => {
  const { agentid, chatid } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
const [agentFiles, setAgentFiles] = useState([]);
const [selectedFile, setSelectedFile] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatid || null);
  const [chats, setChats] = useState({});
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Handle scroll position
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShouldAutoScroll(isNearBottom);
  }, []);
const fetchAgentFiles = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/agent/${agentid}/files`, { 
      withCredentials: true 
    });
    setAgentFiles(response.data.data.files || []);
  } catch (error) {
    console.error("Error fetching agent files:", error);
  }
};
  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Manual scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShouldAutoScroll(true);
  };

  // Fix layout when messages load from database
  useEffect(() => {
    if (messagesLoaded && messages.length > 0) {
      // Set a timeout to allow the DOM to update with the messages first
      const timer = setTimeout(() => {
        // Force layout recalculation
        if (messagesContainerRef.current) {
          messagesContainerRef.current.style.display = 'none';
          // Force a reflow
          void messagesContainerRef.current.offsetHeight;
          messagesContainerRef.current.style.display = '';
          
          // Then scroll to bottom
          scrollToBottom();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [messagesLoaded, messages.length]);

  // Load initial chat data
  useEffect(() => {
  fetchChats().then(() => {
    if (chatid) {
      setCurrentChatId(chatid);
      fetchChat(chatid).then(() => {
        setMessagesLoaded(true);
        setTimeout(scrollToBottom, 100);
      });
    }
    
    // Fetch agent files
    if (agentid) {
      fetchAgentFiles();
    }
  });
}, [agentid, chatid]);

  // Click outside to close any menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.sidebar') && !e.target.closest('.menu-button')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Fetch all chats
  const fetchChats = async () => {
    try {
      const response = await apiService.getChats();
      const chatList = response.data.data.chats;
      
      // Filter chats for current agent
      const agentChats = chatList.filter(chat => chat.agentId?._id === agentid);
      
      // Transform to object format for easier access
      const transformedChats = agentChats.reduce((acc, chat) => {
        acc[chat._id] = {
          title: chat.title,
          messages: chat.messages || []
        };
        return acc;
      }, {});
      
      setChats(transformedChats);
      return transformedChats;
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
      return {};
    }
  };

  // Fetch a specific chat
  const fetchChat = async (chatId) => {
    try {
      setLoading(true);
      setMessagesLoaded(false);
      const response = await apiService.getChat(chatId);
      const chatData = response.data.data.chat;
      
      setMessages(chatData.messages || []);
      setChatTitle(chatData.title);
      
      // Update chats state
      setChats(prev => ({
        ...prev,
        [chatId]: {
          title: chatData.title,
          messages: chatData.messages || []
        }
      }));

      return chatData;
    } catch (error) {
      console.error("Error fetching chat:", error);
      toast.error("Failed to load chat");
      return null;
    } finally {
      setLoading(false);
      // Mark messages as loaded after state updates
      setTimeout(() => setMessagesLoaded(true), 0);
    }
  };

  // Send message handler
// Update the handleSend function to include selectedFile
const handleSend = async () => {
  if (input.trim() === "") return;
  
  const userMessage = { role: "user", content: input, timestamp: new Date() };
  setMessages(prev => [...prev, userMessage]);
  setInput("");
  setLoading(true);
  setShouldAutoScroll(true);
  
  try {
    // Create a new chat if needed
    let chatIdToUse = currentChatId;
    
    if (!chatIdToUse) {
      const createResponse = await apiService.createChat(
        agentid,
        input.slice(0, 30)
      );
      
      chatIdToUse = createResponse.data.data.chat._id;
      setCurrentChatId(chatIdToUse);
      setChatTitle(createResponse.data.data.chat.title);
      
      navigate(`/aiagents/${agentid}/chat/${chatIdToUse}`);
    }
    
    // Send message with selected file if any
    const response = await apiService.sendMessage(
      chatIdToUse, 
      input, 
      selectedFile // Pass the selected file name
    );
    
    const aiMessage = response.data.data.message;
    
    setMessages(prev => [...prev, aiMessage]);
    
    // Refresh chat list
    fetchChats();
    
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Failed to send message");
    setMessages(prev => prev.slice(0, -1));
  } finally {
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  }
};

  // Create new chat
  const createNewChat = async () => {
    try {
      const response = await apiService.createChat(agentid, "New Chat");
      const newChatId = response.data.data.chat._id;
      
      // Navigate to new chat
      navigate(`/aiagents/${agentid}/chat/${newChatId}`);
      
      // Update state
      setCurrentChatId(newChatId);
      setMessages([]);
      setChatTitle("New Chat");
      setShouldAutoScroll(true);
      
      // Update chats list
      await fetchChats();
      
      // Close mobile menu
      setMenuOpen(false);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create new chat");
    }
  };

  // Switch to a different chat
  const switchChat = useCallback((chatId) => {
    navigate(`/aiagents/${agentid}/chat/${chatId}`);
    setMenuOpen(false);
    setShouldAutoScroll(true);
  }, [navigate, agentid]);

  // Delete a chat
  const deleteChat = async (chatId) => {
    try {
      await apiService.deleteChat(chatId);
      
      // Update local state
      const updatedChats = { ...chats };
      delete updatedChats[chatId];
      setChats(updatedChats);
      
      // Navigate if needed
      if (currentChatId === chatId) {
        const remainingChatIds = Object.keys(updatedChats);
        if (remainingChatIds.length > 0) {
          navigate(`/aiagents/${agentid}/chat/${remainingChatIds[0]}`);
        } else {
          navigate(`/aiagents/${agentid}`);
          setMessages([]);
          setCurrentChatId(null);
          setChatTitle("New Chat");
        }
        setShouldAutoScroll(true);
      }
      
      toast.success("Chat deleted");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static w-64 h-full z-30 transform transition-transform duration-300 
          ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          bg-gray-800 flex flex-col sidebar`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="font-bold text-xl">AI Chat</h1>
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <XIcon size={20} />
          </button>
        </div>

        <button
          onClick={createNewChat}
          className="mx-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
        >
          <PlusIcon size={16} className="mr-2" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto py-2">
          {Object.entries(chats).map(([id, chat]) => (
            <ChatListItem
              key={id}
              chatId={id}
              title={chat.title}
              isActive={currentChatId === id}
              onSelect={switchChat}
              onDelete={deleteChat}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full lg:ml-0 relative">
        {/* Header */}
        <header className="py-2 px-4 flex items-center justify-between bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white menu-button"
          >
            <MenuIcon size={24} />
          </button>
          <h2 className="text-lg font-semibold ml-2 lg:ml-0 truncate">
            {chatTitle}
          </h2>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </header>

        {/* Messages container - FIXED LAYOUT */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-900"
style={{ position: 'absolute', top: '49px', bottom: '112px', left: 0, right: 0 }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
              <p className="mb-8 text-gray-400">
                Ask me anything, and I'll do my best to assist you!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={`msg-${index}`} message={message} />
              ))}
              
              {/* Loading indicator */}
              {loading && (
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    AI
                  </div>
                  <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-75"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Element for scroll reference */}
          <div ref={messagesEndRef} className="h-px w-full"></div>
        </div>

        {/* "Scroll to bottom" button - shows when not at bottom */}
        {!shouldAutoScroll && messages.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-4 bg-gray-700 hover:bg-gray-600 rounded-full p-2 shadow-lg z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7 7 7-7"/>
            </svg>
          </button>
        )}

{/* Add this before the Input area */}
<div className="p-2 bg-gray-800 border-t border-gray-700 absolute bottom-[80px] left-0 right-0 flex justify-center">
  <FileSelector 
    files={agentFiles.filter(file => file.status === 'completed')} 
    onSelectFile={setSelectedFile}
    selectedFile={selectedFile}
  />
</div>

{/* Update the Input area's positioning to account for the file selector */}
<div className="p-4 bg-gray-800 border-t border-gray-700 absolute bottom-0 left-0 right-0">
          <div className="flex items-center relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="w-full py-3 px-4 pr-12 rounded-lg resize-none bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 outline-none border focus:ring-2"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={loading || input.trim() === ""}
              className={`absolute right-3 ${
                input.trim() === "" ? 'text-gray-500' : 'text-blue-400 hover:text-blue-300'
              } disabled:opacity-70`}
            >
              <SendIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;





