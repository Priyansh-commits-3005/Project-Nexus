"use client";
import { useState, useRef, useEffect, useContext } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from './components/ThemeProvider';
import Sidebar from "./components/sidebar";
import InputBox from "./components/inputText";
import Dropdown from "./components/dropdown";
import MessageBubble from "./components/messageBubble";

interface Message {
    role: 'user' | 'ai';
    content: string;
    model?: string;
    timestamp: Date;
    isThinking?: boolean;
    thinkingContent?: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    lastActivity: Date;
    model: string;
}

export default function Landing() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [prompt, setPrompt] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [model, setModel] = useState('Gemini');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    
    // Load conversations after hydration
    useEffect(() => {
        const saved = localStorage.getItem('nexus_conversations');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Convert date strings back to Date objects
            const convertedConversations = parsed.map((conv: any) => ({
                ...conv,
                createdAt: new Date(conv.createdAt),
                lastActivity: new Date(conv.lastActivity),
                messages: conv.messages.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            }));
            setConversations(convertedConversations);
        }
        setIsHydrated(true);
    }, []);
    
    const modelOptions = ['Gemini', 'DeepSeek'];
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Helper functions
    const generateConversationId = () => {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    const generateConversationTitle = (firstMessage: string) => {
        const maxLength = 50;
        if (firstMessage.length <= maxLength) {
            return firstMessage;
        }
        return firstMessage.substring(0, maxLength).trim() + '...';
    };

    const getCurrentConversation = () => {
        return conversations.find(conv => conv.id === activeConversationId) || null;
    };

    const getCurrentMessages = () => {
        const currentConv = getCurrentConversation();
        return currentConv ? currentConv.messages : [];
    };

    // Persist conversations
    useEffect(() => {
        localStorage.setItem('nexus_conversations', JSON.stringify(conversations));
    }, [conversations]);
    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [getCurrentMessages().length]);

    const handleSend = async () => {
        if (!prompt.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: prompt,
            timestamp: new Date()
        };

        let currentConversationId = activeConversationId;
        
        // If no active conversation, create a new one
        if (!currentConversationId) {
            currentConversationId = generateConversationId();
            const newConversation: Conversation = {
                id: currentConversationId,
                title: generateConversationTitle(prompt),
                messages: [],
                createdAt: new Date(),
                lastActivity: new Date(),
                model: model
            };
            setConversations(prev => [newConversation, ...prev]);
            setActiveConversationId(currentConversationId);
        }

        // Add user message to current conversation
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId 
                ? { 
                    ...conv, 
                    messages: [...conv.messages, userMessage],
                    lastActivity: new Date()
                }
                : conv
        ));

        const currentPrompt = prompt;
        setPrompt("");
        setIsLoading(true);

        // For DeepSeek model, show thinking state
        if (model === 'DeepSeek') {
            setIsThinking(true);
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/ChatResponse/${model}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    prompt: currentPrompt,
                    thread_id: currentConversationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle simple JSON response instead of streaming
            const data = await response.json();
            let aiContent = data.response || 'Sorry, I couldn\'t process your request.';

            // Process the complete response for thinking content (DeepSeek)
            let thinkingContent = '';
            
            if (model === 'DeepSeek' && aiContent) {
                // Check if the response contains thinking tags
                const thinkingMatch = aiContent.match(/<think>([\s\S]*?)<\/think>/);
                if (thinkingMatch) {
                    thinkingContent = thinkingMatch[1].trim();
                    // Remove thinking tags from the main content
                    aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                }
            }

            const aiMessage: Message = {
                role: 'ai',
                content: aiContent,
                model: model,
                timestamp: new Date(),
                isThinking: !!thinkingContent,
                thinkingContent: thinkingContent || undefined
            };

            // Add AI response to current conversation
            setConversations(prev => prev.map(conv => 
                conv.id === currentConversationId 
                    ? { 
                        ...conv, 
                        messages: [...conv.messages, aiMessage],
                        lastActivity: new Date()
                    }
                    : conv
            ));
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                role: 'ai',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                model: model,
                timestamp: new Date()
            };
            
            // Add error message to current conversation
            setConversations(prev => prev.map(conv => 
                conv.id === currentConversationId 
                    ? { 
                        ...conv, 
                        messages: [...conv.messages, errorMessage],
                        lastActivity: new Date()
                    }
                    : conv
            ));
        } finally {
            setIsLoading(false);
            setIsThinking(false);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setPrompt("");
        setIsLoading(false);
        setIsThinking(false);
    };

    const handleConversationSelect = (conversationId: string) => {
        setActiveConversationId(conversationId);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleDeleteConversation = (conversationId: string) => {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If we deleted the active conversation, clear the active conversation
        if (conversationId === activeConversationId) {
            setActiveConversationId(null);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500">
            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {isHydrated && (
                    <Sidebar 
                        conversations={conversations}
                        activeConversationId={activeConversationId}
                        onNewChat={handleNewChat}
                        onConversationSelect={handleConversationSelect}
                        onDeleteConversation={handleDeleteConversation}
                    />
                )}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            Nexus <span className="text-gradient">AI Chat</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-2xl"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? '🌞' : '🌙'}
                        </button>
                        <Dropdown 
                            selectedModel={model}
                            setSelectedModel={setModel}
                            options={modelOptions}
                            label="Model"
                        />
                    </div>
                </div>

                {/* Messages Area */}
                <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {getCurrentMessages().length === 0 ? (
                        <div className="flex-1 flex items-center justify-center h-full">
                            <div className="text-center max-w-md mx-auto">
                                <div className="mb-8">
                                    <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                        Welcome to <span className="text-gradient">Nexus AI</span>
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Start a conversation with your AI assistant. Choose between Gemini and DeepSeek models.
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                         onClick={() => setPrompt("Help me brainstorm ideas for")}>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🤖 Ask Questions</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Get answers on any topic</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                         onClick={() => setPrompt("I need creative ideas for")}>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">💡 Get Ideas</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Brainstorm and create content</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                         onClick={() => setPrompt("Can you help me write code for")}>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📝 Write Code</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Programming help and debugging</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                         onClick={() => setPrompt("Please research and explain")}>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🔍 Research</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Analyze and summarize information</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <AnimatePresence initial={false} mode="popLayout">
                                {getCurrentMessages().map((message, index) => (
                                    <motion.div
                                        key={`${message.timestamp.getTime()}_${index}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <MessageBubble
                                            role={message.role}
                                            content={message.content}
                                            model={message.model}
                                            timestamp={message.timestamp}
                                            isThinking={message.isThinking}
                                            thinkingContent={message.thinkingContent}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {(isLoading || isThinking) && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-3 max-w-[80%]">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            model === 'Gemini' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                                        }`}>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {isThinking ? (
                                                    <>
                                                        <svg className="w-4 h-4 text-yellow-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{model} is thinking deeply...</span>
                                                        <div className="flex space-x-1 ml-2">
                                                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                                                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex space-x-1">
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                        </div>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">{model} is responding...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                    <InputBox
                        prompt={prompt}
                        setPrompt={setPrompt}
                        onSend={handleSend}
                        isLoading={isLoading}
                        isThinking={isThinking}
                    />
                </div>
            </div>
        </div>
    );
}