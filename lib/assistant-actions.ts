import type { AssistantUIAction } from "@/Types/assistant";

interface AssistantActionCallbacks {
  availableEmailIds: ReadonlySet<string>;
  openEmail: (emailId: string) => void;
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

  if (action.type === "NAVIGATE" && Object.keys(parameters).length === 1) {
    if (parameters.page === "inbox") {
      callbacks.navigateToInbox();
      return "Opened the inbox.";
    }
    return "That page is not available in this frontend.";
  }

  if (action.type === "CLEAR_FILTERS") {
    if (Object.keys(parameters).length > 0) {
      return "This action has invalid parameters.";
    }
    callbacks.setFilter("ALL");
    return "Cleared inbox filters.";
  }

  if (action.type === "OPEN_COMPOSE") {
    return "Compose is not available in this frontend.";
  }

  return "This assistant action is not supported.";
}
