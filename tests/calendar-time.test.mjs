import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIstCalendarDateTime,
  isoToIstDateTimeInput,
  istDateTimeInputToIso,
} from "../lib/calendar-time.ts";

test("converts an ISO timestamp to an IST input value and back to the same instant", () => {
  const inputValue = isoToIstDateTimeInput("2026-10-31T20:05:00+05:30");

  assert.equal(inputValue, "2026-10-31T20:05");
  assert.equal(istDateTimeInputToIso(inputValue), "2026-10-31T14:35:00.000Z");
});

test("converts a UTC Z timestamp to the corresponding IST input value", () => {
  const inputValue = isoToIstDateTimeInput("2026-10-31T14:35:00Z");

  assert.equal(inputValue, "2026-10-31T20:05");
  assert.equal(istDateTimeInputToIso(inputValue), "2026-10-31T14:35:00.000Z");
});

test("interprets datetime-local values in IST independently of browser timezone", () => {
  const inputValue = "2026-10-31T20:05";
  const isoValue = istDateTimeInputToIso(inputValue);

  assert.equal(isoValue, "2026-10-31T14:35:00.000Z");
  assert.ok(isoValue);
  assert.equal(isoToIstDateTimeInput(isoValue), inputValue);
});

test("preserves IST calendar dates across month and year boundaries", () => {
  const monthBoundary = "2026-03-31T00:05:00+05:30";
  const yearBoundary = "2027-01-01T00:05:00+05:30";

  assert.equal(
    istDateTimeInputToIso(isoToIstDateTimeInput(monthBoundary)),
    "2026-03-30T18:35:00.000Z",
  );
  assert.equal(
    istDateTimeInputToIso(isoToIstDateTimeInput(yearBoundary)),
    "2026-12-31T18:35:00.000Z",
  );
  assert.equal(formatIstCalendarDateTime(monthBoundary), "Mar 31, 12:05 AM");
  assert.equal(formatIstCalendarDateTime(yearBoundary), "Jan 1, 12:05 AM");
});

test("renders calendar timestamps in IST", () => {
  assert.equal(
    formatIstCalendarDateTime("2026-10-31T20:05:00+05:30"),
    "Oct 31, 8:05 PM",
  );
});

test("renders the proposed midnight IST event without shifting its date", () => {
  assert.equal(
    formatIstCalendarDateTime("2026-03-30T00:00:00+05:30"),
    "Mar 30, 12:00 AM",
  );
});
