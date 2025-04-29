import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
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

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
}

export type ModelType = 'groq' | 'gemini';

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  
  private groqApiKey = environment.groqApiKey;
  private geminiApiKey = environment.geminiApiKey;
  
  // Create a behavior subject to track and allow subscribing to the current model
  private currentModelSubject = new BehaviorSubject<ModelType>('groq');
  
  // Public observable for components to subscribe to model changes
  public currentModel$ = this.currentModelSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('[LlmService] Service instantiated');
    console.log('[LlmService] Default model set to:', this.getCurrentModel());
    
    this.checkApiKeys();
  }
  
  private checkApiKeys(): void {
    const currentModel = this.getCurrentModel();
    if (currentModel === 'gemini' && !this.geminiApiKey) {
      console.warn('[LlmService] Gemini API key not found in environment variables');
    } else if (currentModel === 'groq' && !this.groqApiKey) {
      console.warn('[LlmService] Groq API key not found in environment variables');
    } else {
      console.log('[LlmService] API key loaded successfully for', currentModel);
    }
  }
  
  // Get the current model
  getCurrentModel(): ModelType {
    return this.currentModelSubject.value;
  }
  
  // Set the current model
  setModel(model: ModelType): void {
    console.log('[LlmService] Switching model from', this.getCurrentModel(), 'to', model);
    this.currentModelSubject.next(model);
    this.checkApiKeys();
  }

  generateEventFromPrompt(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Generating event from prompt:', prompt.substring(0, 50) + '...');
    console.log('[LlmService] Using model:', this.getCurrentModel());
    console.log('[LlmService] Using constraints:', {
      allowedSectionsCount: constraints.allowedSections.length,
      bannedWordsCount: constraints.bannedWords.length,
      bannedKeywordsCount: constraints.bannedKeywords.length,
      requiredFields: constraints.requiredFields
    });

    // Choose API based on selected model
    if (this.getCurrentModel() === 'gemini') {
      return this.generateWithGemini(prompt, constraints);
    } else {
      return this.generateWithGroq(prompt, constraints);
    }
  }
  
  private generateWithGemini(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Gemini API');
    
    if (!this.geminiApiKey) {
      console.error('[LlmService] Missing Gemini API key - cannot make API call');
      return of({
        success: false,
        error: 'Gemini API key is not configured'
      });
    }
    
    const systemPrompt = this.createSystemPrompt(constraints);
    
    // Gemini API URL with key appended
    const apiUrlWithKey = `${this.geminiApiUrl}?key=${this.geminiApiKey}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Format payload for Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt + "\n\nUser's event request: " + prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
        topP: 0.95,
        topK: 40
      }
    };
    
    console.log('[LlmService] Making Gemini API request');
    console.log('[LlmService] Temperature:', payload.generationConfig.temperature);
    console.log('[LlmService] Max tokens:', payload.generationConfig.maxOutputTokens);
    
    return this.http.post<GeminiResponse>(apiUrlWithKey, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Gemini API');
        if (response.candidates && response.candidates.length > 0) {
          console.log('[LlmService] Finish reason:', response.candidates[0].finishReason);
          const responseText = response.candidates[0].content.parts[0].text;
          console.log('[LlmService] Response content length:', responseText.length);
          console.log('[LlmService] Response preview:', responseText.substring(0, 100) + '...');
        }
      }),
      map(response => {
        console.log('[LlmService] Parsing Gemini response...');
        return this.parseGeminiResponse(response);
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
        console.error('[LlmService] Gemini API request failed:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate event content with Gemini: ' + (error.message || 'Unknown error')
        });
      })
    );
  }
  
  private generateWithGroq(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Groq API');
    
    if (!this.groqApiKey) {
      console.error('[LlmService] Missing Groq API key - cannot make API call');
      return of({
        success: false,
        error: 'Groq API key is not configured'
      });
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.groqApiKey}`
    });

    const systemPrompt = this.createSystemPrompt(constraints);

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

    console.log('[LlmService] Making Groq API request with model:', payload.model);
    console.log('[LlmService] Temperature:', payload.temperature);
    console.log('[LlmService] Max tokens:', payload.max_tokens);
    
    return this.http.post<GroqResponse>(this.groqApiUrl, payload, { headers }).pipe(
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
        return this.parseGroqResponse(response);
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
        console.error('[LlmService] Groq API request failed:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate event content with Groq: ' + (error.message || 'Unknown error')
        });
      })
    );
  }

  private createSystemPrompt(constraints: any): string {
    const allowedSections = constraints.allowedSections.join(', ');
    const bannedKeywords = constraints.bannedKeywords.join(', ');
    const bannedWords = constraints.bannedWords.join(', ');
    const requiredFields = constraints.requiredFields.join(', ');
    
    const sectionTemplates = `
    SECTION TYPE TEMPLATES:
    - For "speakers" sections:
      "content": {
        "speakers": [
          {
            "name": "Speaker Name",
            "role": "Speaker Role",
            "bio": "Speaker biography"
          }
        ]
      }
    
    - For "agenda" sections:
      "content": {
        "items": [
          {
            "time": "Time slot (e.g., '09:00 AM - 10:30 AM')",
            "title": "Agenda item title",
            "description": "Description of the agenda item",
            "speaker": "Speaker for this item (optional)"
          }
        ]
      }
    
    - For "description" sections:
      "content": {
        "text": "Detailed text description"
      }
    
    - For "registration" sections:
      "content": {
        "text": "Registration information",
        "buttonText": "Register Now",
        "fields": [
          {
            "name": "Field name (e.g., 'Full Name')",
            "required": true or false,
            "type": "Field type (e.g., 'text', 'email')"
          }
        ]
      }
    
    - For "location" sections:
      "content": {
        "address": "Street address",
        "city": "City name",
        "state": "State/Province",
        "zipCode": "Postal code",
        "isVirtual": true or false,
        "virtualLink": "URL for virtual events",
        "text": "Additional location details"
      }
    
    - For "faq" sections:
      "content": {
        "items": [
          {
            "question": "FAQ question",
            "answer": "Answer to the question"
          }
        ]
      }
    
    - For "contact" sections:
      "content": {
        "email": "Contact email",
        "phone": "Contact phone",
        "socialMedia": [
          {
            "platform": "Platform name (e.g., 'Twitter')",
            "handle": "Social media handle"
          }
        ],
        "text": "Additional contact information"
      }
    
    - For "sponsors" sections:
      "content": {
        "sponsors": [
          {
            "name": "Sponsor name",
            "level": "Sponsorship level (e.g., 'Gold')",
            "description": "Description of the sponsor"
          }
        ]
      }
    `;
    
    const dateFormatInstructions = `
    CRITICAL DATE FORMATTING:
    - Always convert date strings like "May 1st, 2025" to ISO format "2025-05-01T00:00:00Z"
    - For time-only mentions like "9am to 5pm", combine with the event date
    - If only a date is provided without time, use 00:00:00 for start time and 23:59:59 for end time
    
    Examples of correct date/time parsing:
    - "1st May 2025" → "2025-05-01T00:00:00Z"
    - "May 1-3, 2025" → startDate: "2025-05-01T00:00:00Z", endDate: "2025-05-03T23:59:59Z"
    - "9am to 5pm on June 15" → "2025-06-15T09:00:00Z" to "2025-06-15T17:00:00Z"
    `;
    
    const prompt = `
    You are an AI assistant specialized in generating structured data for public events based on user input.
    Your task is to extract valid event data and return it in a strict JSON format.
    
    IMPORTANT:
    You must NOT fabricate or hallucinate missing values for key event information such as dates, organizer, or location. Instead, when these are not present in the input, explicitly list them in the *missingInformation* field along with a natural-language question to ask the user.
    
    ${sectionTemplates}
    
    ${dateFormatInstructions}
    
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
              // Varies by section type, see templates above
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
    - Always format dates in ISO format (e.g., 2025-07-15T09:00:00Z)
    
    BEGIN:
    The user will now describe a public event. Parse their input and return structured, filtered, and validated event data in strict JSON format.
    `;
    
    return prompt;
  }

  private parseGroqResponse(response: GroqResponse): any {
    console.log('[LlmService] Parsing Groq LLM response...');
    
    try {
      const content = response.choices[0].message.content;
      console.log('[LlmService] Extracting JSON from LLM response');
      
      // Some LLMs wrap JSON in code blocks, so try to extract it
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        console.log('[LlmService] JSON pattern found in LLM response');
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        
        try {
          const parsedJson = JSON.parse(jsonStr);
          console.log('[LlmService] Successfully parsed JSON response');
          return parsedJson;
        } catch (parseError) {
          console.error('[LlmService] Failed to parse extracted JSON:', parseError);
          throw parseError;
        }
      } else {
        console.warn('[LlmService] No JSON pattern found in LLM response');
      }
      
      // Try to parse the whole content as JSON
      try {
        const parsedJson = JSON.parse(content);
        console.log('[LlmService] Successfully parsed content as JSON');
        return parsedJson;
      } catch (parseError) {
        console.error('[LlmService] Failed to parse content as JSON:', parseError);
        
        return {
          success: false,
          error: 'LLM response did not contain valid JSON'
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
  
  private parseGeminiResponse(response: GeminiResponse): any {
    console.log('[LlmService] Parsing Gemini LLM response...');
    
    try {
      if (!response.candidates || response.candidates.length === 0) {
        console.error('[LlmService] Empty Gemini response');
        return {
          success: false,
          error: 'Empty response from Gemini'
        };
      }
      
      const content = response.candidates[0].content.parts[0].text;
      console.log('[LlmService] Extracting JSON from Gemini response');
      
      // Extract JSON object from response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        console.log('[LlmService] JSON pattern found in Gemini response');
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log('[LlmService] Extracted JSON string, length:', jsonStr.length);
        
        try {
          const parsedJson = JSON.parse(jsonStr);
          console.log('[LlmService] Successfully parsed JSON response from Gemini');
          return parsedJson;
        } catch (parseError) {
          console.error('[LlmService] Failed to parse extracted JSON from Gemini:', parseError);
          console.log('[LlmService] JSON string sample:', jsonStr.substring(0, 100) + '...');
          throw parseError;
        }
      } else {
        console.warn('[LlmService] No JSON pattern found in Gemini response, trying to parse full content');
      }
      
      // If we can't extract JSON, try to parse the whole content
      try {
        const parsedJson = JSON.parse(content);
        console.log('[LlmService] Successfully parsed full Gemini content as JSON');
        return parsedJson;
      } catch (parseError) {
        console.error('[LlmService] Failed to parse full Gemini content as JSON:', parseError);
        console.log('[LlmService] Content sample:', content.substring(0, 100) + '...');
        
        return {
          success: false,
          error: 'Failed to parse Gemini response'
        };
      }
    } catch (e) {
      console.error('[LlmService] Gemini response parsing error:', e);
      return {
        success: false,
        error: 'Invalid Gemini response format'
      };
    }
  }
}