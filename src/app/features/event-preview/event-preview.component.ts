import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EventSectionComponent } from '../event-section/event-section.component';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';

@Component({
  selector: 'app-event-preview',
  standalone: true,
  imports: [CommonModule, EventSectionComponent],
  templateUrl: './event-preview.component.html',
  styleUrl: './event-preview.component.css'
})
export class EventPreviewComponent implements OnInit, OnDestroy {
  event: Event | null = null;
  rejectedSections: string[] = [];
  hasEvent = false;
  isLoading = false;
  
  private eventSubscription: Subscription | null = null;
  private rejectedSectionsSubscription: Subscription | null = null;
  private loadingSubscription: Subscription | null = null;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.eventSubscription = this.eventService.getEvent().subscribe(event => {
      this.event = event;
      this.hasEvent = !!event;
    });
    
    this.rejectedSectionsSubscription = this.eventService.getRejectedSections().subscribe(sections => {
      this.rejectedSections = sections;
    });

    this.loadingSubscription = this.eventService.getLoading().subscribe(isLoading => {
      this.isLoading = isLoading;
    });
  }
  
  ngOnDestroy(): void {
    this.eventSubscription?.unsubscribe();
    this.rejectedSectionsSubscription?.unsubscribe();
    this.loadingSubscription?.unsubscribe();
  }
}