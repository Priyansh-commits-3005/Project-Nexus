"use client";

interface ButtonProps {
    onSend: () => void;
    isLoading: boolean;
    disabled: boolean;
}

function SendButton({ onSend, isLoading, disabled }: ButtonProps) {
    return (
        <button
            onClick={onSend}
            disabled={disabled || isLoading}
            className="bg-violet-500 hover:bg-violet-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors duration-200 flex items-center justify-center min-w-[48px] h-12"
        >
            {isLoading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            )}
        </button>
    );
}

export default SendButton;