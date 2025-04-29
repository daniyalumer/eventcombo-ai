import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PromptInputComponent } from './features/prompt-input/prompt-input.component';
import { EventPreviewComponent } from './features/event-preview/event-preview.component';
import { ClarificationDialogComponent } from './features/clarification-dialog/clarification-dialog.component';
import { ConstraintService } from './core/services/constraint.service';
import { PromptService } from './core/services/prompt.service';
import { ClarificationQuestion, ClarificationAnswers } from './core/models/event.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    PromptInputComponent,
    EventPreviewComponent,
    ClarificationDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'EventCombo AI Event Creator';
  showClarificationDialog = false;
  clarificationQuestions: ClarificationQuestion[] = [];
  
  constructor(
    private constraintService: ConstraintService,
    private promptService: PromptService
  ) {}
  
  ngOnInit(): void {
    // Initialize constraint service
    this.constraintService.initialize().subscribe(success => {
      console.log('Application initialized');
      if (!success) {
        console.error('Failed to initialize constraints');
      }
    });
  }
  
  onClarificationNeeded(questions: ClarificationQuestion[]): void {
    this.clarificationQuestions = questions;
    this.showClarificationDialog = true;
  }
  
  onClarificationSubmit(answers: ClarificationAnswers): void {
    this.showClarificationDialog = false;
    
    // Process the clarification answers
    this.promptService.processClarification(answers).subscribe({
      next: success => {
        if (!success) {
          console.error('Failed to process clarification answers');
        }
      },
      error: error => {
        console.error('Error processing clarification:', error);
      }
    });
  }
  
  onClarificationCancel(): void {
    this.showClarificationDialog = false;
  }
}