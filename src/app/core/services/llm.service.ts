import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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

  constructor(private http: HttpClient) {
    console.log('[LlmService] Service instantiated');
    console.log('[LlmService] Using Groq API endpoint:', this.apiUrl);
    if (!this.apiKey) {
      console.warn('[LlmService] API key not found in environment variables');
    } else {
      console.log('[LlmService] API key loaded successfully from environment');
    }
  }

  generateEventFromPrompt(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Generating event from prompt:', prompt.substring(0, 50) + '...');
    console.log('[LlmService] Using constraints:', {
      allowedSectionsCount: constraints.allowedSections.length,
      bannedWordsCount: constraints.bannedWords.length,
      bannedKeywordsCount: constraints.bannedKeywords.length,
      requiredFields: constraints.requiredFields
    });

    if (!this.apiKey) {
      console.error('[LlmService] Missing API key - cannot make API call');
      return of({
        success: false,
        error: 'API key is not configured'
      });
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    const systemPrompt = this.createSystemPrompt(constraints);
    console.log('[LlmService] Created system prompt:', systemPrompt.substring(0, 100) + '...');

    const payload = {
      model: 'llama3-70b-8192', // Llama 3.3 70B model on Groq
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    };

    console.log('[LlmService] Making API request with model:', payload.model);
    console.log('[LlmService] Temperature:', payload.temperature);
    console.log('[LlmService] Max tokens:', payload.max_tokens);

    return this.http.post<GroqResponse>(this.apiUrl, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Groq API');
        console.log('[LlmService] Response ID:', response.id);
        console.log('[LlmService] Model used:', response.model);
        console.log('[LlmService] Finish reason:', response.choices[0].finish_reason);
        console.log('[LlmService] Response content length:', response.choices[0].message.content.length);
        console.log('[LlmService] Response preview:', response.choices[0].message.content.substring(0, 100) + '...');
      }),
      map(response => {
        console.log('[LlmService] Parsing response...');
        return this.parseResponse(response);
      }),
      tap(parsedResponse => {
        if (parsedResponse.success === false) {
          console.error('[LlmService] Failed to process response:', parsedResponse.error);
        } else if (parsedResponse.event) {
          console.log('[LlmService] Successfully processed event:', parsedResponse.event.name);
          console.log('[LlmService] Event has', parsedResponse.event.sections?.length || 0, 'sections');
          
          if (parsedResponse.analysisSummary?.rejectedSections?.length > 0) {
            console.warn('[LlmService] Rejected sections:', parsedResponse.analysisSummary.rejectedSections.join(', '));
          }
          
          if (parsedResponse.analysisSummary?.missingInformation?.length > 0) {
            console.warn('[LlmService] Missing information:', parsedResponse.analysisSummary.missingInformation.map((item: any) => item.field).join(', '));
          }
        }
      }),
      catchError(error => {
        console.error('[LlmService] API request failed:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate event content: ' + (error.message || 'Unknown error')
        });
      })
    );
  }

  private createSystemPrompt(constraints: any): string {
    console.log('[LlmService] Creating system prompt with constraints');
    
    const allowedSections = constraints.allowedSections.join(', ');
    console.log('[LlmService] Allowed sections:', allowedSections);
    
    const bannedWords = constraints.bannedWords.join(', ');
    console.log('[LlmService] Banned words:', bannedWords);
    
    const bannedKeywords = constraints.bannedKeywords.join(', ');
    console.log('[LlmService] Banned keywords:', bannedKeywords);
    
    const requiredFields = constraints.requiredFields.join(', ');
    console.log('[LlmService] Required fields:', requiredFields);

    const prompt = `
You are an AI assistant specialized in generating structured data for public events based on user input. 
Your task is to extract valid event data and return it in a strict JSON format.

IMPORTANT:
You must NOT fabricate or hallucinate missing values for key event information such as dates, organizer, or location. Instead, when these are not present in the input, explicitly list them in the *missingInformation* field along with a natural-language question to ask the user.

RESPONSE FORMAT:
You must return a valid JSON object like this:
{
  "event": {
    "name": "Short event name",
    "title": "Full event title",
    "description": "Detailed event description",
    "startDate": "ISO date string (e.g. 2025-07-15T09:00:00Z)",
    "endDate": "ISO date string (e.g. 2025-07-15T17:00:00Z)",
    "location": "Event location (physical or virtual)",
    "organizer": "Organizer name or organization",
    "sections": [
      {
        "type": "section_type",
        "title": "Title of this section",
        "content": {
          // Varies by section type
        }
      }
    ]
  },
  "analysisSummary": {
    "requestedSections": ["list", "of", "valid", "sections", "user", "mentioned"],
    "rejectedSections": ["sections", "rejected", "due", "to", "policy"],
    "missingInformation": [
      {
        "field": "field_name",
        "question": "Ask a natural language question to obtain this field"
      }
    ]
  }
}

CONSTRAINTS:
- Only use section types from this list: ${allowedSections}
- Reject any section or content containing or related to these **banned keywords**: ${bannedKeywords}
- Do not allow output to include these **banned words**: ${bannedWords}
- Required fields: ${requiredFields}
- If the user input does not mention it explicitly is about an event, assume it is an event and ask the necessary clarifying questions in *missingInformation*.

BEGIN:
The user will now describe a public event. Parse their input and return structured, filtered, and validated event data.
`;
    
    console.log('[LlmService] System prompt created, length:', prompt.length);
    return prompt;
  }

  private parseResponse(response: GroqResponse): any {
    console.log('[LlmService] Parsing LLM response...');
    
    try {
      const content = response.choices[0].message.content;
      console.log('[LlmService] Extracting JSON from response');
      
      // Extract JSON object from response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        console.log('[LlmService] JSON pattern found in response');
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log('[LlmService] Extracted JSON string, length:', jsonStr.length);
        
        try {
          const parsedJson = JSON.parse(jsonStr);
          console.log('[LlmService] Successfully parsed JSON response');
          return parsedJson;
        } catch (parseError) {
          console.error('[LlmService] Failed to parse extracted JSON:', parseError);
          console.log('[LlmService] JSON string sample:', jsonStr.substring(0, 100) + '...');
          throw parseError;
        }
      } else {
        console.warn('[LlmService] No JSON pattern found, trying to parse full content');
      }
      
      // If we can't extract JSON, try to parse the whole content
      try {
        const parsedJson = JSON.parse(content);
        console.log('[LlmService] Successfully parsed full content as JSON');
        return parsedJson;
      } catch (parseError) {
        console.error('[LlmService] Failed to parse full content as JSON:', parseError);
        console.log('[LlmService] Content sample:', content.substring(0, 100) + '...');
        
        return {
          success: false,
          error: 'Failed to parse LLM response'
        };
      }
    } catch (e) {
      console.error('[LlmService] Response parsing error:', e);
      return {
        success: false,
        error: 'Invalid response format'
      };
    }
  }
}