import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { ConstraintService } from './constraint.service';
import { LlmService } from './llm.service';
import { EventService } from './event.service';
import { ClarificationQuestion, Event, PromptAnalysisResult } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private currentAnalysis: any = null;

  constructor(
    private constraintService: ConstraintService,
    private llmService: LlmService,
    private eventService: EventService
  ) { }

  processPrompt(prompt: string): Observable<{missingInfo: ClarificationQuestion[] | null, success: boolean}> {
    this.eventService.setLoading(true);
    this.eventService.setError(null);

    // First check for banned content locally
    const bannedCheck = this.constraintService.hasBannedContent(prompt);
    if (bannedCheck.hasBanned) {
      this.eventService.setLoading(false);
      this.eventService.setError(`Your prompt contains banned content: ${bannedCheck.bannedTerms.join(', ')}`);
      return of({ missingInfo: null, success: false });
    }

    // Prepare constraints for the LLM
    const constraints = {
      allowedSections: this.constraintService.getAllowedSections(),
      bannedWords: this.constraintService.hasBannedContent('dummy').bannedTerms,
      bannedKeywords: this.constraintService.hasBannedContent('dummy').bannedTerms,
      requiredFields: this.constraintService.getRequiredEventFields()
    };

    // Send to LLM for processing
    return this.llmService.generateEventFromPrompt(prompt, constraints).pipe(
      map(response => {
        this.eventService.setLoading(false);
        
        // Store analysis for later use with clarifications
        this.currentAnalysis = response;
        
        // Check if there's missing information that needs clarification
        const missingInfo = response.analysisSummary?.missingInformation || [];
        
        // If no missing info, set the event data
        if (missingInfo.length === 0 && response.event) {
          this.eventService.setEvent(response.event as Event);
          this.eventService.setRejectedSections(response.analysisSummary?.rejectedSections || []);
          return { missingInfo: null, success: true };
        }
        
        // Return missing info for clarification dialog
        return { 
          missingInfo: missingInfo as ClarificationQuestion[], 
          success: missingInfo.length === 0 
        };
      }),
      catchError(error => {
        console.error('Error processing prompt:', error);
        this.eventService.setLoading(false);
        this.eventService.setError('Failed to process your prompt. Please try again.');
        return of({ missingInfo: null, success: false });
      })
    );
  }

  processClarification(answers: Record<string, string>): Observable<boolean> {
    if (!this.currentAnalysis) {
      this.eventService.setError('No pending prompt to clarify');
      return of(false);
    }

    this.eventService.setLoading(true);

    // Create a complete event object with the clarification answers
    const event = { ...this.currentAnalysis.event };

    // Apply clarification answers to the event
    Object.entries(answers).forEach(([field, value]) => {
      if (field.includes('.')) {
        // Handle nested fields like section.speakers[0].name
        const [section, subfield] = field.split('.');
        // Need more complex parsing for nested fields
      } else {
        // Handle top-level fields
        (event as any)[field] = value;
      }
    });

    // Update the event with clarification data
    this.eventService.setEvent(event as Event);
    this.eventService.setRejectedSections(this.currentAnalysis.analysisSummary?.rejectedSections || []);
    this.eventService.setLoading(false);

    // Clear the current analysis now that it's been processed
    this.currentAnalysis = null;

    return of(true);
  }
}