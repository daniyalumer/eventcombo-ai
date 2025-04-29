import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../core/services/prompt.service';
import { EventService } from '../../core/services/event.service';
import { ClarificationQuestion } from '../../core/models/event.model';

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prompt-input.component.html',
  styleUrl: './prompt-input.component.css'
})
export class PromptInputComponent implements OnInit {
  @Output() clarificationNeeded = new EventEmitter<ClarificationQuestion[]>();
  
  userPrompt = '';
  isProcessing = false;
  isSuccess = false;
  errorMessage = '';
  examples: string[] = [
    'Make a virtual event for tech founders with 3 speakers.',
    'Create an event about AI, include agenda, registration, and speakers.',
    'Build an educational workshop with agenda, registration, and FAQ sections.'
  ];

  constructor(
    private promptService: PromptService,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.eventService.getLoading().subscribe(isLoading => {
      this.isProcessing = isLoading;
    });

    this.eventService.getError().subscribe(error => {
      this.errorMessage = error || '';
    });
  }

  useExample(example: string): void {
    this.userPrompt = example;
  }

  submitPrompt(): void {
    if (!this.userPrompt || this.isProcessing) {
      return;
    }
    
    // Reset messages
    this.resetState();
    
    this.promptService.processPrompt(this.userPrompt).subscribe({
      next: result => {
        if (result.missingInfo && result.missingInfo.length > 0) {
          // Emit event to show clarification dialog
          this.clarificationNeeded.emit(result.missingInfo);
        } else if (result.success) {
          // Show success message
          this.isSuccess = true;
          setTimeout(() => {
            this.isSuccess = false;
          }, 3000);
        }
      },
      error: error => {
        console.error('Error submitting prompt:', error);
        this.errorMessage = 'Something went wrong. Please try again.';
      }
    });
  }

  clearPrompt(): void {
    this.userPrompt = '';
    this.resetState();
  }

  private resetState(): void {
    this.isSuccess = false;
    this.errorMessage = '';
  }
}