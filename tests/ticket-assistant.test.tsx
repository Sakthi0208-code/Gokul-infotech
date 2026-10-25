// UI tests for the dashboard. fetch is mocked, so the backend and Gemini are not called.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketAssistant } from "@/components/ticket-assistant";
import { SAMPLE_TICKETS } from "@/lib/sample-tickets";

const analysis = {
  category: "Account Access",
  priority: "High",
  sentiment: "Negative",
  summary: "The customer cannot access their account after repeated password resets.",
  suggested_reply: "I'm sorry you're experiencing this issue. Please confirm whether you received the latest reset email.",
  recommended_action: "Investigate the account login and password reset process.",
  priority_reason: "Repeated failed attempts prevent the customer from accessing the service.",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function setup() {
  const user = userEvent.setup();
  render(<TicketAssistant />);
  const textarea = screen.getByLabelText("Customer message");
  const analyze = screen.getByRole("button", { name: "Analyze Ticket" });
  return { user, textarea, analyze };
}

describe("TicketAssistant", () => {
  it("shows a validation message and does not call the API for empty input", async () => {
    const { user, analyze } = setup();
    await user.click(analyze);
    expect(screen.getByRole("alert")).toHaveTextContent(/enter the customer's message/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call the API for whitespace-only input", async () => {
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "      ");
    await user.click(analyze);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the character count", async () => {
    const { user, textarea } = setup();
    await user.type(textarea, "Hello there");
    expect(screen.getByText("11 / 5,000 characters")).toBeInTheDocument();
  });

  it("fills the textarea from an example ticket", async () => {
    const { user, textarea } = setup();
    await user.click(screen.getByRole("button", { name: SAMPLE_TICKETS[1].label }));
    expect(textarea).toHaveValue(SAMPLE_TICKETS[1].text);
  });

  it("sends trimmed text to /api/analyze, shows loading, then shows the result", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { user, textarea, analyze } = setup();

    await user.type(textarea, "  I cannot log in to my account.  ");
    await user.click(analyze);

    // Loading state: button disabled and status shown
    expect(screen.getByRole("button", { name: /analyzing/i })).toBeDisabled();
    expect(screen.getByText(/analyzing ticket with gemini/i)).toBeInTheDocument();

    // Request goes to the backend endpoint with trimmed text
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(JSON.parse(init.body)).toEqual({ ticket: "I cannot log in to my account." });

    resolve(jsonResponse({ analysis, model: "gemini-test" }));

    expect(await screen.findByRole("heading", { name: "Analysis" })).toBeInTheDocument();
    expect(screen.getByText("Account Access")).toBeInTheDocument();
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText(analysis.summary)).toBeInTheDocument();
    expect(screen.getByText(analysis.suggested_reply)).toBeInTheDocument();
    expect(screen.getByText(analysis.recommended_action)).toBeInTheDocument();
    expect(screen.getByText(analysis.priority_reason)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze Ticket" })).toBeEnabled();
  });

  it("blocks duplicate submissions while a request is in progress", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { user, textarea } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.keyboard("{Control>}{Enter}{/Control}");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the setup message when the API key is missing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: "MISSING_API_KEY", message: "The server is not configured with a Gemini API key." } },
        503,
      ),
    );
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);

    expect(await screen.findByText("Gemini is not configured")).toBeInTheDocument();
    expect(screen.getByText(/copy .env.example to .env.local/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Analysis" })).not.toBeInTheDocument();
  });

  it("shows a friendly error when the network request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);

    expect(await screen.findByText("Could not reach the server")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze Ticket" })).toBeEnabled();
  });

  it("retries after an error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { code: "TIMEOUT", message: "Gemini did not respond." } }, 504))
      .mockResolvedValueOnce(jsonResponse({ analysis, model: "gemini-test" }));
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);

    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText(analysis.summary)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("copies the suggested reply and shows feedback", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ analysis, model: "gemini-test" }));
    const { user, textarea, analyze } = setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();

    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);
    await user.click(await screen.findByRole("button", { name: "Copy reply" }));

    expect(writeText).toHaveBeenCalledWith(analysis.suggested_reply);
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("clears the form and result", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ analysis, model: "gemini-test" }));
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);
    await screen.findByRole("heading", { name: "Analysis" });

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(textarea).toHaveValue("");
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Analysis" })).not.toBeInTheDocument());
    expect(screen.getByText("No analysis yet")).toBeInTheDocument();
  });

  it("keeps recent analyses in session history", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ analysis, model: "gemini-test" }));
    const { user, textarea, analyze } = setup();
    await user.type(textarea, "I cannot log in to my account.");
    await user.click(analyze);

    expect(await screen.findByRole("heading", { name: "Recent analyses" })).toBeInTheDocument();
    expect(screen.getByText(/kept only in this browser tab/i)).toBeInTheDocument();
  });
});
