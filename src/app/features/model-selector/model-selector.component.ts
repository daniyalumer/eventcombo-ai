import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LlmService, ModelType } from '../../core/services/llm.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-model-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-selector.component.html',
  styleUrl: './model-selector.component.css'
})
export class ModelSelectorComponent implements OnInit, OnDestroy {
  currentModel: ModelType = 'groq';
  private modelSubscription: Subscription | null = null;

  constructor(private llmService: LlmService) {}

  ngOnInit(): void {
    // Initialize with current model
    this.currentModel = this.llmService.getCurrentModel();
    
    // Subscribe to model changes
    this.modelSubscription = this.llmService.currentModel$.subscribe(model => {
      this.currentModel = model;
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.modelSubscription) {
      this.modelSubscription.unsubscribe();
    }
  }

  switchModel(model: ModelType): void {
    this.llmService.setModel(model);
  }
  
  // Helper method to determine if an API key is missing
  hasApiKey(model: ModelType): boolean {
    // This could be expanded to check with the service directly
    // For now, we'll assume keys are present
    return true;
  }
}