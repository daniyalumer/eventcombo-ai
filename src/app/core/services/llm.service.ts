import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  id: string;
  model: string;
  created: number;
  object: string;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey = environment.groqApiKey;

  constructor(private http: HttpClient) {}

  generateEventFromPrompt(prompt: string, constraints: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    const payload = {
      model: 'llama3-70b-8192', // Llama 3.3 70B model on Groq
      messages: [
        {
          role: 'system',
          content: this.createSystemPrompt(constraints)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    };

    return this.http.post<GroqResponse>(this.apiUrl, payload, { headers }).pipe(
      map(response => this.parseResponse(response)),
      catchError(error => {
        console.error('LLM API error:', error);
        return of({
          success: false,
          error: 'Failed to generate event content'
        });
      })
    );
  }

  private createSystemPrompt(constraints: any): string {
    const allowedSections = constraints.allowedSections.join(', ');
    const bannedWords = constraints.bannedWords.join(', ');
    const bannedKeywords = constraints.bannedKeywords.join(', ');
    const requiredFields = constraints.requiredFields.join(', ');

    return `
You are an AI assistant specialized in creating structured event data from user descriptions.
Your task is to convert natural language event descriptions into structured data.

RESPONSE FORMAT:
You must respond with a valid JSON object containing:
{
  "event": {
    "name": "Short event name",
    "title": "Full event title",
    "description": "Detailed event description",
    "startDate": "ISO date string",
    "endDate": "ISO date string",
    "location": "Event location if specified",
    "organizer": "Event organizer if specified",
    "sections": [
      {
        "type": "section_type",
        "title": "Section title",
        "content": {
          // Content varies by section type
        }
      }
    ]
  },
  "analysisSummary": {
    "requestedSections": ["list", "of", "sections", "user", "requested"],
    "rejectedSections": ["list", "of", "sections", "that", "were", "rejected"],
    "missingInformation": [
      {"field": "field_name", "question": "Question to ask user"}
    ]
  }
}

CONSTRAINTS:
- Only include sections among: ${allowedSections}
- Reject sections related to: ${bannedKeywords}
- Banned words: ${bannedWords}
- Required fields: ${requiredFields}
- If any required fields can't be determined, include them in missingInformation

The user will now describe an event they want to create. Extract all relevant information and follow the format above.
`;
  }

  private parseResponse(response: GroqResponse): any {
    try {
      const content = response.choices[0].message.content;
      
      // Extract JSON object from response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      // If we can't extract JSON, try to parse the whole content
      try {
        return JSON.parse(content);
      } catch {
        return {
          success: false,
          error: 'Failed to parse LLM response'
        };
      }
    } catch (e) {
      console.error('Response parsing error:', e);
      return {
        success: false,
        error: 'Invalid response format'
      };
    }
  }
}