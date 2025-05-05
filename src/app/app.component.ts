import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import { PromptInputComponent } from './features/prompt-input/prompt-input.component';
import { EventPreviewComponent } from './features/event-preview/event-preview.component';
import { ModelSelectorComponent } from './features/model-selector/model-selector.component';
import { ClarificationDialogComponent } from './features/clarification-dialog/clarification-dialog.component';

import { ConstraintService } from './core/services/constraint.service';
import { PromptService } from './core/services/prompt.service';
import { LlmService } from './core/services/llm.service';
import { ClarificationQuestion } from './core/models/event.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    PromptInputComponent,
    EventPreviewComponent,
    ModelSelectorComponent,
    ClarificationDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'EventCombo AI';
  showClarificationDialog = false;
  clarificationQuestions: ClarificationQuestion[] = [];
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private constraintService: ConstraintService,
    private promptService: PromptService,
    private llmService: LlmService
  ) {}
  
  ngOnInit(): void {
    console.log('[AppComponent] Initializing...');
    
    // Initialize constraint service
    this.subscriptions.push(
      this.constraintService.initialize().subscribe(success => {
        console.log('[AppComponent] Constraints initialized:', success);
        if (!success) {
          console.error('[AppComponent] Failed to initialize constraints');
        }
      })
    );
    
    // Subscribe to missing info changes from the PromptService
    this.subscriptions.push(
      this.promptService.currentMissingInfo$.subscribe(missingInfo => {
        console.log('[AppComponent] Received missing info update:', missingInfo);
        if (missingInfo && missingInfo.length > 0) {
          console.log('[AppComponent] Opening clarification dialog with questions:', missingInfo);
          this.clarificationQuestions = missingInfo;
          this.showClarificationDialog = true;
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    console.log('[AppComponent] Component destroyed, subscriptions cleared');
  }
  
  onClarificationNeeded(questions: ClarificationQuestion[]): void {
    console.log('[AppComponent] Clarification needed event received with questions:', questions);
    this.clarificationQuestions = questions;
    this.showClarificationDialog = true;
  }
  
  onClarificationSubmit(answers: Record<string, string>): void {
    console.log('[AppComponent] Processing clarification answers:', answers);
    
    // Process the clarification answers
    this.promptService.processClarification(answers).subscribe({
      next: isComplete => {
        console.log('[AppComponent] Clarification process complete status:', isComplete);
        if (isComplete) {
          // Process is complete, close dialog
          console.log('[AppComponent] Clarification process complete, closing dialog');
          this.showClarificationDialog = false;
          this.clarificationQuestions = [];
        } else {
          console.log('[AppComponent] Clarification process not complete, waiting for more questions');
          // If not complete, the service will emit new questions via currentMissingInfo$
          // which we're already subscribed to above
        }
      },
      error: error => {
        console.error('[AppComponent] Error processing clarification:', error);
        // Show error and close dialog to prevent user from being stuck
        this.showClarificationDialog = false;
        this.clarificationQuestions = [];
      },
      complete: () => {
        console.log('[AppComponent] Clarification request completed');
      }
    });
  }
  
  onClarificationCancel(): void {
    console.log('[AppComponent] Clarification cancelled by user');
    this.showClarificationDialog = false;
    this.clarificationQuestions = [];
  }
  
  onClarificationCompleted(): void {
    console.log('[AppComponent] Clarification completed');
    this.showClarificationDialog = false;
    this.clarificationQuestions = [];
  }
}