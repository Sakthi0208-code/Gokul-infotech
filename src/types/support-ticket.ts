import type { ChatMessage, ContactDetails } from "./chat";
import type { Category, Priority, TicketAnalysis } from "./ticket";

export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Labels shown to people. Stored values stay open / in_progress / resolved.
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "New",
  in_progress: "In progress",
  resolved: "Solved",
};

/** A ticket created by the chatbot when it could not solve the customer's issue. */
export interface SupportTicket {
  id: string; // e.g. GI-7K3M9Q
  createdAt: string; // ISO date
  updatedAt: string;
  status: TicketStatus;
  customer: ContactDetails;
  analysis: TicketAnalysis; // AI triage
  escalationReason: string;
  transcript: ChatMessage[];
  resolution: string; // admin's note to the customer; empty until written
  model: string;
  notification?: TicketNotification; // last resolution email attempt
}

/** Result of the last "your ticket is resolved" email. */
export interface TicketNotification {
  status: "sent" | "failed" | "skipped";
  at: string; // ISO date
  to: string;
  message: string;
}

/** What the customer sees when creating or checking a ticket. */
export interface PublicTicketStatus {
  id: string;
  status: TicketStatus;
  category: Category;
  priority: Priority;
  summary: string;
  createdAt: string;
  updatedAt: string;
  resolution: string;
}

export function toPublicStatus(t: SupportTicket): PublicTicketStatus {
  return {
    id: t.id,
    status: t.status,
    category: t.analysis.category,
    priority: t.analysis.priority,
    summary: t.analysis.summary,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolution: t.status === "resolved" ? t.resolution : "",
  };
}
