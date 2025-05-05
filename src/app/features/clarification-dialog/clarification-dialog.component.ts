import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarificationQuestion } from '../../core/models/event.model';

@Component({
  selector: 'app-clarification-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clarification-dialog.component.html',
  styleUrl: './clarification-dialog.component.css'
})
export class ClarificationDialogComponent implements OnInit, OnChanges {
  @Input() show = false;
  @Input() questions: ClarificationQuestion[] = [];
  @Output() submitAnswers = new EventEmitter<Record<string, string>>();
  @Output() cancelRequest = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();
  
  answers: Record<string, string> = {};
  formValid = false;
  isSubmitting = false;
  currentStep: 'base' | 'sections' = 'base';
  
  constructor() {
    console.log('[ClarificationDialogComponent] Component instantiated');
  }
  
  ngOnInit(): void {
    console.log('[ClarificationDialogComponent] Component initialized');
    this.resetForm();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('[ClarificationDialogComponent] Input changes detected:', changes);
    
    // Reset form when questions change
    if (changes['questions'] && changes['questions'].currentValue) {
      console.log('[ClarificationDialogComponent] Questions changed, resetting form');
      this.resetForm();
    }
    
    // Log visibility changes
    if (changes['show']) {
      console.log('[ClarificationDialogComponent] Dialog visibility changed to:', this.show);
    }
  }
  
  private resetForm(): void {
    // Initialize answers object
    this.answers = {};
    this.questions.forEach(q => {
      this.answers[q.field] = '';
    });
    this.validateForm();
    console.log('[ClarificationDialogComponent] Form reset with fields:', Object.keys(this.answers));
  }
  
  validateForm(): void {
    this.formValid = this.questions.length > 0 && 
                     Object.entries(this.answers)
                          .filter(([field]) => this.questions.some(q => q.field === field))
                          .every(([_, value]) => value.trim() !== '');
    console.log('[ClarificationDialogComponent] Form validation result:', this.formValid);
  }
  
  onInputChange(): void {
    this.validateForm();
  }
  
  onSubmit(): void {
    if (this.formValid) {
      console.log('[ClarificationDialogComponent] Submitting answers:', this.answers);
      this.isSubmitting = true;
      
      // Only emit the relevant answers (those for the current questions)
      const relevantAnswers = {} as Record<string, string>;
      this.questions.forEach(q => {
        relevantAnswers[q.field] = this.answers[q.field];
      });
      
      this.submitAnswers.emit(relevantAnswers);
      
      // Reset submitting state after a timeout
      // This ensures the UI stays responsive even if parent component doesn't respond
      setTimeout(() => {
        this.isSubmitting = false;
      }, 5000);
    }
  }
  
  onCancel(): void {
    console.log('[ClarificationDialogComponent] User cancelled clarification');
    this.cancelRequest.emit();
  }
}