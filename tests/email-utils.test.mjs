import assert from "node:assert/strict";
import test from "node:test";
import {
  getScheduleClarification,
  isScheduleExtractionResponse,
} from "../lib/email-utils.ts";

test("accepts a calendar response carrying an actionable clarification", () => {
  const response = {
    confirmation_required: true,
    calendar_event: {
      draft_id: "draft-1",
      title: "Meeting",
      start_time: "",
      end_time: "",
      attendees: [],
      confidence: 0,
      ambiguity: "Did you mean 7 AM or 7 PM? What duration should I use?",
      extraction_status: "ambiguous",
      status: "PENDING",
    },
  };

  assert.equal(isScheduleExtractionResponse(response), true);
});

test("rejects unknown calendar extraction statuses", () => {
  const response = {
    confirmation_required: true,
    calendar_event: {
      draft_id: "draft-1",
      title: "Meeting",
      start_time: "",
      end_time: "",
      attendees: [],
      confidence: 0,
      extraction_status: "guessed",
      status: "PENDING",
    },
  };

  assert.equal(isScheduleExtractionResponse(response), false);
});

test("provides the extracted clarification for ScheduleModal to display", () => {
  assert.equal(
    getScheduleClarification({
      confidence: 0,
      ambiguity: "Did you mean 7 AM or 7 PM? What duration should I use?",
      extraction_status: "ambiguous",
    }),
    "Did you mean 7 AM or 7 PM? What duration should I use?",
  );
  assert.equal(
    getScheduleClarification({
      confidence: 0.9,
      ambiguity: null,
      extraction_status: "complete",
    }),
    null,
  );
});
