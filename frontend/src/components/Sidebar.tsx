"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { TaskCardSkeleton } from "./ui/Skeleton";
import { NoTasksEmptyState } from "./ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { fetchTasks } from "@/lib/api";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  userId: string;
  refreshTrigger?: number;
  className?: string;
}

/**
 * Sidebar component showing task summary and quick actions
 * Mobile-first with smooth slide-in animation
 */

export default function Sidebar({
  isOpen,
  onClose,
  onNewChat,
  userId,
  refreshTrigger = 0,
  className = "",
}: SidebarProps) {
  const router = useRouter();
  const { logout, isAuthenticated, user, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Fetch real tasks from API using authenticated endpoint
  useEffect(() => {
    const loadTasks = async () => {
      console.log("[Sidebar] loadTasks called:", {
        isAuthenticated,
        hasAccessToken: !!accessToken,
        tokenPreview: accessToken ? accessToken.substring(0, 20) + "..." : null,
      });
      if (!isAuthenticated || !accessToken) return;

      setIsLoading(true);
      try {
        console.log("[Sidebar] Fetching tasks with token");
        const data = await fetchTasks(accessToken);
        // Map API response to Task interface
        const mappedTasks: Task[] = data.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          completed: task.is_completed,
        }));
        setTasks(mappedTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [isAuthenticated, accessToken, refreshTrigger]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const quickActions = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      label: "Add Task",
      action: "Add a new task",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      label: "Show All",
      action: "Show all my tasks",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: "Completed",
      action: "Show completed tasks",
    },
  ];

  return (
    <>
      {/* Overlay - only on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 lg:right-auto h-screen w-80 bg-white dark:bg-slate-900 border-l lg:border-l-0 lg:border-r border-slate-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        } ${className}`}
        aria-label="Sidebar"
        role="complementary"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Quick Actions
            </h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* New Chat Button */}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              aria-label="Start new conversation"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Chat
            </Button>

            {/* Quick Action Buttons */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                    aria-label={action.label}
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {action.icon}
                    </span>
                    <span className="flex-1">{action.label}</span>
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Task Summary */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                Task Summary
              </h3>
              <Card variant="elevated" padding="md">
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Progress
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {completedCount} / {totalCount}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${completionPercentage}%` }}
                        role="progressbar"
                        aria-valuenow={completionPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Task completion: ${completionPercentage}%`}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {totalCount - completedCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Active
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {completedCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Done
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Tasks */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                Recent Tasks
              </h3>
              <div className="space-y-2">
                {isLoading ? (
                  <>
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                  </>
                ) : tasks.length === 0 ? (
                  <NoTasksEmptyState />
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="group bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed
                                ? "bg-green-500 border-green-500"
                                : "border-slate-300 dark:border-slate-600 group-hover:border-blue-500"
                            }`}
                          >
                            {task.completed && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              task.completed
                                ? "line-through text-slate-500 dark:text-slate-400"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.priority && (
                            <span
                              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                                task.priority === "high"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  : task.priority === "medium"
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User Info and Logout */}
          {isAuthenticated && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {user?.email || "User"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Sign out"
              >
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
