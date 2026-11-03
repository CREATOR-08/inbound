"use client";

import { useMemo } from "react";
import {
  isArchivedEmail,
  isScheduledEmail,
  matchesEmailFilter,
} from "@/lib/email-utils";
import type { EmailFilter, EmailThread } from "@/Types/email";

interface UseEmailFiltersOptions {
  emails: EmailThread[];
  currentFilter: EmailFilter;
  scheduledEmailIds: ReadonlySet<string>;
}

export function useEmailFilters({
  emails,
  currentFilter,
  scheduledEmailIds,
}: UseEmailFiltersOptions) {
  const visibleEmails = useMemo(
    () => emails.filter((email) => matchesEmailFilter(email, currentFilter, scheduledEmailIds)),
    [currentFilter, emails, scheduledEmailIds],
  );

  const counts = useMemo<Record<EmailFilter, number>>(
    () => ({
      ALL: emails.filter((email) => !isArchivedEmail(email)).length,
      UNREAD: emails.filter(
        (email) => !isArchivedEmail(email) && !email.is_read,
      ).length,
      READ: emails.filter(
        (email) => !isArchivedEmail(email) && email.is_read === true,
      ).length,
      TRIAGED: emails.filter(
        (email) => !isArchivedEmail(email) && Boolean(email.category),
      ).length,
      URGENT: emails.filter(
        (email) =>
          !isArchivedEmail(email) &&
          (email.priority?.toUpperCase() === "URGENT" ||
            email.category?.toUpperCase() === "URGENT"),
      ).length,
      HIGH_PRIORITY: emails.filter(
        (email) => !isArchivedEmail(email) && email.priority?.toUpperCase() === "HIGH",
      ).length,
      SCHEDULED: emails.filter(
        (email) =>
          !isArchivedEmail(email) && isScheduledEmail(email, scheduledEmailIds),
      ).length,
      ARCHIVE: emails.filter(isArchivedEmail).length,
    }),
    [emails, scheduledEmailIds],
  );

  return {
    visibleEmails,
    counts,
    isScheduled: (email: EmailThread) => isScheduledEmail(email, scheduledEmailIds),
  };
}
