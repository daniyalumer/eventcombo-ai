import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  Event, 
  EventSection,
  SpeakersContent, 
  AgendaContent, 
  TextContent,
  RegistrationContent,
  LocationContent,
  FAQContent,
  ContactContent,
  SponsorsContent
} from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventSubject = new BehaviorSubject<Event | null>(null);
  private rejectedSectionsSubject = new BehaviorSubject<string[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  constructor() {
    console.log('[EventService] Service instantiated');
  }
  
  setEvent(event: Event): void {
    console.log('[EventService] Setting event:', event.name);
    
    // Format date strings
    if (event.startDate) {
      event.startDate = this.parseAndFormatDate(event.startDate);
    }
    if (event.endDate) {
      event.endDate = this.parseAndFormatDate(event.endDate);
    }
    
    // Process sections to ensure content is properly typed
    if (event && event.sections) {
      console.log(`[EventService] Processing ${event.sections.length} sections for content transformation`);
      event.sections = event.sections.map(section => {
        console.log(`[EventService] Transforming content for section type: ${section.type}`);
        return {
          ...section,
          content: this.transformContent(section.type, section.content)
        };
      });
    }
    
    console.log('[EventService] Event processed and ready to publish');
    this.eventSubject.next(event);
  }
  
  private transformContent(sectionType: string, content: unknown): any {
    // If content is null or undefined, return a default content
    if (!content) {
      console.log(`[EventService] Empty content provided for section type ${sectionType}, using default content`);
      return { text: '' };
    }
    
    try {
      console.log(`[EventService] Transforming content for section type: ${sectionType}`);
      switch (sectionType.toLowerCase()) {
        case 'speakers':
          return this.transformToSpeakersContent(content);
        case 'agenda':
          return this.transformToAgendaContent(content);
        case 'registration':
          return this.transformToRegistrationContent(content);
        case 'location':
          return this.transformToLocationContent(content);
        case 'faq':
          return this.transformToFAQContent(content);
        case 'contact':
          return this.transformToContactContent(content);
        case 'sponsors':
          return this.transformToSponsorsContent(content);
        default:
          console.log(`[EventService] Unknown section type: ${sectionType}, using text content transformer`);
          return this.transformToTextContent(content);
      }
    } catch (error) {
      console.error(`[EventService] Error transforming content for section type ${sectionType}:`, error);
      return { text: 'Error processing content' };
    }
  }

  private parseAndFormatDate(dateString: string): string {
    try {
      // Handle various date formats including "1st may 2025"
      return new Date(dateString.replace(/(\d+)(st|nd|rd|th)/, '$1')).toISOString();
    } catch (e) {
      console.warn(`[EventService] Failed to parse date: ${dateString}`, e);
      return new Date().toISOString(); // Fallback to current date
    }
  }
  
  private transformToSpeakersContent(content: unknown): SpeakersContent {
    console.log('[EventService] Transforming speakers content');
    
    // Handle string input (e.g., "John Doe, Jane Smith")
    if (typeof content === 'string') {
      console.log(`[EventService] Speakers provided as string: "${content}"`);
      // Split the string by commas and create speaker objects
      const speakerNames = content.split(',').map(name => name.trim()).filter(name => name);
      const speakers = speakerNames.map(name => ({
        name,
        role: '',
        bio: ''
      }));
      
      console.log(`[EventService] Transformed ${speakers.length} speakers from string input`);
      return { speakers };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle case where content might have a 'speakers' property as a string
    if (typeof contentObj['speakers'] === 'string') {
      const speakerNames = contentObj['speakers'].split(',').map(name => name.trim()).filter(name => name);
      const speakers = speakerNames.map(name => ({
        name,
        role: '',
        bio: ''
      }));
      
      console.log(`[EventService] Transformed ${speakers.length} speakers from string property`);
      return { speakers };
    }
    
    // Handle normal object structure
    const speakers = Array.isArray(contentObj['speakers']) 
      ? contentObj['speakers'].map((speaker: any) => ({
          name: speaker['name'] || 'Unknown Speaker',
          role: speaker['role'] || '',
          bio: speaker['bio'] || ''
        }))
      : [];
    
    console.log(`[EventService] Transformed ${speakers.length} speakers`);
    return { speakers };
  }
  
  private transformToAgendaContent(content: unknown): AgendaContent {
    console.log('[EventService] Transforming agenda content');
    
    // Handle string input (e.g., "9:00 - Opening, 10:00 - Keynote")
    if (typeof content === 'string') {
      console.log(`[EventService] Agenda provided as string: "${content}"`);
      // Try to split the string by commas or newlines
      const agendaItems = content.split(/[,\n]/).map(item => item.trim()).filter(item => item);
      
      const items = agendaItems.map(item => {
        // Try to extract time and title (e.g., "9:00 - Opening")
        const match = item.match(/^([^-]+)-(.+)$/);
        
        if (match) {
          return {
            time: match[1].trim(),
            title: match[2].trim(),
            description: '',
            speaker: ''
          };
        } else {
          return {
            time: 'TBD',
            title: item,
            description: '',
            speaker: ''
          };
        }
      });
      
      console.log(`[EventService] Transformed ${items.length} agenda items from string input`);
      return { items };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle case where content might have an 'items' property as a string
    if (typeof contentObj['items'] === 'string') {
      const agendaItems = contentObj['items'].split(/[,\n]/).map(item => item.trim()).filter(item => item);
      
      const items = agendaItems.map(item => {
        // Try to extract time and title (e.g., "9:00 - Opening")
        const match = item.match(/^([^-]+)-(.+)$/);
        
        if (match) {
          return {
            time: match[1].trim(),
            title: match[2].trim(),
            description: '',
            speaker: ''
          };
        } else {
          return {
            time: 'TBD',
            title: item,
            description: '',
            speaker: ''
          };
        }
      });
      
      console.log(`[EventService] Transformed ${items.length} agenda items from string property`);
      return { items };
    }
    
    // Handle normal object structure
    const items = Array.isArray(contentObj['items']) 
      ? contentObj['items'].map((item: any) => ({
          time: item['time'] || 'TBD',
          title: item['title'] || 'Untitled Agenda Item',
          description: item['description'] || '',
          speaker: item['speaker'] || ''
        }))
      : [];
    
    console.log(`[EventService] Transformed ${items.length} agenda items`);
    return { items };
  }
  
  private transformToRegistrationContent(content: unknown): RegistrationContent {
    console.log('[EventService] Transforming registration content');
    
    // Handle string input (e.g., "Register by May 1st")
    if (typeof content === 'string') {
      console.log(`[EventService] Registration provided as string: "${content}"`);
      return {
        text: content,
        buttonText: 'Register Now',
        fields: [
          {
            name: 'Full Name',
            required: true,
            type: 'text'
          },
          {
            name: 'Email',
            required: true,
            type: 'email'
          }
        ]
      };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle fields as string
    if (typeof contentObj['fields'] === 'string') {
      const fieldNames = contentObj['fields'].split(',').map(field => field.trim()).filter(field => field);
      const fields = fieldNames.map(name => ({
        name,
        required: name.toLowerCase().includes('email') || name.toLowerCase().includes('name'),
        type: name.toLowerCase().includes('email') ? 'email' : 'text'
      }));
      
      console.log(`[EventService] Transformed ${fields.length} registration fields from string`);
      return {
        text: contentObj['text'] || 'Register for this event',
        buttonText: contentObj['buttonText'] || 'Register Now',
        fields
      };
    }
    
    // Handle normal object structure
    const fields = Array.isArray(contentObj['fields']) ? contentObj['fields'] : [];
    console.log(`[EventService] Transformed registration with ${fields.length} fields`);
    
    return {
      text: contentObj['text'] || 'Register for this event',
      buttonText: contentObj['buttonText'] || 'Register Now',
      fields
    };
  }
  
  private transformToLocationContent(content: unknown): LocationContent {
    console.log('[EventService] Transforming location content');
    
    // Handle string input (e.g., "123 Main St, City, State")
    if (typeof content === 'string') {
      console.log(`[EventService] Location provided as string: "${content}"`);
      
      // Check if it's a URL or contains virtual keywords
      const isVirtual = /^https?:\/\/|zoom|online|virtual|web/i.test(content);
      
      if (isVirtual) {
        return {
          isVirtual: true,
          virtualLink: content.startsWith('http') ? content : '',
          text: content,
          address: '',
          city: '',
          state: '',
          zipCode: ''
        };
      } else {
        // Try to parse physical address
        const parts = content.split(',').map(part => part.trim());
        
        return {
          isVirtual: false,
          virtualLink: '',
          address: parts[0] || '',
          city: parts[1] || '',
          state: parts[2] || '',
          zipCode: parts[3] || '',
          text: content
        };
      }
    }
    
    const contentObj = content as Record<string, any>;
    
    const isVirtual = !!contentObj['isVirtual'];
    console.log(`[EventService] Location is ${isVirtual ? 'virtual' : 'physical'}`);
    
    return {
      address: contentObj['address'] || '',
      city: contentObj['city'] || '',
      state: contentObj['state'] || '',
      zipCode: contentObj['zipCode'] || '',
      virtualLink: contentObj['virtualLink'] || '',
      isVirtual,
      text: contentObj['text'] || ''
    };
  }
  
  private transformToFAQContent(content: unknown): FAQContent {
    console.log('[EventService] Transforming FAQ content');
    
    // Handle string input (e.g., "Q: When? A: May 1st, Q: Where? A: Online")
    if (typeof content === 'string') {
      console.log(`[EventService] FAQ provided as string: "${content}"`);
      
      let items: {question: string, answer: string}[] = [];
      
      // Try to parse Q&A format
      const qaPairs = content.split(/Q:|Question:/).filter(s => s.trim());
      
      if (qaPairs.length > 0) {
        items = qaPairs.map(pair => {
          const parts = pair.split(/A:|Answer:/).map(s => s.trim());
          return {
            question: parts[0] || 'Question',
            answer: parts[1] || 'No answer provided'
          };
        });
      } else {
        // If no Q/A format detected, split by commas or lines
        const lines = content.split(/[,\n]/).map(line => line.trim()).filter(line => line);
        items = lines.map(line => ({
          question: line,
          answer: 'Please contact us for more information'
        }));
      }
      
      console.log(`[EventService] Transformed ${items.length} FAQ items from string input`);
      return { items };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle case where items is a string
    if (typeof contentObj['items'] === 'string') {
      const lines = contentObj['items'].split(/[,\n]/).map(line => line.trim()).filter(line => line);
      
      const items = lines.map(line => {
        const parts = line.split('?');
        if (parts.length > 1) {
          return {
            question: parts[0].trim() + '?',
            answer: parts[1].trim()
          };
        } else {
          return {
            question: line,
            answer: 'Please contact us for more information'
          };
        }
      });
      
      console.log(`[EventService] Transformed ${items.length} FAQ items from string property`);
      return { items };
    }
    
    // Handle normal object structure
    const items = Array.isArray(contentObj['items']) 
      ? contentObj['items'].map((item: any) => ({
          question: item['question'] || 'Question',
          answer: item['answer'] || 'Answer'
        }))
      : [];
    
    console.log(`[EventService] Transformed ${items.length} FAQ items`);
    return { items };
  }
  
  private transformToContactContent(content: unknown): ContactContent {
    console.log('[EventService] Transforming contact content');
    
    // Handle string input (e.g., "Email: contact@event.com, Phone: 123-456-7890")
    if (typeof content === 'string') {
      console.log(`[EventService] Contact provided as string: "${content}"`);
      
      let email = '';
      let phone = '';
      const text = content;
      
      // Try to extract email
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        email = emailMatch[0];
      }
      
      // Try to extract phone
      const phoneMatch = content.match(/(\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/);
      if (phoneMatch) {
        phone = phoneMatch[0];
      }
      
      return {
        email,
        phone,
        text: content,
        socialMedia: []
      };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle social media as string
    if (typeof contentObj['socialMedia'] === 'string') {
      const platforms = contentObj['socialMedia'].split(',').map(platform => platform.trim()).filter(platform => platform);
      
      const socialMedia = platforms.map(platform => {
        const parts = platform.split(':').map(part => part.trim());
        if (parts.length > 1) {
          return {
            platform: parts[0],
            handle: parts[1]
          };
        } else {
          return {
            platform: 'Other',
            handle: parts[0]
          };
        }
      });
      
      console.log(`[EventService] Transformed ${socialMedia.length} social media entries from string`);
      return {
        email: contentObj['email'] || '',
        phone: contentObj['phone'] || '',
        socialMedia,
        text: contentObj['text'] || 'Contact us for more information'
      };
    }
    
    // Handle normal object structure
    const socialMedia = Array.isArray(contentObj['socialMedia']) ? contentObj['socialMedia'] : [];
    console.log(`[EventService] Transformed contact with ${socialMedia.length} social media entries`);
    
    return {
      email: contentObj['email'] || '',
      phone: contentObj['phone'] || '',
      socialMedia,
      text: contentObj['text'] || 'Contact us for more information'
    };
  }
  
  private transformToSponsorsContent(content: unknown): SponsorsContent {
    console.log('[EventService] Transforming sponsors content');
    
    // Handle string input (e.g., "Acme Inc. - Gold, XYZ Corp - Silver")
    if (typeof content === 'string') {
      console.log(`[EventService] Sponsors provided as string: "${content}"`);
      
      const sponsorLines = content.split(/[,\n]/).map(line => line.trim()).filter(line => line);
      
      const sponsors = sponsorLines.map(line => {
        const parts = line.split('-').map(part => part.trim());
        if (parts.length > 1) {
          return {
            name: parts[0],
            level: parts[1],
            description: ''
          };
        } else {
          return {
            name: parts[0],
            level: '',
            description: ''
          };
        }
      });
      
      console.log(`[EventService] Transformed ${sponsors.length} sponsors from string input`);
      return { sponsors };
    }
    
    const contentObj = content as Record<string, any>;
    
    // Handle sponsors as string
    if (typeof contentObj['sponsors'] === 'string') {
      const sponsorLines = contentObj['sponsors'].split(/[,\n]/).map(line => line.trim()).filter(line => line);
      
      const sponsors = sponsorLines.map(line => {
        const parts = line.split('-').map(part => part.trim());
        if (parts.length > 1) {
          return {
            name: parts[0],
            level: parts[1],
            description: ''
          };
        } else {
          return {
            name: parts[0],
            level: '',
            description: ''
          };
        }
      });
      
      console.log(`[EventService] Transformed ${sponsors.length} sponsors from string property`);
      return { sponsors };
    }
    
    // Handle normal object structure
    const sponsors = Array.isArray(contentObj['sponsors']) 
      ? contentObj['sponsors'].map((sponsor: any) => ({
          name: sponsor['name'] || 'Sponsor',
          level: sponsor['level'] || '',
          description: sponsor['description'] || ''
        }))
      : [];
    
    console.log(`[EventService] Transformed ${sponsors.length} sponsors`);
    return { sponsors };
  }
  
  private transformToTextContent(content: unknown): TextContent {
    console.log('[EventService] Transforming generic text content');
    
    if (typeof content === 'string') {
      console.log('[EventService] Content is already string, using directly');
      return { text: content };
    }
    
    const contentObj = content as Record<string, any>;
    let textContent = '';
    
    if (contentObj['text']) {
      console.log('[EventService] Using text property from content');
      textContent = contentObj['text'];
    } else if (typeof contentObj === 'object') {
      console.log('[EventService] Converting object to JSON string');
      textContent = JSON.stringify(contentObj);
    } else {
      console.log('[EventService] Converting non-object to string');
      textContent = String(contentObj);
    }
    
    return { text: textContent };
  }
  
  getEvent(): Observable<Event | null> {
    console.log('[EventService] Getting current event');
    return this.eventSubject.asObservable();
  }
  
  clearEvent(): void {
    console.log('[EventService] Clearing current event');
    this.eventSubject.next(null);
  }
  
  setRejectedSections(sections: string[]): void {
    console.log(`[EventService] Setting ${sections.length} rejected sections: ${sections.join(', ')}`);
    this.rejectedSectionsSubject.next(sections);
  }
  
  getRejectedSections(): Observable<string[]> {
    console.log('[EventService] Getting rejected sections');
    return this.rejectedSectionsSubject.asObservable();
  }

  setLoading(isLoading: boolean): void {
    console.log(`[EventService] Setting loading state: ${isLoading}`);
    this.loadingSubject.next(isLoading);
  }

  getLoading(): Observable<boolean> {
    console.log('[EventService] Getting loading state');
    return this.loadingSubject.asObservable();
  }

  setError(error: string | null): void {
    if (error) {
      console.error(`[EventService] Setting error: ${error}`);
    } else {
      console.log('[EventService] Clearing error state');
    }
    this.errorSubject.next(error);
  }

  getError(): Observable<string | null> {
    console.log('[EventService] Getting error state');
    return this.errorSubject.asObservable();
  }
}