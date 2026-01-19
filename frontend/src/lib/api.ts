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
      throw new Error("Request timed out. Please check if the backend server is running.");
    }
    throw error;
  }
}

export async function sendMessage(
  userId: string,
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
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/${userId}/chat`,
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
      throw new Error("Cannot connect to server. Please ensure the backend is running on http://localhost:8000");
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
