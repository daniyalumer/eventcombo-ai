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
  
  constructor() { }
  
  setEvent(event: Event): void {
    // Process sections to ensure content is properly typed
    if (event && event.sections) {
      event.sections = event.sections.map(section => {
        return {
          ...section,
          content: this.transformContent(section.type, section.content)
        };
      });
    }
    
    this.eventSubject.next(event);
  }
  
  private transformContent(sectionType: string, content: unknown): any {
    // If content is null or undefined, return a default content
    if (!content) {
      return { text: '' };
    }
    
    try {
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
          return this.transformToTextContent(content);
      }
    } catch (error) {
      console.error(`Error transforming content for section type ${sectionType}:`, error);
      return { text: 'Error processing content' };
    }
  }
  
  private transformToSpeakersContent(content: unknown): SpeakersContent {
    const contentObj = content as Record<string, any>;
    return {
      speakers: Array.isArray(contentObj['speakers']) 
        ? contentObj['speakers'].map((speaker: any) => ({
            name: speaker['name'] || 'Unknown Speaker',
            role: speaker['role'] || '',
            bio: speaker['bio'] || ''
          }))
        : []
    };
  }
  
  private transformToAgendaContent(content: unknown): AgendaContent {
    const contentObj = content as Record<string, any>;
    return {
      items: Array.isArray(contentObj['items']) 
        ? contentObj['items'].map((item: any) => ({
            time: item['time'] || 'TBD',
            title: item['title'] || 'Untitled Agenda Item',
            description: item['description'] || '',
            speaker: item['speaker'] || ''
          }))
        : []
    };
  }
  
  private transformToRegistrationContent(content: unknown): RegistrationContent {
    const contentObj = content as Record<string, any>;
    return {
      text: contentObj['text'] || 'Register for this event',
      buttonText: contentObj['buttonText'] || 'Register Now',
      fields: Array.isArray(contentObj['fields']) ? contentObj['fields'] : []
    };
  }
  
  private transformToLocationContent(content: unknown): LocationContent {
    const contentObj = content as Record<string, any>;
    return {
      address: contentObj['address'] || '',
      city: contentObj['city'] || '',
      state: contentObj['state'] || '',
      zipCode: contentObj['zipCode'] || '',
      virtualLink: contentObj['virtualLink'] || '',
      isVirtual: !!contentObj['isVirtual'],
      text: contentObj['text'] || ''
    };
  }
  
  private transformToFAQContent(content: unknown): FAQContent {
    const contentObj = content as Record<string, any>;
    return {
      items: Array.isArray(contentObj['items']) 
        ? contentObj['items'].map((item: any) => ({
            question: item['question'] || 'Question',
            answer: item['answer'] || 'Answer'
          }))
        : []
    };
  }
  
  private transformToContactContent(content: unknown): ContactContent {
    const contentObj = content as Record<string, any>;
    return {
      email: contentObj['email'] || '',
      phone: contentObj['phone'] || '',
      socialMedia: Array.isArray(contentObj['socialMedia']) ? contentObj['socialMedia'] : [],
      text: contentObj['text'] || 'Contact us for more information'
    };
  }
  
  private transformToSponsorsContent(content: unknown): SponsorsContent {
    const contentObj = content as Record<string, any>;
    return {
      sponsors: Array.isArray(contentObj['sponsors']) 
        ? contentObj['sponsors'].map((sponsor: any) => ({
            name: sponsor['name'] || 'Sponsor',
            level: sponsor['level'] || '',
            description: sponsor['description'] || ''
          }))
        : []
    };
  }
  
  private transformToTextContent(content: unknown): TextContent {
    if (typeof content === 'string') {
      return { text: content };
    }
    
    const contentObj = content as Record<string, any>;
    return {
      text: contentObj['text'] || (typeof contentObj === 'object' ? JSON.stringify(contentObj) : String(contentObj))
    };
  }
  
  getEvent(): Observable<Event | null> {
    return this.eventSubject.asObservable();
  }
  
  clearEvent(): void {
    this.eventSubject.next(null);
  }
  
  setRejectedSections(sections: string[]): void {
    this.rejectedSectionsSubject.next(sections);
  }
  
  getRejectedSections(): Observable<string[]> {
    return this.rejectedSectionsSubject.asObservable();
  }

  setLoading(isLoading: boolean): void {
    this.loadingSubject.next(isLoading);
  }

  getLoading(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  getError(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }
}