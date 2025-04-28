import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prompt-input.component.html',
  styleUrl: './prompt-input.component.css'
})
export class PromptInputComponent implements OnInit {
  userPrompt = '';
  isProcessing = false;
  examples: string[] = [
    'Make a virtual event for tech founders with 3 speakers.',
    'Create an event about AI, include agenda, registration, and speakers.',
    'Build an educational workshop with agenda, registration, and FAQ sections.'
  ];

  ngOnInit(): void {
    // Initialize component if needed
    console.log('Prompt input component initialized');
  }

  useExample(example: string): void {
    this.userPrompt = example;
  }

  submitPrompt(): void {
    if (!this.userPrompt) {
      return;
    }
    
    // Set processing state
    this.isProcessing = true;
    
    // This is where we'll call the prompt service in the future
    console.log('Processing prompt:', this.userPrompt);
    
    // Simulate processing delay
    setTimeout(() => {
      this.isProcessing = false;
    }, 1500);
  }

  clearPrompt(): void {
    this.userPrompt = '';
  }
}