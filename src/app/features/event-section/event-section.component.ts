import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  SpeakersContent, 
  AgendaContent, 
  TextContent, 
  RegistrationContent,
  LocationContent,
  FAQContent,
  ContactContent,
  SponsorsContent
} from '../../core/models/event.model';

// Union type for all possible content types
export type SectionContent = 
  | SpeakersContent 
  | AgendaContent 
  | TextContent 
  | RegistrationContent
  | LocationContent
  | FAQContent
  | ContactContent
  | SponsorsContent;

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
  
  isLocationSection(): boolean {
    return this.type === 'location';
  }
  
  isFAQSection(): boolean {
    return this.type === 'faq';
  }
  
  isContactSection(): boolean {
    return this.type === 'contact';
  }
  
  isSponsorsSection(): boolean {
    return this.type === 'sponsors';
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
  
  // Additional type guards for other content types
  hasRegistrationForm(content: SectionContent): content is RegistrationContent {
    return 'fields' in content || 'text' in content;
  }
  
  hasLocationDetails(content: SectionContent): content is LocationContent {
    return 'address' in content || 'isVirtual' in content || 'text' in content;
  }
  
  hasFAQItems(content: SectionContent): content is FAQContent {
    return 'items' in content && Array.isArray((content as FAQContent).items);
  }
  
  hasContactInfo(content: SectionContent): content is ContactContent {
    return 'email' in content || 'phone' in content || 'text' in content;
  }
  
  hasSponsors(content: SectionContent): content is SponsorsContent {
    return 'sponsors' in content && Array.isArray((content as SponsorsContent).sponsors);
  }
}