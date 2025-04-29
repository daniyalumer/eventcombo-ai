import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarificationQuestion, ClarificationAnswers } from '../../core/models/event.model';

@Component({
  selector: 'app-clarification-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clarification-dialog.component.html',
  styleUrl: './clarification-dialog.component.css'
})
export class ClarificationDialogComponent implements OnInit {
  @Input() show = false;
  @Input() questions: ClarificationQuestion[] = [];
  @Output() submitAnswers = new EventEmitter<ClarificationAnswers>();
  @Output() cancelRequest = new EventEmitter<void>();
  
  answers: Record<string, string> = {};
  formValid = false;
  
  ngOnInit(): void {
    // Initialize answers object
    this.questions.forEach(q => {
      this.answers[q.field] = '';
    });
    this.validateForm();
  }
  
  validateForm(): void {
    this.formValid = Object.values(this.answers).every(value => value.trim() !== '');
  }
  
  onInputChange(): void {
    this.validateForm();
  }
  
  onSubmit(): void {
    if (this.formValid) {
      this.submitAnswers.emit(this.answers);
    }
  }
  
  onCancel(): void {
    this.cancelRequest.emit();
  }
}