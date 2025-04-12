// App.jsx - Main application component
import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { SendIcon, PlusIcon, MenuIcon, XIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css');

const Chat = () => {
  // Sample messages with math equations
  const sampleMessages = [
    {
      role: "user",
      content: "Can you explain Einstein's famous equation?"
    },
    {
      role: "assistant",
      content: "Einstein's famous equation relates energy and mass:\n\n$E = mc^2$\n\nWhere:\n- $E$ is energy\n- $m$ is mass\n- $c$ is the speed of light in a vacuum (approximately $3 \\times 10^8$ meters per second)\n\nThis equation fundamentally shows that mass and energy are equivalent and can be converted from one to another."
    },
    {
      role: "user",
      content: "What about the Pythagorean theorem?"
    },
    {
      role: "assistant",
      content: "The Pythagorean theorem states that in a right-angled triangle, the square of the length of the hypotenuse is equal to the sum of the squares of the other two sides.\n\nMathematically, it's expressed as:\n\n$a^2 + b^2 = c^2$\n\nWhere:\n- $a$ and $b$ are the lengths of the two legs of the triangle\n- $c$ is the length of the hypotenuse\n\nThis fundamental theorem has countless applications in mathematics, physics, engineering, and computer science. Here's a visual representation of the relationship:\n\n$$\\begin{array}{c}c^2 = a^2 + b^2\\\\c = \\sqrt{a^2 + b^2}\\end{array}$$"
    }
  ];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState("chat1");
  const [chats, setChats] = useState({
    chat1: { title: "Einstein's Equation", messages: sampleMessages },
    chat2: { title: "New Chat", messages: [] }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages for the current chat
  useEffect(() => {
    if (chats[currentChatId]) {
      setMessages(chats[currentChatId].messages);
    }
  }, [currentChatId, chats]);

  const handleSend = async () => {
    if (input.trim() === "") return;
    
    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    
    // Update the current chat
    const updatedChats = {
      ...chats,
      [currentChatId]: {
        ...chats[currentChatId],
        messages: updatedMessages,
        title: chats[currentChatId].title === "New Chat" ? input.slice(0, 30) : chats[currentChatId].title
      }
    };
    
    setChats(updatedChats);
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    
    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse = {
        role: "assistant",
        content: simulateAIResponse(input)
      };
      
      const withAiResponse = [...updatedMessages, aiResponse];
      
      setChats({
        ...updatedChats,
        [currentChatId]: {
          ...updatedChats[currentChatId],
          messages: withAiResponse
        }
      });
      
      setMessages(withAiResponse);
      setLoading(false);
    }, 1000);
  };

  const createNewChat = () => {
    const newChatId = `chat${Date.now()}`;
    setChats({
      ...chats,
      [newChatId]: { title: "New Chat", messages: [] }
    });
    setCurrentChatId(newChatId);
    setMessages([]);
    setMenuOpen(false);
  };

  const switchChat = (chatId) => {
    setCurrentChatId(chatId);
    setMenuOpen(false);
  };

  const deleteChat = (chatId) => {
    const updatedChats = { ...chats };
    delete updatedChats[chatId];
    
    if (Object.keys(updatedChats).length === 0) {
      const newChatId = `chat${Date.now()}`;
      updatedChats[newChatId] = { title: "New Chat", messages: [] };
      setCurrentChatId(newChatId);
    } else if (currentChatId === chatId) {
      setCurrentChatId(Object.keys(updatedChats)[0]);
    }
    
    setChats(updatedChats);
    setActiveDropdown(null);
    toast.success("Chat deleted");
  };

  const toggleDropdown = (chatId, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === chatId ? null : chatId);
  };

  // Simplified AI response simulator
  const simulateAIResponse = (query) => {
    // Include more math to demonstrate KaTeX rendering
    if (query.toLowerCase().includes("math") || query.toLowerCase().includes("equation")) {
      return "Here are some mathematical expressions rendered with KaTeX:\n\n**Quadratic Formula:**\n$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n\n**Euler's Identity:**\n$e^{i\\pi} + 1 = 0$\n\n**Calculus Derivative:**\n$$\\frac{d}{dx}[\\sin(x)] = \\cos(x)$$\n\n**Matrix Notation:**\n$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$";
    }
    
    return `I'm an AI assistant that's responding to your message: "${query}". \n\nI can help with various tasks including writing, coding, and answering questions. Let me know what else you need!`;
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
        className={`fixed lg:static w-64 h-full z-30 transform transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } bg-gray-800 flex flex-col`}
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
            <div 
              key={id}
              onClick={() => switchChat(id)}
              className={`flex items-center justify-between px-4 py-2 mx-2 rounded-md cursor-pointer ${
                currentChatId === id 
                  ? 'bg-gray-700' 
                  : 'hover:bg-gray-700/50 hover:bg-opacity-50'
              }`}
            >
              <span className="truncate flex-1">{chat.title}</span>
              <div className="relative">
                <button 
                  onClick={(e) => toggleDropdown(id, e)} 
                  className="text-gray-400 hover:text-white"
                >
                  <MoreVerticalIcon size={16} />
                </button>
                {activeDropdown === id && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-36 bg-gray-700 rounded-md shadow-lg z-40"
                  >
                    <button 
                      onClick={() => deleteChat(id)} 
                      className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-600 rounded-md"
                    >
                      <TrashIcon size={14} className="mr-2" />
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="py-2 px-4 flex items-center justify-between bg-gray-800 border-b border-gray-700">
          <button 
            onClick={() => setMenuOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <MenuIcon size={24} />
          </button>
          <h2 className="text-lg font-semibold ml-2 lg:ml-0">
            {chats[currentChatId]?.title || "New Chat"}
          </h2>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </header>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
              <p className="mb-8 text-gray-400">
                Ask me anything, and I'll do my best to assist you!
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-6 ${message.role === 'user' ? '' : ''}`}
              >
                <div className={`flex items-start gap-3`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      AI
                    </div>
                  )}
                  <div className={`rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white ml-auto'
                      : 'bg-gray-800 text-white'
                  } max-w-3xl`}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown 
                        children={message.content}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({node, inline, className, children, ...props}) {
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
                          p({children}) {
                            return <p className="mb-3 last:mb-0">{children}</p>;
                          },
                          ul({children}) {
                            return <ul className="list-disc pl-5 mb-3 last:mb-0">{children}</ul>;
                          },
                          ol({children}) {
                            return <ol className="list-decimal pl-5 mb-3 last:mb-0">{children}</ol>;
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <div>{message.content}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
          
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
        </div>
        
        {/* Input area */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center relative">
            <textarea
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
                input.trim() === "" 
                  ? 'text-gray-500' 
                  : 'text-blue-400 hover:text-blue-300'
              } disabled:opacity-70`}
            >
              <SendIcon size={20} />
            </button>
          </div>
          <div className="text-xs mt-2 text-gray-400 text-center">
            AI responses are simulated. Connect to a real API for production use.
          </div>
        </div>
      </div>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#374151',
            color: '#ffffff',
          },
        }}
      />
    </div>
  );
};

export default Chat;

