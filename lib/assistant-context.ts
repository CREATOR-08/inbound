import type { AssistantPageContext } from "@/Types/assistant";
import type { EmailFilter } from "@/Types/email";

export function collectAssistantPageContext(
  activeFilter: EmailFilter,
  selectedEmailId: string | null,
): AssistantPageContext {
  return {
    page: selectedEmailId ? "email_detail" : "inbox",
    active_filter: activeFilter,
    selected_email_id: selectedEmailId,
  };
}
