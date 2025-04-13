import React, { useState, useEffect, useRef } from "react";
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
const Chat = () => {
    const { agentid, chatid } = useParams();
    const navigate = useNavigate();

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [chats, setChats] = useState({});
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [chatTitle, setChatTitle] = useState("New Chat");
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

    // Load initial chat data and chats list
    useEffect(() => {
        fetchChats();

        if (chatid) {
            setCurrentChatId(chatid);
            fetchChat(chatid);
        }
    }, [chatid, agentid]);

    // Fetch all chats for this user
    const fetchChats = async () => {
        try {
            const response = await axios.get("http://localhost:8000/api/chat/", {
                withCredentials: true,
            });

            const chatList = response.data.data.chats;

            // Filter chats that belong to the current agent
            const agentChats = chatList.filter(chat => chat.agentId?._id === agentid);

            // Transform to the format our component expects
            const transformedChats = {};
            agentChats.forEach(chat => {
                transformedChats[chat._id] = {
                    title: chat.title,
                    messages: chat.messages || []
                };
            });

            setChats(transformedChats);
        } catch (error) {
            console.error("Error fetching chats:", error);
            toast.error("Failed to load chats");
        }
    };

    // Fetch a specific chat
    const fetchChat = async (chatId) => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/api/chat/${chatId}`, {
                withCredentials: true,
            });

            const chatData = response.data.data.chat;
            setMessages(chatData.messages || []);
            setChatTitle(chatData.title);

            // Update our chats state with this chat data
            setChats(prev => ({
                ...prev,
                [chatId]: {
                    title: chatData.title,
                    messages: chatData.messages || []
                }
            }));
        } catch (error) {
            console.error("Error fetching chat:", error);
            toast.error("Failed to load chat");
        } finally {
            setLoading(false);
        }
    };

    // Scroll to bottom of messages when they change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (input.trim() === "") return;

        const userMessage = { role: "user", content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            // If we don't have a chat yet, create one
            if (!currentChatId) {
                const createResponse = await axios.post(
                    "http://localhost:8000/api/chat/create",
                    {
                        agentId: agentid,
                        title: input.slice(0, 30) // Use first part of message as title
                    },
                    { withCredentials: true }
                );

                const newChatId = createResponse.data.data.chat._id;
                setCurrentChatId(newChatId);

                // Update URL with new chat ID
                navigate(`/aiagents/${agentid}/chat/${newChatId}`);
            }

            // Send the message to the backend
            const response = await axios.post(
                `http://localhost:8000/api/chat/${currentChatId}/message`,
                { message: input },
                { withCredentials: true }
            );

            // Add the AI response to messages
            const aiMessage = response.data.data.message;
            setMessages(prev => [...prev, aiMessage]);

            // Refresh chats list to update chat titles
            fetchChats();

        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
            // Remove the user message if it failed
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const createNewChat = async () => {
        try {
            const response = await axios.post(
                "http://localhost:8000/api/chat/create",
                {
                    agentId: agentid,
                    title: "New Chat"
                },
                { withCredentials: true }
            );

            const newChatId = response.data.data.chat._id;

            // Navigate to the new chat
            navigate(`/aiagents/${agentid}/chat/${newChatId}`);

            // Update local state
            setCurrentChatId(newChatId);
            setMessages([]);
            setChatTitle("New Chat");

            // Refresh chats list
            fetchChats();

            setMenuOpen(false);
        } catch (error) {
            console.error("Error creating chat:", error);
            toast.error("Failed to create new chat");
        }
    };

    const switchChat = (chatId) => {
        navigate(`/aiagents/${agentid}/chat/${chatId}`);
        setMenuOpen(false);
    };

    const deleteChat = async (chatId) => {
        try {
            await axios.delete(`http://localhost:8000/api/chat/${chatId}`, {
                withCredentials: true,
            });

            // Remove from local state
            const updatedChats = { ...chats };
            delete updatedChats[chatId];
            setChats(updatedChats);

            // If we deleted the current chat, navigate to another chat or create a new one
            if (currentChatId === chatId) {
                const remainingChatIds = Object.keys(updatedChats);
                if (remainingChatIds.length > 0) {
                    // Navigate to the first remaining chat
                    navigate(`/aiagents/${agentid}/chat/${remainingChatIds[0]}`);
                } else {
                    // If no chats left, create a new one
                    navigate(`/aiagents/${agentid}`);
                    setMessages([]);
                    setCurrentChatId(null);
                }
            }

            toast.success("Chat deleted");
            setActiveDropdown(null);
        } catch (error) {
            console.error("Error deleting chat:", error);
            toast.error("Failed to delete chat");
        }
    };

    const updateTitle = async (chatId, newTitle) => {
        try {
            await axios.patch(
                `http://localhost:8000/api/chat/${chatId}/title`,
                { title: newTitle },
                { withCredentials: true }
            );

            // Update local state
            setChatTitle(newTitle);
            setChats(prev => ({
                ...prev,
                [chatId]: {
                    ...prev[chatId],
                    title: newTitle
                }
            }));

        } catch (error) {
            console.error("Error updating chat title:", error);
            toast.error("Failed to update chat title");
        }
    };

    const toggleDropdown = (chatId, e) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === chatId ? null : chatId);
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
                className={`fixed lg:static w-64 h-full z-30 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
                            className={`flex items-center justify-between px-4 py-2 mx-2 rounded-md cursor-pointer ${currentChatId === id
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
                        {chatTitle}
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
                                    <div className={`rounded-lg px-4 py-3 ${message.role === 'user'
                                        ? 'bg-blue-600 text-white ml-auto'
                                        : 'bg-gray-800 text-white'
                                        } max-w-3xl`}>
                                        {message.role === 'assistant' ? (
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
                                                    p({ children }) {
                                                        return <p className="mb-3 last:mb-0">{children}</p>;
                                                    },
                                                    ul({ children }) {
                                                        return <ul className="list-disc pl-5 mb-3 last:mb-0">{children}</ul>;
                                                    },
                                                    ol({ children }) {
                                                        return <ol className="list-decimal pl-5 mb-3 last:mb-0">{children}</ol>;
                                                    },
                                                    table({ children }) {
                                                        return (
                                                            <div className="overflow-x-auto my-4">
                                                                <table className="w-full border border-gray-700 border-collapse text-sm">
                                                                    {children}
                                                                </table>
                                                            </div>
                                                        );
                                                    },
                                                    thead({ children }) {
                                                        return (
                                                            <thead className="bg-gray-800 text-white">
                                                                {children}
                                                            </thead>
                                                        );
                                                    },
                                                    tbody({ children }) {
                                                        return (
                                                            <tbody className="divide-y divide-gray-700">
                                                                {children}
                                                            </tbody>
                                                        );
                                                    },
                                                    tr({ children }) {
                                                        return (
                                                            <tr className="hover:bg-gray-700 transition">
                                                                {children}
                                                            </tr>
                                                        );
                                                    },
                                                    th({ children }) {
                                                        return (
                                                            <th className="border border-gray-600 px-4 py-2 text-left font-medium">
                                                                {children}
                                                            </th>
                                                        );
                                                    },
                                                    td({ children }) {
                                                        return (
                                                            <td className="border border-gray-600 px-4 py-2">
                                                                {children}
                                                            </td>
                                                        );
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
                            className={`absolute right-3 ${input.trim() === ""
                                ? 'text-gray-500'
                                : 'text-blue-400 hover:text-blue-300'
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

