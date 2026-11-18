import { expect, it } from "vitest";
import { timeAgo } from "@/lib/time";

// SPEC §13.1 time-ago format, §18.1 Text utils.
const now = Date.parse("2026-11-18T12:00:00Z");
const ago = (s: number) => timeAgo(new Date(now - s * 1000).toISOString(), now);

it.each([
  [0, "just now"],
  [44, "just now"],
  [60, "1 minute ago"],
  [5 * 60, "5 minutes ago"],
  [59 * 60, "59 minutes ago"],
  [3600, "1 hour ago"],
  [2 * 3600, "2 hours ago"],
  [23 * 3600, "23 hours ago"],
  [24 * 3600, "1 day ago"],
  [3 * 86400, "3 days ago"],
  [13 * 86400, "13 days ago"],
  [14 * 86400, "2 weeks ago"],
  [-30, "just now"], // a clock slightly ahead
])("%i seconds ago reads %s", (s, text) => expect(ago(s)).toBe(text));
