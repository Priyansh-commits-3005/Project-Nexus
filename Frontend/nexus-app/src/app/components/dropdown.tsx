"use client";
import { useState } from "react";

interface DropdownProps {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    options: string[];
    label?: string;
}

function Dropdown({ selectedModel, setSelectedModel, options, label }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleOptionClick = (option: string) => {
        setSelectedModel(option);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}
            
            <div>
                <button
                    type="button"
                    className="inline-flex w-full justify-between items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-100"
                    onClick={toggleDropdown}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    {selectedModel}
                    <svg
                        className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                                    selectedModel === option
                                        ? 'bg-violet-50 text-violet-900'
                                        : 'text-gray-700'
                                }`}
                                role="menuitem"
                                onClick={() => handleOptionClick(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dropdown;
