import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventSectionComponent, SpeakersContent, AgendaContent, TextContent } from '../event-section/event-section.component';

@Component({
  selector: 'app-event-preview',
  standalone: true,
  imports: [CommonModule, EventSectionComponent],
  templateUrl: './event-preview.component.html',
  styleUrl: './event-preview.component.css'
})
export class EventPreviewComponent implements OnInit {
  hasEvent = false;
  mockEvent = {
    name: 'Tech Startup Conference',
    title: 'Annual Tech Startup Conference 2025',
    description: 'Join us for a full day of insights, networking, and learning with top tech founders.',
    startDate: '2025-06-15T09:00:00',
    endDate: '2025-06-15T17:00:00',
    location: 'Virtual Event',
    organizer: 'Tech Founders Association',
    sections: [
      {
        type: 'speakers',
        title: 'Featured Speakers',
        content: {
          speakers: [
            {
              name: 'Jane Smith',
              role: 'CEO, TechStart Inc.',
              bio: 'Jane is a serial entrepreneur with over 15 years of experience in the tech industry.'
            },
            {
              name: 'John Doe',
              role: 'CTO, Innovation Labs',
              bio: 'John specializes in AI and has led development teams at major tech companies.'
            }
          ]
        } as SpeakersContent
      },
      {
        type: 'agenda',
        title: 'Event Schedule',
        content: {
          items: [
            {
              time: '9:00 AM',
              title: 'Registration',
              description: 'Welcome and check-in'
            },
            {
              time: '10:00 AM',
              title: 'Keynote',
              description: 'Future of Tech Startups',
              speaker: 'Jane Smith'
            }
          ]
        } as AgendaContent
      },
      {
        type: 'registration',
        title: 'Register Now',
        content: {
          text: 'Secure your spot at this exclusive event. Limited seats available!'
        } as TextContent
      }
    ]
  };
  rejectedSections: string[] = [];

  ngOnInit(): void {
    // For demo purposes, show the mock event after a short delay
    setTimeout(() => {
      this.hasEvent = true;
    }, 1000);
  }
}