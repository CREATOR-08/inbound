

export interface EmailThread {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  aiClassification: "URGENT" | "ROUTINE" | "NEWSLETTER";
  summary?: string;
}
