import { Injectable } from '@angular/core';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { ConstraintService } from './constraint.service';
import { LlmService } from './llm.service';
import { EventService } from './event.service';
import { Event, ClarificationQuestion } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private currentAnalysis: any = null;
  private baseEvent: any = null;
  private originalPrompt: string = '';
  private currentConstraints: any = null;
  private processingStage: 'base' | 'sections' = 'base';
  
  // Add this to expose missing info questions
  private currentMissingInfoSubject = new BehaviorSubject<ClarificationQuestion[] | null>(null);
  public currentMissingInfo$ = this.currentMissingInfoSubject.asObservable();

  constructor(
    private constraintService: ConstraintService,
    private llmService: LlmService,
    private eventService: EventService
  ) {
    console.log('[PromptService] Service instantiated');
  }

  processPrompt(prompt: string): Observable<{missingInfo: ClarificationQuestion[] | null, success: boolean}> {
    console.log('[PromptService] Processing prompt');
    this.originalPrompt = prompt;
    this.processingStage = 'base';

    // Validate prompt
    if (!prompt || prompt.trim().length < 10) {
      console.warn('[PromptService] Prompt too short or empty');
      this.eventService.setError('Please provide a more detailed description of your event (at least 10 characters)');
      return of({ missingInfo: null, success: false });
    }

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
    this.currentConstraints = {
      allowedSections: this.constraintService.getAllowedSections(),
      bannedWords: this.constraintService.getBannedWords(),
      bannedKeywords: this.constraintService.getBannedKeywords(),
      requiredFields: this.constraintService.getRequiredEventFields()
    };
    
    console.log('[PromptService] Constraints prepared');

    // STEP 1: Generate base event
    console.log('[PromptService] STEP 1: Sending prompt to LLM service for base event generation');
    return this.llmService.generateEventBaseFromPrompt(prompt, this.currentConstraints).pipe(
      switchMap(baseResponse => {
        console.log('[PromptService] Received base event response from LLM service');
        this.eventService.setLoading(false);
        
        // Store the base response for potential clarifications
        this.currentAnalysis = baseResponse;
        
        // Store the base event
        this.baseEvent = baseResponse.event || {};
        console.log('[PromptService] Base event stored:', this.baseEvent.name || 'unnamed');
        
        // Check if there's missing information for the base event
        const missingBaseInfo = baseResponse.analysisSummary?.missingInformation || [];
        console.log('[PromptService] Missing base information count:', missingBaseInfo.length);
        
        if (missingBaseInfo.length > 0) {
          console.log('[PromptService] Base event has missing information, will ask for clarification');
          // Emit missing info through the subject
          this.currentMissingInfoSubject.next(missingBaseInfo as ClarificationQuestion[]);
          // Return the missing info and indicate we're not done yet
          return of({ 
            missingInfo: missingBaseInfo as ClarificationQuestion[], 
            success: false 
          });
        }
        
        // If no missing base info, we can proceed directly to sections
        console.log('[PromptService] Base event generated successfully, proceeding to sections');
        
        // Continue to sections immediately since no clarifications needed
        return this.proceedToSectionsGeneration();
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
  
  // Private method to proceed to sections generation after base event is complete
  private proceedToSectionsGeneration(): Observable<{missingInfo: ClarificationQuestion[] | null, success: boolean}> {
    this.processingStage = 'sections';
    this.eventService.setLoading(true);
    
    console.log('[PromptService] STEP 2: Sending base event to LLM service for sections generation');
    console.log('[PromptService] Base event being sent:', this.baseEvent);
    
    return this.llmService.generateEventSectionsFromBase(this.baseEvent, this.originalPrompt, this.currentConstraints).pipe(
      map(sectionsResponse => {
        console.log('[PromptService] Received sections response from LLM service');
        this.eventService.setLoading(false);
        
        // Check if there's missing information for sections
        const missingSectionsInfo = sectionsResponse.analysisSummary?.missingInformation || [];
        console.log('[PromptService] Missing sections information count:', missingSectionsInfo.length);
        
        // Store the sections response for potential clarifications
        this.currentAnalysis = sectionsResponse;
        
        // Emit missing sections info if any
        if (missingSectionsInfo.length > 0) {
          console.log('[PromptService] Emitting missing sections information for clarification');
          this.currentMissingInfoSubject.next(missingSectionsInfo as ClarificationQuestion[]);
        }
        
        // If no missing info for sections, set the complete event
        if (missingSectionsInfo.length === 0) {
          console.log('[PromptService] No missing section information, creating complete event');
          const completeEvent = {
            ...this.baseEvent,
            sections: sectionsResponse.sections || []
          };
          
          console.log('[PromptService] Complete event created with', 
            completeEvent.sections.length, 'sections');
          
          this.eventService.setEvent(completeEvent as Event);
          
          // Handle rejected sections
          const rejectedSections = sectionsResponse.analysisSummary?.rejectedSections || [];
          this.eventService.setRejectedSections(rejectedSections);
          
          if (rejectedSections.length > 0) {
            console.warn('[PromptService] Some sections were rejected:', rejectedSections.join(', '));
            const reasons = Object.entries(sectionsResponse.analysisSummary?.rejectionReasons || {})
              .map(([section, reason]) => `${section}: ${reason}`)
              .join('; ');
            this.eventService.setError(`Some sections were not included: ${reasons}`);
          }
        }
        
        // Return missing info for clarification dialog
        return { 
          missingInfo: missingSectionsInfo as ClarificationQuestion[], 
          success: missingSectionsInfo.length === 0 
        };
      }),
      catchError(error => {
        console.error('[PromptService] Error generating sections:', error);
        this.eventService.setLoading(false);
        this.eventService.setError('Failed to generate event sections. Please try again.');
        return of({ missingInfo: null, success: false });
      })
    );
  }

  processClarification(answers: Record<string, string>): Observable<boolean> {
    console.log('[PromptService] Processing clarification answers');
    console.log('[PromptService] Answer fields:', Object.keys(answers).join(', '));
    console.log('[PromptService] Current processing stage:', this.processingStage);
    
    if (!this.currentAnalysis) {
      console.error('[PromptService] No pending analysis to apply clarifications to');
      this.eventService.setError('Something went wrong. Please try submitting your event description again.');
      return of(false);
    }
  
    console.log('[PromptService] Found pending analysis to apply clarifications to');
  
    // Apply clarification answers based on which stage we're in
    if (this.processingStage === 'base') {
      console.log('[PromptService] Applying clarifications to base event');
      
      // Apply clarification answers to the base event
      Object.entries(answers).forEach(([field, value]) => {
        console.log(`[PromptService] Setting base event field "${field}" to "${value}"`);
        this.baseEvent[field] = value;
      });
      
      console.log('[PromptService] Base event updated with clarifications:', this.baseEvent);
      
      // Proceed to sections generation with the updated base event
      return this.proceedToSectionsGeneration().pipe(
        switchMap(result => {
          // If sections also need clarification, return false to continue the clarification process
          const isComplete = !result.missingInfo || result.missingInfo.length === 0;
          if (isComplete) {
            // Clear the missing info subject since we're done
            this.currentMissingInfoSubject.next(null);
          }
          return of(isComplete);
        })
      );
    } 
    else if (this.processingStage === 'sections') {
      console.log('[PromptService] Applying clarifications to sections');
      this.eventService.setLoading(true);
      
      try {
        // Get sections from the current analysis
        const updatedSections = this.currentAnalysis.sections ? 
          [...this.currentAnalysis.sections] : 
          [];
        
        // Apply clarification answers to the sections
        Object.entries(answers).forEach(([field, value]) => {
          console.log(`[PromptService] Processing answer for section field "${field}": "${value}"`);
          
          // Handle section fields (e.g., "speakers.name" or "agenda.items.0.time")
          if (field.includes('.')) {
            const parts = field.split('.');
            
            // Find the section this field belongs to
            const sectionType = parts[0];
            const sectionIndex = updatedSections.findIndex((section: any) => section.type === sectionType);
            
            if (sectionIndex >= 0) {
              console.log(`[PromptService] Found section for field "${sectionType}" at index ${sectionIndex}`);
              
              // Handle fields for specific section formats
              const section = updatedSections[sectionIndex];
              
              if (parts.length === 2) {
                // Simple property like "speakers.name"
                if (!section.content) section.content = {} as Record<string, any>;
                section.content[parts[1]] = value;
              } 
              else if (parts.length >= 3) {
                // Nested properties like "speakers.speakers.0.name" or "agenda.items.0.time"
                
                // Initialize content object if it doesn't exist
                if (!section.content) section.content = {} as Record<string, any>;
                
                // Handle array notation if present
                const propertyPath = parts.slice(1);
                let current = section.content as Record<string, any>;
                
                for (let i = 0; i < propertyPath.length - 1; i++) {
                  const prop = propertyPath[i];
                  
                  // Handle array index notation
                  if (i + 1 < propertyPath.length && /^\d+$/.test(propertyPath[i + 1])) {
                    const arrayProp = prop;
                    const index = parseInt(propertyPath[i + 1], 10);
                    
                    if (!current[arrayProp]) {
                      current[arrayProp] = [];
                    }
                    
                    while (current[arrayProp].length <= index) {
                      current[arrayProp].push({} as Record<string, any>);
                    }
                    
                    current = current[arrayProp][index] as Record<string, any>;
                    i++; // Skip the index
                  } else {
                    if (!current[prop]) {
                      current[prop] = {} as Record<string, any>;
                    }
                    current = current[prop] as Record<string, any>;
                  }
                }
                
                // Set the final property
                const finalProp = propertyPath[propertyPath.length - 1];
                current[finalProp] = value;
              }
            } else {
              console.warn(`[PromptService] Section not found for field "${sectionType}", creating it`);
              // If the section doesn't exist, create it
              const newSection = {
                type: sectionType,
                title: sectionType.charAt(0).toUpperCase() + sectionType.slice(1),
                content: {} as Record<string, any>
              };
              
              // Add the section
              updatedSections.push(newSection);
              
              // Set the field value (simplified approach)
              if (parts.length >= 2) {
                // Simple handling for direct property
                if (parts.length === 2) {
                  newSection.content[parts[1]] = value;
                }
                // For more complex paths, create a simple object structure
                else {
                  const contentKey = parts[1]; // e.g., "speakers" in "speakers.0.name"
                  if (!newSection.content[contentKey]) {
                    newSection.content[contentKey] = [];
                  }
                  
                  // Add an item to the array
                  if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
                    const index = parseInt(parts[2], 10);
                    const item = {} as Record<string, any>;
                    
                    // Set the property if we have a fourth part
                    if (parts.length >= 4) {
                      item[parts[3]] = value;
                    }
                    
                    // Ensure the array has enough elements
                    while (newSection.content[contentKey].length <= index) {
                      newSection.content[contentKey].push({} as Record<string, any>);
                    }
                    
                    // Merge the new item with any existing data
                    newSection.content[contentKey][index] = {
                      ...newSection.content[contentKey][index],
                      ...item
                    };
                  }
                }
              }
            }
          }
        });
      
        // Create the complete event with the updated sections
        const completeEvent = {
          ...this.baseEvent,
          sections: updatedSections
        };
        
        console.log('[PromptService] Complete event with sections and clarifications:', {
          eventName: completeEvent.name,
          sectionCount: completeEvent.sections.length
        });
        
        // Update the event with clarification data
        this.eventService.setEvent(completeEvent as Event);
        
        const rejectedSections = this.currentAnalysis.analysisSummary?.rejectedSections || [];
        if (rejectedSections.length > 0) {
          console.warn('[PromptService] Some sections were rejected:', rejectedSections.join(', '));
          const reasons = Object.entries(this.currentAnalysis.analysisSummary?.rejectionReasons || {})
            .map(([section, reason]) => `${section}: ${reason}`)
            .join('; ');
          this.eventService.setError(`Some sections were not included: ${reasons}`);
        } else {
          this.eventService.setError(null);
        }
        
        this.eventService.setRejectedSections(rejectedSections);
        this.eventService.setLoading(false);
        
        // Clear the state after sections are complete
        this.currentAnalysis = null;
        this.baseEvent = null;
        this.originalPrompt = '';
        this.currentConstraints = null;
        this.processingStage = 'base';
        
        // Clear the missing info subject since we're done
        this.currentMissingInfoSubject.next(null);
        
        // Return true to indicate we're done with clarifications
        return of(true);
      } catch (error) {
        console.error('[PromptService] Error processing section clarification:', error);
        this.eventService.setLoading(false);
        this.eventService.setError('Error processing your clarifications. Please try again.');
        
        // Reset state on error
        this.currentAnalysis = null;
        this.baseEvent = null;
        this.originalPrompt = '';
        this.currentConstraints = null;
        this.processingStage = 'base';
        this.currentMissingInfoSubject.next(null);
        
        return of(true); // Return true to close dialog even on error
      }
    }
  
    console.log('[PromptService] Clarification processing completed');
    return of(true); // Default return to ensure we always return something
  }
}