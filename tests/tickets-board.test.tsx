// UI tests for the admin tickets board (New / In progress / Solved). fetch is mocked.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketsBoard } from "@/components/admin/tickets-board";
import type { SupportTicket } from "@/types/support-ticket";

const base: SupportTicket = {
  id: "GI-7K3M9Q",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "open",
  customer: { name: "Priya", email: "priya@example.com" },
  analysis: {
    category: "Technical Issue",
    priority: "High",
    sentiment: "Negative",
    summary: "Fleet tracker stopped reporting location.",
    suggested_reply: "We're sorry. Our team is checking the tracker connection.",
    recommended_action: "Check the SIM status.",
    priority_reason: "Customer cannot see live locations.",
  },
  escalationReason: "Steps failed twice.",
  transcript: [{ role: "user", content: "My fleet tracker stopped updating." }],
  resolution: "",
  model: "test",
};

const working: SupportTicket = {
  ...base,
  id: "GI-WXYZ23",
  status: "in_progress",
  customer: { name: "Arun", email: "" },
  analysis: { ...base.analysis, priority: "Medium", summary: "GIS map layer not loading." },
};

const solved: SupportTicket = {
  ...base,
  id: "GI-ABCDEF",
  status: "resolved",
  resolution: "Fixed.",
  analysis: { ...base.analysis, priority: "Low", category: "Other", summary: "Asked about report colours." },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function column(name: string) {
  return screen.getByRole("region", { name });
}

describe("TicketsBoard", () => {
  it("shows tickets in New, In progress and Solved columns with counts", async () => {
    fetchMock.mockImplementation(async () => json({ tickets: [base, working, solved] }));
    render(<TicketsBoard />);

    expect(await screen.findByText(base.analysis.summary)).toBeInTheDocument();
    expect(within(column("New")).getByText(base.analysis.summary)).toBeInTheDocument();
    expect(within(column("In progress")).getByText(working.analysis.summary)).toBeInTheDocument();
    expect(within(column("Solved")).getByText(solved.analysis.summary)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tickets");
  });

  it("filters by search text and priority", async () => {
    fetchMock.mockImplementation(async () => json({ tickets: [base, working, solved] }));
    const user = userEvent.setup();
    render(<TicketsBoard />);
    await screen.findByText(base.analysis.summary);

    await user.type(screen.getByRole("searchbox"), "gis");
    expect(screen.queryByText(base.analysis.summary)).not.toBeInTheDocument();
    expect(screen.getByText(working.analysis.summary)).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.selectOptions(screen.getByLabelText("Priority"), "Low");
    expect(screen.getByText(solved.analysis.summary)).toBeInTheDocument();
    expect(screen.queryByText(working.analysis.summary)).not.toBeInTheDocument();
  });

  it("moves a new ticket to In progress with the Start button", async () => {
    const started = { ...base, status: "in_progress" };
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "PATCH" ? json({ ticket: started }) : json({ tickets: [base] }),
    );
    const user = userEvent.setup();
    render(<TicketsBoard />);
    await screen.findByText(base.analysis.summary);

    await user.click(within(column("New")).getByRole("button", { name: /Start/ }));
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patch?.[0]).toBe("/api/tickets/GI-7K3M9Q");
    expect(JSON.parse(patch?.[1].body)).toEqual({ status: "in_progress" });
    expect(await within(column("In progress")).findByText(base.analysis.summary)).toBeInTheDocument();
    expect(screen.getByText("GI-7K3M9Q moved to In progress.")).toBeInTheDocument();
  });

  it("dragging a ticket onto Solved opens the details to write a note instead of solving silently", async () => {
    fetchMock.mockImplementation(async () => json({ tickets: [working] }));
    render(<TicketsBoard />);
    await screen.findByText(working.analysis.summary);

    const data = new Map<string, string>([["text/plain", working.id]]);
    const dataTransfer = { getData: (k: string) => data.get(k) ?? "", setData: () => {}, effectAllowed: "move" };
    fireEvent.drop(column("Solved"), { dataTransfer });

    expect(await screen.findByRole("dialog", { name: "Ticket details" })).toBeInTheDocument();
    expect(screen.getByText(`Add a resolution note to mark ${working.id} as solved.`)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  });

  it("solves a ticket from the details panel and shows the email result", async () => {
    const resolvedTicket = {
      ...working,
      status: "resolved",
      resolution: "Re-published the map layer.",
      notification: { status: "skipped", at: new Date().toISOString(), to: "", message: "The customer didn't leave an email address." },
    };
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "PATCH"
        ? json({ ticket: resolvedTicket, email: { sent: false, message: "The customer didn't leave an email address." } })
        : json({ tickets: [working] }),
    );
    const user = userEvent.setup();
    render(<TicketsBoard />);
    await screen.findByText(working.analysis.summary);

    await user.click(within(column("In progress")).getByRole("button", { name: /Solve/ }));
    const dialog = await screen.findByRole("dialog", { name: "Ticket details" });
    expect(within(dialog).getByLabelText(/resolution note/i)).toHaveFocus();

    await user.type(within(dialog).getByLabelText(/resolution note/i), "Re-published the map layer.");
    await user.click(within(dialog).getByRole("button", { name: "Mark solved" }));

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patch?.[1].body)).toEqual({ status: "resolved", resolution: "Re-published the map layer." });
    expect(await within(dialog).findByText(/Ticket moved to Solved\. The customer didn't leave an email address\./)).toBeInTheDocument();
    expect(within(column("Solved")).getByText(working.analysis.summary)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Ticket details" })).not.toBeInTheDocument();
  });

  it("fills the note from the AI suggested reply", async () => {
    fetchMock.mockImplementation(async () => json({ tickets: [base] }));
    const user = userEvent.setup();
    render(<TicketsBoard />);
    await user.click(await screen.findByText(base.analysis.summary));
    const dialog = screen.getByRole("dialog", { name: "Ticket details" });
    await user.click(within(dialog).getByRole("button", { name: "Use AI reply" }));
    expect(within(dialog).getByLabelText(/resolution note/i)).toHaveValue(base.analysis.suggested_reply);
  });

  it("shows the server message when the session has expired", async () => {
    fetchMock.mockImplementation(async () =>
      json({ error: { code: "UNAUTHORIZED", message: "Please sign in as an admin to view tickets." } }, 401),
    );
    render(<TicketsBoard />);
    expect(await screen.findByText("Please sign in as an admin to view tickets.")).toBeInTheDocument();
  });
});
