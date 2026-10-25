// UI tests for the chat widget. fetch is mocked, so no backend or Gemini calls happen.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWidget, OPEN_CHAT_EVENT } from "@/components/chat/chat-widget";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const troubleshooting = {
  reply: {
    message: "Sorry about that. Let's try a few things.",
    steps: ["Clear your browser cache.", "Try signing in from a private window."],
    status: "troubleshooting",
    escalation_reason: "",
  },
  model: "gemini-test",
};

const escalate = {
  reply: {
    message: "I'll create a support ticket for our team.",
    steps: [],
    status: "escalate",
    escalation_reason: "The account needs identity verification.",
  },
  model: "gemini-test",
};

const createdTicket = {
  ticket: {
    id: "GI-7K3M9Q",
    status: "open",
    category: "Account Access",
    priority: "High",
    summary: "Customer cannot log in.",
    createdAt: "2026-10-25T08:00:00.000Z",
    updatedAt: "2026-10-25T08:00:00.000Z",
    resolution: "",
  },
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollTo = vi.fn();
});

async function openChat() {
  const user = userEvent.setup();
  render(<ChatWidget />);
  await user.click(screen.getByRole("button", { name: /need help/i }));
  const dialog = screen.getByRole("dialog", { name: "AI support assistant" });
  return { user, dialog, input: within(dialog).getByLabelText("Describe your problem") };
}

function sentMessages(callIndex: number) {
  return JSON.parse(fetchMock.mock.calls[callIndex][1].body).messages;
}

describe("ChatWidget", () => {
  it("opens from the floating button and from the page event", async () => {
    render(<ChatWidget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
    });
    expect(screen.getByRole("dialog", { name: "AI support assistant" })).toBeInTheDocument();
  });

  it("sends a message and shows the reply with numbered steps", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();

    await user.type(input, "I can't log in{Enter}");

    expect(await screen.findByText("Clear your browser cache.")).toBeInTheDocument();
    expect(screen.getByText("Try signing in from a private window.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/chat");
    expect(sentMessages(0)).toEqual([{ role: "user", content: "I can't log in" }]);
    expect(screen.getByText("Did this solve your problem?")).toBeInTheDocument();
  });

  it("thanks the user when the fix worked", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "I can't log in{Enter}");
    await user.click(await screen.findByRole("button", { name: "Yes, it's fixed" }));

    expect(screen.getByText(/glad that's sorted/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the history back when the fix did not work, then offers escalation after two failures", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "I can't log in{Enter}");

    await user.click(await screen.findByRole("button", { name: "No, still not working" }));
    await screen.findAllByText("Clear your browser cache.");
    expect(sentMessages(1)).toEqual([
      { role: "user", content: "I can't log in" },
      {
        role: "assistant",
        content: "Sorry about that. Let's try a few things.\n1. Clear your browser cache.\n2. Try signing in from a private window.",
      },
      { role: "user", content: "I tried that, but the problem is still happening." },
    ]);

    await user.click(await screen.findByRole("button", { name: "No, still not working" }));
    expect(await screen.findByRole("button", { name: "Create support ticket" })).toBeInTheDocument();
  });

  it("creates a support ticket and shows the ticket number", async () => {
    fetchMock.mockResolvedValueOnce(json(escalate)).mockResolvedValueOnce(json(createdTicket, 201));
    const { user, input } = await openChat();
    await user.type(input, "Someone else logged into my account{Enter}");

    expect(await screen.findByText("The account needs identity verification.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create support ticket" }));

    await user.type(screen.getByLabelText("Your name"), "Priya");
    await user.type(screen.getByLabelText("Your email"), "priya@example.com");
    await user.click(screen.getByRole("button", { name: "Create support ticket" }));

    expect(await screen.findByText("Support ticket created")).toBeInTheDocument();
    expect(screen.getByText("GI-7K3M9Q")).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/tickets");
    const body = JSON.parse(init.body);
    expect(body.contact).toEqual({ name: "Priya", email: "priya@example.com" });
    expect(body.escalation_reason).toBe("The account needs identity verification.");
    expect(body.messages[0]).toEqual({ role: "user", content: "Someone else logged into my account" });

    // Back in the chat, a confirmation message with the ticket number is shown
    await user.click(screen.getByRole("button", { name: "Back to chat" }));
    expect(screen.getByText(/created support ticket GI-7K3M9Q/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create support ticket" })).not.toBeInTheDocument();
  });

  it("checks a ticket status from the chat without calling the AI", async () => {
    fetchMock.mockResolvedValue(
      json({ ticket: { ...createdTicket.ticket, status: "resolved", resolution: "We reset your account lock. Please sign in again." } }),
    );
    const { user, input } = await openChat();
    await user.type(input, "status gi-7k3m9q{Enter}");

    expect(await screen.findByText(/Resolution from our support team/)).toBeInTheDocument();
    expect(screen.getByText(/We reset your account lock/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tickets/GI-7K3M9Q");
  });

  it("shows an error with a retry button when the API fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ error: { code: "GEMINI_RATE_LIMITED", message: "Quota reached." } }, 429))
      .mockResolvedValueOnce(json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "I can't log in{Enter}");

    expect(await screen.findByText("Quota reached.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Clear your browser cache.")).toBeInTheDocument();
    expect(sentMessages(1)).toEqual([{ role: "user", content: "I can't log in" }]);
  });

  it("does not send empty messages", async () => {
    const { user, input } = await openChat();
    await user.type(input, "   {Enter}");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets the user contact a human at any time", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "I can't log in{Enter}");
    await screen.findByText("Clear your browser cache.");
    await user.click(screen.getByRole("button", { name: "Contact a human" }));
    expect(screen.getByText("Raise a support ticket")).toBeInTheDocument();
  });
});

describe("ChatWidget admin login", () => {
  it("asks for the code in a password box after typing 'admin' and never calls the AI", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign, search: "", pathname: "/", hash: "" });
    fetchMock.mockResolvedValue(json({ ok: true, redirectTo: "/admin" }));
    const { user, input } = await openChat();

    await user.type(input, "admin{Enter}");
    const codeInput = await screen.findByLabelText("Admin access code");
    expect(codeInput).toHaveAttribute("type", "password");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(codeInput, "GI-secret{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/login");
    expect(JSON.parse(init.body)).toEqual({ code: "GI-secret" });
    expect(await screen.findByText(/access granted/i)).toBeInTheDocument();
    // The code is never shown in the conversation
    expect(screen.queryByText("GI-secret")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows an error for a wrong code and lets the user cancel", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "INVALID_ACCESS_CODE", message: "That access code is not valid." } }, 401));
    const { user, input } = await openChat();

    await user.type(input, "admin{Enter}");
    await user.type(await screen.findByLabelText("Admin access code"), "nope{Enter}");
    expect(await screen.findByText("That access code is not valid.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Admin access code")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Describe your problem")).toBeInTheDocument();
  });

  it("does not send admin login messages to the AI later", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "admin{Enter}");
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await user.type(screen.getByLabelText("Describe your problem"), "My tracker is offline{Enter}");
    await screen.findByText("Clear your browser cache.");
    expect(sentMessages(0)).toEqual([{ role: "user", content: "My tracker is offline" }]);
  });
});

describe("ChatWidget common issues", () => {
  it("shows common issues, expands to more, and sends the picked issue to the AI", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user } = await openChat();

    expect(screen.getByRole("button", { name: /Can't log in/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Recruitment enquiry/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /More issues/ }));
    await user.click(screen.getByRole("button", { name: /Parking sensor issue/ }));

    await screen.findByText("Clear your browser cache.");
    expect(sentMessages(0)).toEqual([
      { role: "user", content: "Our parking sensors are not showing real-time bay availability." },
    ]);
  });

  it("opens the common issues menu from the message box at any time", async () => {
    fetchMock.mockImplementation(async () => json(troubleshooting));
    const { user, input } = await openChat();
    await user.type(input, "Something is wrong{Enter}");
    await screen.findByText("Clear your browser cache.");

    await user.click(screen.getByRole("button", { name: "Common issues" }));
    await user.click(screen.getByRole("button", { name: /Service down for everyone/ }));
    await screen.findAllByText("Clear your browser cache.");
    expect(sentMessages(1).at(-1)).toEqual({ role: "user", content: "The service is completely down for everyone in our team." });
  });
});
