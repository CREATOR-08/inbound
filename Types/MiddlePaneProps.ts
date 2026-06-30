import { EmailThread } from "./email";
export interface MiddlePaneProps {
  aiSidebarOpen: boolean;
  setAiSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  threads: EmailThread[];
  selectedThreadId: string;
  setSelectedThreadId: React.Dispatch<React.SetStateAction<string>>;
}