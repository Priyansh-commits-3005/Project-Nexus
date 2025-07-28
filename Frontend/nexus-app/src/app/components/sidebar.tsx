"use client";

interface Conversation {
    id: string;
    title: string;
    messages: any[];
    createdAt: Date;
    lastActivity: Date;
    model: string;
}

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onNewChat: () => void;
    onConversationSelect: (conversationId: string) => void;
    onDeleteConversation: (conversationId: string) => void;
}

function Sidebar({ conversations, activeConversationId, onNewChat, onConversationSelect, onDeleteConversation }: SidebarProps) {
    const formatDate = (date: Date) => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col h-full transition-colors duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 dark:border-gray-800">
                <h1 className="text-xl font-bold text-violet-400">Nexus AI</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">Your AI Assistant</p>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Chats</h3>
                <div className="space-y-2">
                    {conversations.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-8">
                            No conversations yet.<br />Start a new chat to begin!
                        </p>
                    ) : (
                        conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`group relative p-3 rounded-md cursor-pointer transition-colors ${
                                    activeConversationId === conversation.id
                                        ? 'bg-violet-600 dark:bg-violet-700 text-white'
                                        : 'bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => onConversationSelect(conversation.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {conversation.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                conversation.model === 'Gemini' 
                                                    ? 'bg-blue-500 text-white' 
                                                    : 'bg-green-500 text-white'
                                            }`}>
                                                {conversation.model}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {formatDate(conversation.lastActivity)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {conversation.messages.length} messages
                                        </p>
                                    </div>
                                    
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteConversation(conversation.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500 dark:hover:bg-red-600 rounded"
                                        title="Delete conversation"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-600 text-center">
                    Powered by Gemini & DeepSeek
                </p>
            </div>
        </div>
    );
}

export default Sidebar;
