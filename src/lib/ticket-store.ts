// Stores support tickets in a JSON file (default: data/tickets.json).
// Simple and dependency-free for local demos. On serverless hosting (e.g.
// Vercel) files are not kept between requests, so swap this module for a
// database (Supabase, Postgres, etc.) before deploying. The rest of the app
// only uses the functions exported here.
import { randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupportTicket, TicketNotification, TicketStatus } from "@/types/support-ticket";
import { PRIORITIES } from "@/types/ticket";

// The file path comes from config at runtime, so tell the bundler not to trace it.
function storeFile(): string {
  return process.env.TICKETS_FILE?.trim() || path.join(process.cwd(), "data", "tickets.json");
}

// No 0/O/1/I so IDs are easy to read out loud.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const TICKET_ID_PATTERN = /^GI-[2-9A-HJ-NP-Z]{6}$/;

function newId(): string {
  let id = "GI-";
  for (let i = 0; i < 6; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

async function readAll(): Promise<SupportTicket[]> {
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ storeFile(), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as SupportTicket[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeAll(tickets: SupportTicket[]): Promise<void> {
  const file = storeFile();
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  // Write to a temp file then rename, so a crash never leaves half a file.
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(tickets, null, 2), "utf8");
  await rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ file);
}

// Run read-modify-write operations one at a time inside this server process.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export type NewTicket = Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "status" | "resolution">;

export function createTicket(input: NewTicket, now = new Date()): Promise<SupportTicket> {
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
}

export async function getTicket(id: string): Promise<SupportTicket | undefined> {
  const tickets = await readAll();
  return tickets.find((t) => t.id === id.toUpperCase());
}

const STATUS_ORDER: Record<TicketStatus, number> = { open: 0, in_progress: 1, resolved: 2 };

/** Unresolved first, then highest priority, then newest. */
export async function listTickets(): Promise<SupportTicket[]> {
  const tickets = await readAll();
  const priorityRank = (t: SupportTicket) => PRIORITIES.length - PRIORITIES.indexOf(t.analysis.priority);
  return tickets.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      priorityRank(a) - priorityRank(b) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export function updateTicket(
  id: string,
  changes: { status?: TicketStatus; resolution?: string; notification?: TicketNotification },
  now = new Date(),
): Promise<SupportTicket | undefined> {
  return exclusive(async () => {
    const tickets = await readAll();
    const ticket = tickets.find((t) => t.id === id.toUpperCase());
    if (!ticket) return undefined;
    if (changes.status) ticket.status = changes.status;
    if (changes.resolution !== undefined) ticket.resolution = changes.resolution;
    if (changes.notification) ticket.notification = changes.notification;
    ticket.updatedAt = now.toISOString();
    await writeAll(tickets);
    return ticket;
  });
}
