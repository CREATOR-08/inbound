import type { AssistantUIAction } from "@/Types/assistant";

interface AssistantActionCallbacks {
  availableEmailIds: ReadonlySet<string>;
  openEmail: (emailId: string) => void;
  openCompose: (parameters: Record<string, unknown>) => string;
  navigateToInbox: () => void;
  setFilter: (filter: "ALL" | "URGENT") => void;
}

export function dispatchAssistantAction(
  action: AssistantUIAction,
  callbacks: AssistantActionCallbacks,
): string {
  const { parameters } = action;

  if (action.type === "OPEN_EMAIL") {
    if (Object.keys(parameters).length !== 1 || !("email_id" in parameters)) {
      return "This action has invalid parameters.";
    }
    const emailId = parameters.email_id;
    if (typeof emailId !== "string" || !callbacks.availableEmailIds.has(emailId)) {
      return "That email is not available in the current inbox.";
    }
    callbacks.openEmail(emailId);
    return "Opened the email.";
  }

  if (action.type === "FILTER_EMAILS") {
    if (Object.keys(parameters).length !== 1 || !("filter" in parameters)) {
      return "This action has invalid parameters.";
    }
    const filter = parameters.filter;
    if (filter === "ALL" || filter === "URGENT") {
      callbacks.setFilter(filter);
      return `Showing ${filter === "ALL" ? "all" : "urgent"} emails.`;
    }
    return "That filter is not supported by this inbox.";
  }

  if (action.type === "NAVIGATE") {
    if (Object.keys(parameters).length !== 1 || typeof parameters.page !== "string") {
      return "This action has invalid parameters.";
    }
    if (parameters.page === "inbox") {
      callbacks.navigateToInbox();
      return "Opened the inbox.";
    }
    if (["sent", "drafts", "calendar"].includes(parameters.page)) {
      return `The ${parameters.page} destination is not available in this frontend.`;
    }
    return "That destination is not supported.";
  }

  if (action.type === "CLEAR_FILTERS") {
    if (Object.keys(parameters).length > 0) {
      return "This action has invalid parameters.";
    }
    callbacks.setFilter("ALL");
    return "Cleared inbox filters.";
  }

  if (action.type === "OPEN_COMPOSE") {
    return callbacks.openCompose(parameters);
  }

  return "This assistant action is not supported.";
}
