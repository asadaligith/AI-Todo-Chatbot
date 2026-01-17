"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput component - accessible message input with auto-resize and keyboard shortcuts
 * Mobile-first responsive design with smooth animations
 */
export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickActions = [
    { text: "Add a task", icon: "+" },
    { text: "Show my tasks", icon: "📋" },
    { text: "Mark task complete", icon: "✓" },
  ];

  const handleQuickAction = (text: string) => {
    setMessage(text);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
      role="region"
      aria-label="Message input"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        {/* Quick Actions - Hidden on small screens when typing */}
        {!isFocused && message.length === 0 && (
          <div className="hidden sm:flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">
              Quick:
            </span>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.text)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Quick action: ${action.text}`}
              >
                <span aria-hidden="true">{action.icon}</span>
                {action.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={`w-full resize-none rounded-xl sm:rounded-2xl border-2 ${
                isFocused
                  ? "border-blue-500 dark:border-blue-500"
                  : "border-slate-300 dark:border-slate-600"
              } bg-slate-50 dark:bg-slate-700 px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Chat message input"
              aria-describedby="input-hint"
            />
            {/* Character counter for long messages */}
            {message.length > 100 && (
              <div
                className="absolute bottom-2 right-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded"
                aria-live="polite"
              >
                {message.length}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
            className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            aria-label="Send message"
            type="button"
          >
            {disabled ? (
              <div className="flex gap-1" aria-hidden="true">
                <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
              </div>
            ) : (
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Hint Text */}
        <p
          id="input-hint"
          className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center sm:text-left"
        >
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Enter</kbd> to send,{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Shift + Enter</kbd> for new line
          </span>
          <span className="sm:hidden">
            Try: &quot;Add a task&quot; or &quot;Show my tasks&quot;
          </span>
        </p>
      </div>
    </div>
  );
}
