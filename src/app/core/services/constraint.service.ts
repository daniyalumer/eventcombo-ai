import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConstraintService {
  private allowedSections: string[] = [];
  private bannedWords: string[] = [];
  private bannedKeywords: string[] = [];
  private eventSchema: any = {};
  private isInitialized = false;

  constructor(private http: HttpClient) {
    console.log('[ConstraintService] Service instantiated');
  }

  initialize(): Observable<boolean> {
    console.log('[ConstraintService] Initializing constraint service...');
    
    if (this.isInitialized) {
      console.log('[ConstraintService] Already initialized, returning cached data');
      return of(true);
    }

    console.log('[ConstraintService] Loading constraint data from JSON files...');
    const allowedSections$ = this.http.get<{sections: string[]}>('assets/json/allowed_sections.json');
    const bannedWords$ = this.http.get<{words: string[]}>('assets/json/banned_words.json');
    const bannedKeywords$ = this.http.get<{keywords: string[]}>('assets/json/banned_keywords.json');
    const eventSchema$ = this.http.get<any>('assets/json/event_schema.json');

    return forkJoin([allowedSections$, bannedWords$, bannedKeywords$, eventSchema$]).pipe(
      map(([allowedSections, bannedWords, bannedKeywords, eventSchema]) => {
        console.log('[ConstraintService] Successfully loaded all constraint data');
        
        this.allowedSections = allowedSections.sections;
        console.log(`[ConstraintService] Loaded ${this.allowedSections.length} allowed sections: ${this.allowedSections.join(', ')}`);
        
        this.bannedWords = bannedWords.words;
        console.log(`[ConstraintService] Loaded ${this.bannedWords.length} banned words`);
        
        this.bannedKeywords = bannedKeywords.keywords;
        console.log(`[ConstraintService] Loaded ${this.bannedKeywords.length} banned keywords`);
        
        this.eventSchema = eventSchema;
        console.log(`[ConstraintService] Loaded event schema with ${this.eventSchema.required?.length || 0} required fields`);
        
        this.isInitialized = true;
        console.log('[ConstraintService] Initialization complete');
        return true;
      }),
      catchError(error => {
        console.error('[ConstraintService] Failed to load constraints:', error);
        return of(false);
      })
    );
  }

  isSectionAllowed(section: string): boolean {
    const isAllowed = this.allowedSections.includes(section.toLowerCase());
    console.log(`[ConstraintService] Checking if section "${section}" is allowed: ${isAllowed}`);
    return isAllowed;
  }

  getAllowedSections(): string[] {
    console.log('[ConstraintService] Getting all allowed sections');
    return [...this.allowedSections];
  }

  hasBannedContent(text: string): { hasBanned: boolean, bannedTerms: string[] } {
    console.log('[ConstraintService] Checking for banned content in text');
    
    const textLower = text.toLowerCase();
    const foundBannedWords = this.bannedWords.filter(word => 
      textLower.includes(word.toLowerCase())
    );
    
    const foundBannedKeywords = this.bannedKeywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    const allBanned = [...foundBannedWords, ...foundBannedKeywords];
    
    const result = {
      hasBanned: allBanned.length > 0,
      bannedTerms: allBanned
    };
    
    if (result.hasBanned) {
      console.warn(`[ConstraintService] Found banned terms in content: ${result.bannedTerms.join(', ')}`);
    } else {
      console.log('[ConstraintService] No banned content found in text');
    }
    
    return result;
  }

  getRequiredEventFields(): string[] {
    const fields = this.eventSchema.required || [];
    console.log(`[ConstraintService] Getting ${fields.length} required event fields: ${fields.join(', ')}`);
    return fields;
  }

  getEventSchema() {
    console.log('[ConstraintService] Getting event schema');
    return this.eventSchema;
  }
}