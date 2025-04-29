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

  constructor(private http: HttpClient) { }

  initialize(): Observable<boolean> {
    if (this.isInitialized) {
      return of(true);
    }

    const allowedSections$ = this.http.get<{sections: string[]}>('assets/json/allowed_sections.json');
    const bannedWords$ = this.http.get<{words: string[]}>('assets/json/banned_words.json');
    const bannedKeywords$ = this.http.get<{keywords: string[]}>('assets/json/banned_keywords.json');
    const eventSchema$ = this.http.get<any>('assets/json/event_schema.json');

    return forkJoin([allowedSections$, bannedWords$, bannedKeywords$, eventSchema$]).pipe(
      map(([allowedSections, bannedWords, bannedKeywords, eventSchema]) => {
        this.allowedSections = allowedSections.sections;
        this.bannedWords = bannedWords.words;
        this.bannedKeywords = bannedKeywords.keywords;
        this.eventSchema = eventSchema;
        this.isInitialized = true;
        return true;
      }),
      catchError(error => {
        console.error('Failed to load constraints:', error);
        return of(false);
      })
    );
  }

  isSectionAllowed(section: string): boolean {
    return this.allowedSections.includes(section.toLowerCase());
  }

  getAllowedSections(): string[] {
    return [...this.allowedSections];
  }

  hasBannedContent(text: string): { hasBanned: boolean, bannedTerms: string[] } {
    const textLower = text.toLowerCase();
    const foundBannedWords = this.bannedWords.filter(word => 
      textLower.includes(word.toLowerCase())
    );
    
    const foundBannedKeywords = this.bannedKeywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    const allBanned = [...foundBannedWords, ...foundBannedKeywords];
    
    return {
      hasBanned: allBanned.length > 0,
      bannedTerms: allBanned
    };
  }

  getRequiredEventFields(): string[] {
    return this.eventSchema.required || [];
  }

  getEventSchema() {
    return this.eventSchema;
  }
}