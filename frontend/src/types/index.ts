export type RiskSeverity = "Low" | "Medium" | "High" | "Critical";
export type ChangeType = "ADDED" | "REMOVED" | "MODIFIED";
export type ContractStatus = "uploaded" | "processing" | "ready";

export interface Contract {
  id: string;
  filename: string;
  uploadDate: string;
  pages: number;
  status: ContractStatus;
  riskCount: number;
  highRiskCount: number;
}

export interface ContractSummary {
  contractPurpose: string;
  parties: string[];
  duration: string;
  paymentTerms: string;
  keyObligations: string[];
  terminationConditions: string;
  importantClauses: string[];
}

export interface Clause {
  chunkIndex: number;
  pageNumber: number | null;
  heading: string | null;
  text: string;
  category: string;
  confidence: number;
}

export interface RiskFinding {
  id: string;
  title: string;
  severity: RiskSeverity;
  explanation: string;
  evidence: string;
  pageNumber: number | null;
  section: string | null;
}

export interface Obligation {
  responsibleParty: string | null;
  obligation: string;
  deadline: string | null;
  section: string | null;
  pageNumber: number | null;
}

export interface DateItem {
  description: string;
  dateOrTimeframe: string | null;
  pageNumber: number | null;
}

export interface DeadlinesSummary {
  contractStartDate: string | null;
  contractEndDate: string | null;
  renewalDate: string | null;
  terminationNoticePeriod: string | null;
  paymentDeadlines: DateItem[];
  deliveryDeadlines: DateItem[];
  otherDates: DateItem[];
}

export interface ChatSource {
  pageNumber: number | null;
  heading: string | null;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: ChatSource[];
}

export interface ChangeItem {
  id: string;
  changeType: ChangeType;
  section: string | null;
  pageNumberA: number | null;
  pageNumberB: number | null;
  textA: string | null;
  textB: string | null;
}
