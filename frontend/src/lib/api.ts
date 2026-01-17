const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const response = await fetch(`${API_BASE_URL}/api/${userId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || "Failed to send message");
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
