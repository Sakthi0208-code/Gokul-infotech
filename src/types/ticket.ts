// Shared types and allowed values for ticket analysis.
// These lists are the single source of truth: the prompt, the Gemini
// response schema, the validator and the UI all read from them.

export const CATEGORIES = [
  "Account Access",
  "Billing",
  "Technical Issue",
  "Service Outage",
  "Feature Request",
  "Other",
] as const;

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export const SENTIMENTS = ["Positive", "Neutral", "Negative"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Sentiment = (typeof SENTIMENTS)[number];

export interface TicketAnalysis {
  category: Category;
  priority: Priority;
  sentiment: Sentiment;
  summary: string;
  suggested_reply: string;
  recommended_action: string;
  priority_reason: string;
}

// Error codes the API can return. The UI uses them to pick recovery hints.
export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "MISSING_API_KEY"
  | "GEMINI_AUTH_ERROR"
  | "MODEL_UNAVAILABLE"
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_ERROR"
  | "TIMEOUT"
  | "INVALID_MODEL_OUTPUT"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_ACCESS_CODE"
  | "ADMIN_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export interface AnalyzeSuccessResponse {
  analysis: TicketAnalysis;
  model: string;
}

export interface AnalyzeErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
