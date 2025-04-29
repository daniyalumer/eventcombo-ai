export interface Event {
  name: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizer?: string;
  sections: EventSection[];
}

export interface EventSection {
  type: string;
  title: string;
  content: SpeakersContent | AgendaContent | TextContent | RegistrationContent | LocationContent | FAQContent | ContactContent | SponsorsContent;
}

export interface SpeakersContent {
  speakers: {
    name: string;
    role?: string;
    bio?: string;
  }[];
}

export interface AgendaContent {
  items: {
    time: string;
    title: string;
    description?: string;
    speaker?: string;
  }[];
}

export interface TextContent {
  text: string;
}

export interface RegistrationContent {
  text?: string;
  buttonText?: string;
  fields?: {
    name: string;
    required: boolean;
    type: string;
  }[];
}

export interface LocationContent {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  virtualLink?: string;
  isVirtual?: boolean;
  text?: string;
}

export interface FAQContent {
  items: {
    question: string;
    answer: string;
  }[];
}

export interface ContactContent {
  email?: string;
  phone?: string;
  socialMedia?: {
    platform: string;
    handle: string;
  }[];
  text?: string;
}

export interface SponsorsContent {
  sponsors: {
    name: string;
    level?: string;
    description?: string;
  }[];
}

export interface PromptAnalysisResult {
  event: Partial<Event>;
  requestedSections: string[];
  allowedSections: string[];
  rejectedSections: string[];
  hasBannedContent: boolean;
  bannedTerms: string[];
  missingInformation: {field: string, question: string}[];
}

export interface ClarificationQuestion {
  field: string;
  question: string;
}

export type ClarificationAnswers = Record<string, string>;