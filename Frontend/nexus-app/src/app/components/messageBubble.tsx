"use client";
import { useState } from 'react';

interface MessageBubbleProps {
    role: 'user' | 'ai';
    content: string;
    model?: string;
    timestamp?: Date;
    isThinking?: boolean;
    thinkingContent?: string;
    isStreaming?: boolean;
    onRetry?: () => void;
}

function MessageBubble({ role, content, model, timestamp, isThinking = false, thinkingContent, isStreaming = false, onRetry }: MessageBubbleProps) {
    const isUser = role === 'user';
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    
    // Only show thinking dropdown if there's actual thinking content
    const hasThinking = !isUser && thinkingContent && thinkingContent.trim().length > 0;
    
    return (
        <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isUser 
                        ? 'bg-violet-500 text-white' 
                        : model === 'Gemini' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-green-500 text-white'
                }`}>
                    {isUser ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>

                {/* Message Container */}
                <div className="flex flex-col gap-2">
                    {/* Thinking Dropdown - Only show if there's thinking content */}
                    {hasThinking && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                                onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                                className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {model === 'Gemini' ? 'Thought process' : 'Thinking'}
                                    </span>
                                </div>
                                <svg 
                                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                                        isThinkingExpanded ? 'rotate-180' : ''
                                    }`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {isThinkingExpanded && (
                                <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="pt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                                        {thinkingContent}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`rounded-2xl px-4 py-3 shadow-sm transition-colors duration-200 ${
                        isUser 
                            ? 'bg-violet-500 text-white' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                        
                        {/* Main Content */}
                        <div className="whitespace-pre-wrap break-words">
                            {content}
                            {isStreaming && (
                                <span className="inline-block w-2 h-5 bg-gray-400 dark:bg-gray-500 ml-1 animate-pulse"></span>
                            )}
                        </div>
                        
                        {/* Error indicator for failed messages */}
                        {!isUser && content.toLowerCase().includes('sorry') && (content.includes('error') || content.includes('problem') || content.includes('try again')) && (
                            <div className="flex items-center justify-between mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-2 border-red-500">
                                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Error occurred</span>
                                </div>
                                {onRetry && (
                                    <button
                                        onClick={onRetry}
                                        className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Metadata */}
                        <div className={`flex items-center gap-2 mt-2 text-xs ${
                            isUser ? 'text-violet-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                            {!isUser && model && (
                                <span className="font-medium">{model}</span>
                            )}
                            {timestamp && (
                                <span>
                                    {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MessageBubble;
