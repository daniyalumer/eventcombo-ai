import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Define interface for speakers content
export interface SpeakersContent {
  speakers: {
    name: string;
    role?: string;
    bio?: string;
  }[];  // Changed from Array<{...}> to {...}[]
}

// Define interface for agenda content
export interface AgendaContent {
  items: {
    time: string;
    title: string;
    description?: string;
    speaker?: string;
  }[];  // Changed from Array<{...}> to {...}[]
}

// Define interface for registration content
export interface TextContent {
  text: string;
}

// Union type for possible content types
export type SectionContent = SpeakersContent | AgendaContent | TextContent;

@Component({
  selector: 'app-event-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-section.component.html',
  styleUrl: './event-section.component.css'
})
export class EventSectionComponent {
  @Input() type = '';
  @Input() title = '';
  @Input() content: SectionContent = { text: '' };
  
  isSpeakersSection(): boolean {
    return this.type === 'speakers';
  }
  
  isAgendaSection(): boolean {
    return this.type === 'agenda';
  }
  
  isRegistrationSection(): boolean {
    return this.type === 'registration';
  }
  
  // Type guard functions to check content type
  hasSpeakers(content: SectionContent): content is SpeakersContent {
    return 'speakers' in content && Array.isArray((content as SpeakersContent).speakers);
  }
  
  hasAgendaItems(content: SectionContent): content is AgendaContent {
    return 'items' in content && Array.isArray((content as AgendaContent).items);
  }
  
  hasText(content: SectionContent): content is TextContent {
    return 'text' in content;
  }
}