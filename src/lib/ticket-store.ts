// Saves and loads support tickets. The rest of the app only uses the four
// functions at the bottom (createTicket, getTicket, listTickets, updateTicket).
//
// Two storage backends:
// - Supabase (Postgres), used when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   are set. Needed on serverless hosting such as Vercel, which cannot keep files.
// - A local JSON file (default data/tickets.json), used otherwise. Simple and
//   dependency-free for local development and tests.
import { randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupportTicket, TicketNotification, TicketStatus } from "@/types/support-ticket";
import { PRIORITIES } from "@/types/ticket";
import { AnalysisError } from "./gemini";

// No 0/O/1/I so IDs are easy to read out loud.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const TICKET_ID_PATTERN = /^GI-[2-9A-HJ-NP-Z]{6}$/;

function newId(): string {
  let id = "GI-";
  for (let i = 0; i < 6; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

export type NewTicket = Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "status" | "resolution">;
type TicketChanges = { status?: TicketStatus; resolution?: string; notification?: TicketNotification };

/** Thrown when tickets cannot be saved or loaded. The message is safe to show. */
function storageError(): AnalysisError {
  return new AnalysisError(
    "STORAGE_ERROR",
    503,
    "Support tickets can't be saved right now. Please try again shortly, or contact us by email.",
  );
}

function applyChanges(ticket: SupportTicket, changes: TicketChanges, now: Date): SupportTicket {
  return {
    ...ticket,
    ...(changes.status ? { status: changes.status } : {}),
    ...(changes.resolution !== undefined ? { resolution: changes.resolution } : {}),
    ...(changes.notification ? { notification: changes.notification } : {}),
    updatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Supabase backend (REST API, no extra dependency)
// Table: public.support_tickets (id text primary key, data jsonb, created_at, updated_at)
// Row Level Security is on with no public policies, so only this server
// (using the secret service-role key) can read or write tickets.
// ---------------------------------------------------------------------------

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : undefined;
}

async function supabase(pathAndQuery: string, init: RequestInit = {}): Promise<Response> {
  const config = supabaseConfig()!;
  let res: Response;
  try {
    res = await fetch(`${config.url}/rest/v1/support_tickets${pathAndQuery}`, {
      ...init,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error("[tickets] Supabase request failed (network)");
    throw storageError();
  }
  return res;
}

async function expectOk(res: Response): Promise<Response> {
  if (!res.ok) {
    // Log the status only; the body could contain ticket data.
    console.error(`[tickets] Supabase error: status ${res.status}`);
    throw storageError();
  }
  return res;
}

const supabaseStore = {
  async create(input: NewTicket, now: Date): Promise<SupportTicket> {
    // Retry with a new ID in the (very unlikely) case of a duplicate.
    for (let tries = 0; tries < 3; tries++) {
      const ticket: SupportTicket = {
        ...input,
        id: newId(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: "open",
        resolution: "",
      };
      const res = await supabase("", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ id: ticket.id, data: ticket, created_at: ticket.createdAt, updated_at: ticket.updatedAt }),
      });
      if (res.status === 409) continue;
      await expectOk(res);
      return ticket;
    }
    throw storageError();
  },

  async get(id: string): Promise<SupportTicket | undefined> {
    const res = await expectOk(await supabase(`?id=eq.${encodeURIComponent(id)}&select=data`));
    const rows = (await res.json()) as { data: SupportTicket }[];
    return rows[0]?.data;
  },

  async list(): Promise<SupportTicket[]> {
    const res = await expectOk(await supabase(`?select=data&order=created_at.desc&limit=500`));
    const rows = (await res.json()) as { data: SupportTicket }[];
    return rows.map((r) => r.data);
  },

  async update(id: string, changes: TicketChanges, now: Date): Promise<SupportTicket | undefined> {
    const current = await this.get(id);
    if (!current) return undefined;
    const ticket = applyChanges(current, changes, now);
    await expectOk(
      await supabase(`?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ data: ticket, updated_at: ticket.updatedAt }),
      }),
    );
    return ticket;
  },
};

// ---------------------------------------------------------------------------
// Local file backend
// ---------------------------------------------------------------------------

// The file path comes from config at runtime, so tell the bundler not to trace it.
function storeFile(): string {
  return process.env.TICKETS_FILE?.trim() || path.join(process.cwd(), "data", "tickets.json");
}

async function readAll(): Promise<SupportTicket[]> {
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ storeFile(), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as SupportTicket[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.error(`[tickets] Could not read ticket file: ${(error as NodeJS.ErrnoException).code ?? "unknown"}`);
    throw storageError();
  }
}

async function writeAll(tickets: SupportTicket[]): Promise<void> {
  const file = storeFile();
  try {
    await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
    // Write to a temp file then rename, so a crash never leaves half a file.
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(tickets, null, 2), "utf8");
    await rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ file);
  } catch (error) {
    // e.g. EROFS on Vercel, where the app folder is read-only: configure Supabase.
    console.error(
      `[tickets] Could not write ticket file: ${(error as NodeJS.ErrnoException).code ?? "unknown"}. ` +
        "On serverless hosting, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    throw storageError();
  }
}

// Run read-modify-write operations one at a time inside this server process.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const fileStore = {
  create(input: NewTicket, now: Date): Promise<SupportTicket> {
    return exclusive(async () => {
      const tickets = await readAll();
      const taken = new Set(tickets.map((t) => t.id));
      let id = newId();
      while (taken.has(id)) id = newId();
      const ticket: SupportTicket = {
        ...input,
        id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: "open",
        resolution: "",
      };
      tickets.push(ticket);
      await writeAll(tickets);
      return ticket;
    });
  },

  async get(id: string): Promise<SupportTicket | undefined> {
    return (await readAll()).find((t) => t.id === id);
  },

  list(): Promise<SupportTicket[]> {
    return readAll();
  },

  update(id: string, changes: TicketChanges, now: Date): Promise<SupportTicket | undefined> {
    return exclusive(async () => {
      const tickets = await readAll();
      const index = tickets.findIndex((t) => t.id === id);
      if (index < 0) return undefined;
      tickets[index] = applyChanges(tickets[index], changes, now);
      await writeAll(tickets);
      return tickets[index];
    });
  },
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

const store = () => (supabaseConfig() ? supabaseStore : fileStore);

export function createTicket(input: NewTicket, now = new Date()): Promise<SupportTicket> {
  return store().create(input, now);
}

export function getTicket(id: string): Promise<SupportTicket | undefined> {
  return store().get(id.toUpperCase());
}

const STATUS_ORDER: Record<TicketStatus, number> = { open: 0, in_progress: 1, resolved: 2 };

/** Unresolved first, then highest priority, then newest. */
export async function listTickets(): Promise<SupportTicket[]> {
  const tickets = await store().list();
  const priorityRank = (t: SupportTicket) => PRIORITIES.length - PRIORITIES.indexOf(t.analysis.priority);
  return tickets.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      priorityRank(a) - priorityRank(b) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export function updateTicket(id: string, changes: TicketChanges, now = new Date()): Promise<SupportTicket | undefined> {
  return store().update(id.toUpperCase(), changes, now);
}
