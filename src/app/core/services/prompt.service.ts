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
  ) {
    console.log('[PromptService] Service instantiated');
  }

  processPrompt(prompt: string): Observable<{missingInfo: ClarificationQuestion[] | null, success: boolean}> {
    console.log('[PromptService] Processing prompt');
    this.eventService.setLoading(true);
    this.eventService.setError(null);
    console.log('[PromptService] Loading state set to true, errors cleared');

    // First check for banned content locally
    console.log('[PromptService] Checking for banned content in prompt');
    const bannedCheck = this.constraintService.hasBannedContent(prompt);
    
    if (bannedCheck.hasBanned) {
      console.warn('[PromptService] Banned content detected:', bannedCheck.bannedTerms.join(', '));
      this.eventService.setLoading(false);
      this.eventService.setError(`Your prompt contains banned content: ${bannedCheck.bannedTerms.join(', ')}`);
      return of({ missingInfo: null, success: false });
    }
    
    console.log('[PromptService] Prompt passed banned content check');

    // Prepare constraints for the LLM
    console.log('[PromptService] Preparing constraints for LLM');
    const constraints = {
      allowedSections: this.constraintService.getAllowedSections(),
      bannedWords: this.constraintService.hasBannedContent('dummy').bannedTerms,
      bannedKeywords: this.constraintService.hasBannedContent('dummy').bannedTerms,
      requiredFields: this.constraintService.getRequiredEventFields()
    };
    
    console.log('[PromptService] Constraints prepared');

    // Send to LLM for processing
    console.log('[PromptService] Sending prompt to LLM service for processing');
    return this.llmService.generateEventFromPrompt(prompt, constraints).pipe(
      map(response => {
        console.log('[PromptService] Received response from LLM service');
        this.eventService.setLoading(false);
        console.log('[PromptService] Loading state set to false');
        
        // Store analysis for later use with clarifications
        this.currentAnalysis = response;
        console.log('[PromptService] Stored analysis result for potential clarifications');
        
        // Check if there's missing information that needs clarification
        const missingInfo = response.analysisSummary?.missingInformation || [];
        console.log('[PromptService] Missing information count:', missingInfo.length);
        
        if (missingInfo.length > 0) {
          console.log('[PromptService] Missing information fields:', missingInfo.map((item: any) => item.field).join(', '));
        }
        
        // If no missing info, set the event data
        if (missingInfo.length === 0 && response.event) {
          console.log('[PromptService] No missing information, setting event data');
          this.eventService.setEvent(response.event as Event);
          
          const rejectedSections = response.analysisSummary?.rejectedSections || [];
          console.log('[PromptService] Rejected sections count:', rejectedSections.length);
          
          if (rejectedSections.length > 0) {
            console.log('[PromptService] Rejected sections:', rejectedSections.join(', '));
          }
          
          this.eventService.setRejectedSections(rejectedSections);
          console.log('[PromptService] Event data set successfully');
          return { missingInfo: null, success: true };
        }
        
        // Return missing info for clarification dialog
        console.log('[PromptService] Returning missing information for clarification dialog');
        return { 
          missingInfo: missingInfo as ClarificationQuestion[], 
          success: missingInfo.length === 0 
        };
      }),
      catchError(error => {
        console.error('[PromptService] Error processing prompt:', error);
        this.eventService.setLoading(false);
        this.eventService.setError('Failed to process your prompt. Please try again.');
        console.log('[PromptService] Loading state set to false, error set');
        return of({ missingInfo: null, success: false });
      })
    );
  }

  processClarification(answers: Record<string, string>): Observable<boolean> {
    console.log('[PromptService] Processing clarification answers');
    console.log('[PromptService] Answer fields:', Object.keys(answers).join(', '));
    
    if (!this.currentAnalysis) {
      console.error('[PromptService] No pending prompt analysis to clarify');
      this.eventService.setError('No pending prompt to clarify');
      return of(false);
    }

    console.log('[PromptService] Found pending analysis to apply clarifications to');
    this.eventService.setLoading(true);
    console.log('[PromptService] Loading state set to true');

    // Create a complete event object with the clarification answers
    const event = { ...this.currentAnalysis.event };
    console.log('[PromptService] Created event object from current analysis');

    // Apply clarification answers to the event
    console.log('[PromptService] Applying clarification answers to event');
    Object.entries(answers).forEach(([field, value]) => {
      console.log(`[PromptService] Processing answer for field "${field}"`);
      
      if (field.includes('.')) {
        // Handle nested fields like section.speakers[0].name
        console.log(`[PromptService] Field "${field}" is a nested field`);
        const [section, subfield] = field.split('.');
        // Need more complex parsing for nested fields
        console.log('[PromptService] Nested field handling not fully implemented yet');
      } else {
        // Handle top-level fields
        console.log(`[PromptService] Setting top-level field "${field}"`);
        (event as any)[field] = value;
      }
    });

    // Update the event with clarification data
    console.log('[PromptService] Updating event with clarification data');
    this.eventService.setEvent(event as Event);
    
    const rejectedSections = this.currentAnalysis.analysisSummary?.rejectedSections || [];
    if (rejectedSections.length > 0) {
      console.log('[PromptService] Setting rejected sections:', rejectedSections.join(', '));
    } else {
      console.log('[PromptService] No rejected sections to set');
    }
    
    this.eventService.setRejectedSections(rejectedSections);
    this.eventService.setLoading(false);
    console.log('[PromptService] Loading state set to false');

    // Clear the current analysis now that it's been processed
    this.currentAnalysis = null;
    console.log('[PromptService] Cleared current analysis');

    console.log('[PromptService] Clarification processing completed successfully');
    return of(true);
  }
}