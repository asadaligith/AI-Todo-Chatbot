const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Timeout for API requests (30 seconds)
const API_TIMEOUT = 30000;

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export interface ChatResponse {
  conversation_id: string;
  response: string;
  tool_calls: ToolCall[];
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

// Token refresh callback type
type RefreshTokenCallback = () => Promise<string | null>;

// Store for the token refresh callback
let refreshTokenCallback: RefreshTokenCallback | null = null;

/**
 * Set the token refresh callback for fetchWithAuth
 */
export function setRefreshTokenCallback(callback: RefreshTokenCallback): void {
  refreshTokenCallback = callback;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

/**
 * Fetch with authentication - automatically adds Authorization header
 * and retries with token refresh on 401 response
 */
export async function fetchWithAuth(
  url: string,
  accessToken: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<Response> {
  console.log("[API] fetchWithAuth called:", {
    url,
    hasToken: !!accessToken,
    tokenPreview: accessToken ? accessToken.substring(0, 30) + "..." : null,
  });

  const authOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  };

  const response = await fetchWithTimeout(url, authOptions, timeout);

  // If 401 and we have a refresh callback, try to refresh and retry
  if (response.status === 401 && refreshTokenCallback) {
    const newToken = await refreshTokenCallback();
    if (newToken) {
      const retryOptions: RequestInit = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
        credentials: "include",
      };
      return fetchWithTimeout(url, retryOptions, timeout);
    }
  }

  return response;
}

/**
 * Send a message to the chat endpoint (requires authentication)
 */
export async function sendMessage(
  accessToken: string,
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const body: ChatRequest = {
    message,
  };

  if (conversationId) {
    body.conversation_id = conversationId;
  }

  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/chat`,
      accessToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || "Failed to send message");
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Cannot connect to server. Please check your connection and try again.");
    }
    throw error;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Task types
export interface TaskItem {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TasksListResponse {
  tasks: TaskItem[];
  total: number;
  completed: number;
  pending: number;
}

/**
 * Fetch all tasks for the authenticated user
 */
export async function fetchTasks(accessToken: string): Promise<TasksListResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/tasks`, accessToken);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || "Failed to fetch tasks");
  }

  return response.json();
}
