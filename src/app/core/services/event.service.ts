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
  
  private transformToSpeakersContent(content: unknown): SpeakersContent {
    console.log('[EventService] Transforming speakers content');
    const contentObj = content as Record<string, any>;
    
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
    const contentObj = content as Record<string, any>;
    
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
    const contentObj = content as Record<string, any>;
    
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
    const contentObj = content as Record<string, any>;
    
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
    const contentObj = content as Record<string, any>;
    
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
    const contentObj = content as Record<string, any>;
    
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