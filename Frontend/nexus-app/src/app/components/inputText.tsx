"use client";
import { useEffect, useRef } from "react";

interface InputBoxProps {
    prompt: string;
    setPrompt: (value: string) => void;
    onSend: () => void;
    isLoading: boolean;
    isThinking?: boolean;
}

export default function InputBox({ prompt, setPrompt, onSend, isLoading, isThinking = false }: InputBoxProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        }
    }, [prompt]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (prompt.trim() && !isLoading) {
                onSend();
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:focus-within:ring-violet-800 transition-all duration-200">
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isThinking 
                            ? "AI is thinking... Please wait" 
                            : "Type your message here... (Press Enter to send, Shift+Enter for new line)"
                    }
                    className="flex-1 min-h-[50px] max-h-[200px] p-4 bg-transparent border-none outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-700 dark:text-gray-200 transition-colors duration-200"
                    disabled={isLoading || isThinking}
                    rows={1}
                />
                <div className="p-2">
                    <button
                        onClick={onSend}
                        disabled={!prompt.trim() || isLoading || isThinking}
                        className="bg-violet-500 hover:bg-violet-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors duration-200 flex items-center justify-center"
                    >
                        {isLoading || isThinking ? (
                            <div className="flex items-center gap-1">
                                {isThinking ? (
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                            </div>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}