import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ClarificationQuestion {
  field: string;
  question: string;
}

export type ClarificationAnswers = Record<string, string>;

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
  
  ngOnInit(): void {
    // Initialize answers object
    this.questions.forEach(q => {
      this.answers[q.field] = '';
    });
  }
  
  onSubmit(): void {
    this.submitAnswers.emit(this.answers);
  }
  
  onCancel(): void {
    this.cancelRequest.emit();
  }
}