"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage, { Message } from "./ChatMessage";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import { MessageSkeleton } from "./ui/Skeleton";
import { ChatEmptyState } from "./ui/EmptyState";
import { sendMessage, ChatResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function Chat() {
  const { user, accessToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Get user ID from auth context
  const userId = user?.id || "";

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content:
            "Hello! I'm your AI Todo Assistant. I can help you manage your tasks through natural conversation.\n\nTry saying things like:\n- \"Add a task to buy groceries\"\n- \"Show my tasks\"\n- \"Mark groceries as complete\"\n- \"Delete the groceries task\"\n\nHow can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!isAuthenticated || !accessToken) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await sendMessage(
        accessToken,
        content,
        conversationId
      );

      // Update conversation ID
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: response.response,
        toolCalls: response.tool_calls,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Trigger sidebar refresh if any tool calls were made (task operations)
      if (response.tool_calls && response.tool_calls.length > 0) {
        setTaskRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content:
          "I'm sorry, I encountered an error. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm"
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0"
                  aria-hidden="true"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    AI Todo Chatbot
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                    Manage tasks with natural language
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleNewConversation}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Start new conversation"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Chat
                </button>
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                  aria-expanded={isSidebarOpen}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
          role="main"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
        >
          <div className="max-w-4xl mx-auto">
            {messages.length === 1 && messages[0].role === "assistant" ? (
              <ChatEmptyState />
            ) : null}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && <MessageSkeleton />}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </main>

        {/* Error Banner */}
        {error && (
          <div
            className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-3 animate-in slide-in-from-bottom duration-300"
            role="alert"
            aria-live="assertive"
          >
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label="Dismiss error"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Type your message... (e.g., 'Add a task to call mom')"
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewConversation}
        userId={userId}
        refreshTrigger={taskRefreshTrigger}
      />
    </div>
  );
}
