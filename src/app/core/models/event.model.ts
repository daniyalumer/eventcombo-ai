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
  content: unknown;
}

export interface SpeakersContent {
  speakers: Speaker[];
}

export interface AgendaContent {
  items: AgendaItem[];
}

export interface RegistrationContent {
  text?: string;
}

export interface Speaker {
  name: string;
  bio?: string;
  role?: string;
  image?: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

export interface SponsorItem {
  name: string;
  logo?: string;
  level?: string;
}