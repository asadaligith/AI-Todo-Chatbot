"use client";

import { ToolCall } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

/**
 * ChatMessage component - displays a single chat message with proper styling and accessibility
 * Mobile-first responsive design with smooth animations
 */
export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={`message-enter flex ${isUser ? "justify-end" : "justify-start"} mb-4 sm:mb-6 group`}
      role="article"
      aria-label={`${isUser ? "Your" : "Assistant's"} message`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[80%] md:max-w-[70%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-md shadow-md hover:shadow-lg dark:bg-blue-700"
            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-md shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700"
        } px-4 py-3 transition-all duration-200`}
      >
        {/* Avatar and role indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-transform duration-200 group-hover:scale-110 ${
              isUser
                ? "bg-blue-500 text-white shadow-sm dark:bg-blue-600"
                : "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md"
            }`}
            aria-hidden="true"
          >
            {isUser ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </div>
          <span
            className={`text-xs sm:text-sm font-medium ${isUser ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}`}
          >
            {isUser ? "You" : "Todo Assistant"}
          </span>
        </div>

        {/* Message content */}
        <div
          className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words"
          role="text"
        >
          {message.content}
        </div>

        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div
            className={`mt-3 pt-3 border-t ${isUser ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`}
            role="region"
            aria-label="Tool actions performed"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <svg
                className={`w-3.5 h-3.5 ${isUser ? "text-blue-200" : "text-slate-500 dark:text-slate-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span
                className={`text-xs font-medium ${isUser ? "text-blue-200" : "text-slate-600 dark:text-slate-400"}`}
              >
                Actions:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.toolCalls.map((tool, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                    isUser
                      ? "bg-blue-500 text-white hover:bg-blue-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                  role="listitem"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {tool.tool_name.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2.5 flex items-center gap-1.5 ${
            isUser ? "text-blue-200" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <time dateTime={message.timestamp.toISOString()}>
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </div>
    </article>
  );
}
