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
    isStreaming?: boolean;
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
    const [isStreaming, setIsStreaming] = useState(false);
    const [wsConnectionStatus, setWsConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    
    // Load conversations and thinking preference after hydration
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

    // Persist conversations and thinking preference
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
        if (!prompt.trim() || isLoading || isStreaming || isThinking) {
            console.log('Send blocked:', { 
                hasPrompt: !!prompt.trim(), 
                isLoading, 
                isStreaming, 
                isThinking 
            });
            return;
        }

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

        // We'll let the streaming logic determine if thinking is shown based on actual content
        
        // Try WebSocket first, fallback to HTTP if it fails
        try {
            await handleWebSocketSend(currentConversationId, currentPrompt, model);
        } catch (wsError) {
            console.log('WebSocket failed, falling back to HTTP:', wsError);
            // Only fallback if we're still in a loading state (haven't been reset)
            if (isLoading) {
                await handleHttpSend(currentConversationId, currentPrompt, model);
            }
        } finally {
            // Ensure all states are properly reset regardless of success/failure
            setIsLoading(false);
            setIsThinking(false);
            setIsStreaming(false);
        }
    };

    const handleWebSocketSend = async (conversationId: string, userPrompt: string, selectedModel: string) => {
        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket connection
                setWsConnectionStatus('connecting');
                const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${conversationId}/${selectedModel}`);
                let wsConnected = false;
                let streamedContent = '';
                let thinkingContent = '';
                let responseTimeout: NodeJS.Timeout;
                
                // Create placeholder AI message for streaming
                const placeholderAiMessage: Message = {
                    role: 'ai',
                    content: '',
                    model: selectedModel,
                    timestamp: new Date(),
                    isThinking: false, // Will be updated dynamically if thinking content is found
                    thinkingContent: '',
                    isStreaming: true
                };

                // Add placeholder message
                setConversations(prev => prev.map(conv => 
                    conv.id === conversationId 
                        ? { 
                            ...conv, 
                            messages: [...conv.messages, placeholderAiMessage],
                            lastActivity: new Date()
                        }
                        : conv
                ));

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    wsConnected = true;
                    setWsConnectionStatus('connected');
                    setIsStreaming(true);
                    ws.send(userPrompt);
                    
                    // Set response timeout (2 minutes)
                    responseTimeout = setTimeout(() => {
                        console.log('WebSocket response timeout');
                        ws.close();
                        setConversations(prev => prev.map(conv => 
                            conv.id === conversationId 
                                ? { 
                                    ...conv, 
                                    messages: conv.messages.map((msg, index) => 
                                        index === conv.messages.length - 1 
                                            ? { 
                                                ...msg, 
                                                content: 'Request timed out. The AI took too long to respond. Please try again.',
                                                isStreaming: false,
                                                isThinking: false
                                            }
                                            : msg
                                    )
                                }
                                : conv
                        ));
                    }, 120000); // 2 minutes timeout
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.token) {
                            // Clear response timeout since we got a response
                            if (responseTimeout) {
                                clearTimeout(responseTimeout);
                            }
                            
                            // Handle true incremental streaming - accumulate tokens
                            streamedContent += data.token; // Append each token to build the complete response
                            
                            // Check for thinking content in both DeepSeek and Gemini
                            let displayContent = streamedContent;
                            let currentThinkingContent = thinkingContent;
                            let hasDetectedThinking = false;
                            
                            if (streamedContent) {
                                // Both DeepSeek and Gemini now use <think> tags
                                const thinkingMatch = streamedContent.match(/<think>([\s\S]*?)<\/think>/);
                                if (thinkingMatch) {
                                    hasDetectedThinking = true;
                                    currentThinkingContent = thinkingMatch[1].trim();
                                    displayContent = streamedContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                                } else if (streamedContent.includes('<think>')) {
                                    // Thinking has started but not completed yet
                                    hasDetectedThinking = true;
                                    const startMatch = streamedContent.match(/<think>([\s\S]*?)$/);
                                    if (startMatch) {
                                        currentThinkingContent = startMatch[1].trim() + '...';
                                        displayContent = streamedContent.replace(/<think>[\s\S]*?$/, '').trim();
                                    }
                                }
                                
                                // Update thinking content if it changed or was detected
                                if (currentThinkingContent !== thinkingContent || hasDetectedThinking) {
                                    thinkingContent = currentThinkingContent;
                                }
                            }
                            
                            // Update the streaming content in the last message
                            setConversations(prev => prev.map(conv => 
                                conv.id === conversationId 
                                    ? { 
                                        ...conv, 
                                        messages: conv.messages.map((msg, index) => 
                                            index === conv.messages.length - 1 
                                                ? { 
                                                    ...msg, 
                                                    content: displayContent,
                                                    isThinking: !!currentThinkingContent && !displayContent.trim(),
                                                    isStreaming: true,
                                                    thinkingContent: currentThinkingContent || msg.thinkingContent
                                                }
                                                : msg
                                        )
                                    }
                                    : conv
                            ));
                            
                            // Set a timeout to close connection if no more tokens arrive
                            // This helps handle cases where the backend doesn't close the WebSocket
                            if (responseTimeout) {
                                clearTimeout(responseTimeout);
                            }
                            responseTimeout = setTimeout(() => {
                                if (ws.readyState === WebSocket.OPEN) {
                                    console.log('Auto-closing WebSocket due to inactivity');
                                    ws.close();
                                }
                            }, 3000); // Close after 3 seconds of no tokens
                            
                        } else {
                            console.warn('Received WebSocket message without token:', data);
                        }
                    } catch (parseError) {
                        console.error('Error parsing WebSocket message:', parseError, 'Raw data:', event.data);
                        
                        // If we can't parse the message, show an error
                        setConversations(prev => prev.map(conv => 
                            conv.id === conversationId 
                                ? { 
                                    ...conv, 
                                    messages: conv.messages.map((msg, index) => 
                                        index === conv.messages.length - 1 
                                            ? { 
                                                ...msg, 
                                                content: 'Sorry, I received an invalid response format. Please try again.',
                                                isStreaming: false,
                                                isThinking: false
                                            }
                                            : msg
                                    )
                                }
                                : conv
                        ));
                        
                        ws.close();
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    
                    // Clear any timeouts
                    if (responseTimeout) {
                        clearTimeout(responseTimeout);
                    }
                    
                    // Reset all loading states on error
                    setIsLoading(false);
                    setIsThinking(false);
                    setIsStreaming(false);
                    setWsConnectionStatus('failed');
                    
                    if (!wsConnected) {
                        reject(new Error('WebSocket connection failed'));
                    } else {
                        // If we were connected but got an error, show error in the message
                        setConversations(prev => prev.map(conv => 
                            conv.id === conversationId 
                                ? { 
                                    ...conv, 
                                    messages: conv.messages.map((msg, index) => 
                                        index === conv.messages.length - 1 
                                            ? { 
                                                ...msg, 
                                                content: 'Sorry, I encountered a connection error while processing your request. Please try again.',
                                                isThinking: false,
                                                isStreaming: false
                                            }
                                            : msg
                                    )
                                }
                                : conv
                        ));
                        resolve(''); // Resolve to prevent fallback to HTTP
                    }
                };

                ws.onclose = (event) => {
                    console.log('WebSocket connection closed:', event.code, event.reason);
                    
                    // Clear any timeouts
                    if (responseTimeout) {
                        clearTimeout(responseTimeout);
                    }
                    
                    // Always reset loading states when WebSocket closes
                    setIsLoading(false);
                    setIsThinking(false);
                    setIsStreaming(false);
                    setWsConnectionStatus('disconnected');
                    
                    // Finalize the message - mark streaming as complete
                    setConversations(prev => prev.map(conv => 
                        conv.id === conversationId 
                            ? { 
                                ...conv, 
                                messages: conv.messages.map((msg, index) => 
                                    index === conv.messages.length - 1 
                                        ? { 
                                            ...msg, 
                                            isStreaming: false,
                                            isThinking: false
                                        }
                                        : msg
                                )
                            }
                            : conv
                    ));
                    
                    // Check if we received any content
                    if (wsConnected) {
                        if (streamedContent && streamedContent.trim()) {
                            // Successfully received content
                            console.log('WebSocket completed successfully with content:', streamedContent.length, 'characters');
                            resolve(streamedContent);
                        } else {
                            // Connected but no meaningful content received
                            console.log('WebSocket completed but no content received');
                            
                            // Update the last message with error
                            setConversations(prev => prev.map(conv => 
                                conv.id === conversationId 
                                    ? { 
                                        ...conv, 
                                        messages: conv.messages.map((msg, index) => 
                                            index === conv.messages.length - 1 
                                                ? { 
                                                    ...msg, 
                                                    content: 'Sorry, no response was received. Please try again.',
                                                    isStreaming: false,
                                                    isThinking: false
                                                }
                                                : msg
                                        )
                                    }
                                    : conv
                            ));
                            
                            reject(new Error('No content received from AI'));
                        }
                    } else {
                        // Never connected or connection failed
                        console.log('WebSocket connection failed');
                        reject(new Error('WebSocket connection failed'));
                    }
                };

                // Set a timeout to fallback to HTTP if WebSocket takes too long to connect
                const connectionTimeout = setTimeout(() => {
                    if (!wsConnected) {
                        console.log('WebSocket connection timeout');
                        ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

                // Clear timeout when connection is established
                const originalOnOpen = ws.onopen;
                ws.onopen = (event) => {
                    clearTimeout(connectionTimeout);
                    if (originalOnOpen) originalOnOpen.call(ws, event);
                };

                // Clear timeout on error as well
                const originalOnError = ws.onerror;
                ws.onerror = (event) => {
                    clearTimeout(connectionTimeout);
                    if (originalOnError) originalOnError.call(ws, event);
                };

            } catch (error) {
                reject(error);
            }
        });
    };

    const handleHttpSend = async (conversationId: string, userPrompt: string, selectedModel: string) => {
        try {
            console.log('Using HTTP fallback for:', selectedModel);
            
            const response = await fetch(`http://127.0.0.1:8000/ChatResponse/${selectedModel}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    prompt: userPrompt,
                    thread_id: conversationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            // Handle simple JSON response
            const data = await response.json();
            let aiContent = data.response;

            // Validate response content
            if (!aiContent || aiContent.trim().length === 0) {
                throw new Error('Received empty response from server');
            }

            // Process the complete response for thinking content (both models)
            let thinkingContent = '';
            
            if (aiContent) {
                if (selectedModel === 'DeepSeek') {
                    // DeepSeek uses <think> tags
                    const thinkingMatch = aiContent.match(/<think>([\s\S]*?)<\/think>/);
                    if (thinkingMatch) {
                        thinkingContent = thinkingMatch[1].trim();
                        // Remove thinking tags from the main content
                        aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    }
                } else if (selectedModel === 'Gemini') {
                    // Gemini reasoning pattern detection
                    const reasoningPatterns = [
                        /Let me think about this step by step[.:]\s*([\s\S]*?)(?=\n\n|\nBased on|$)/i,
                        /I need to consider[.:]\s*([\s\S]*?)(?=\n\n|\nTherefore|$)/i,
                        /First, let me analyze[.:]\s*([\s\S]*?)(?=\n\n|\nIn conclusion|$)/i,
                        /Thinking through this[.:]\s*([\s\S]*?)(?=\n\n|\nSo|$)/i
                    ];
                    
                    for (const pattern of reasoningPatterns) {
                        const match = aiContent.match(pattern);
                        if (match) {
                            thinkingContent = match[1].trim();
                            // For Gemini, keep the reasoning in the main content
                            break;
                        }
                    }
                }
            }

            const aiMessage: Message = {
                role: 'ai',
                content: aiContent,
                model: selectedModel,
                timestamp: new Date(),
                isThinking: !!thinkingContent,
                thinkingContent: thinkingContent || undefined
            };

            // Add AI response to current conversation
            setConversations(prev => prev.map(conv => 
                conv.id === conversationId 
                    ? { 
                        ...conv, 
                        messages: [...conv.messages, aiMessage],
                        lastActivity: new Date()
                    }
                    : conv
            ));

        } catch (error) {
            console.error('HTTP Error:', error);
            
            let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Sorry, I cannot connect to the server. Please check your connection and try again.';
            } else if (error instanceof Error) {
                if (error.message.includes('empty response')) {
                    errorMessage = 'Sorry, I received an empty response. Please try rephrasing your question.';
                } else if (error.message.includes('HTTP error')) {
                    errorMessage = `Sorry, the server encountered an error (${error.message}). Please try again.`;
                }
            }
            
            const errorMsg: Message = {
                role: 'ai',
                content: errorMessage,
                model: selectedModel,
                timestamp: new Date()
            };
            
            // Add error message to current conversation
            setConversations(prev => prev.map(conv => 
                conv.id === conversationId 
                    ? { 
                        ...conv, 
                        messages: [...conv.messages, errorMsg],
                        lastActivity: new Date()
                    }
                    : conv
            ));
            throw error;
        } finally {
            setIsLoading(false);
            setIsThinking(false);
            setIsStreaming(false);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setPrompt("");
        setIsLoading(false);
        setIsThinking(false);
        setIsStreaming(false);
        setWsConnectionStatus('disconnected');
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
                            {wsConnectionStatus !== 'disconnected' && (
                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                    wsConnectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                                    wsConnectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {wsConnectionStatus}
                                </span>
                            )}
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
                                            isStreaming={message.isStreaming}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {(isLoading || isThinking) && !isStreaming && (
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
                                                ) : isStreaming ? (
                                                    <>
                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                                        </svg>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{model} is streaming...</span>
                                                        <div className="flex space-x-1 ml-2">
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
                        isStreaming={isStreaming}
                    />
                </div>
            </div>
        </div>
    );
}