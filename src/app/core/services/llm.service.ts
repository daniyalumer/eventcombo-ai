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

  // Legacy method - keeping for backward compatibility
  generateEventFromPrompt(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Legacy generateEventFromPrompt called - using two-step process instead');
    return this.generateEventBaseFromPrompt(prompt, constraints);
  }

  // Step 1: Generate base event details (without sections)
  generateEventBaseFromPrompt(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Generating base event from prompt:', prompt.substring(0, 50) + '...');
    console.log('[LlmService] Using model:', this.getCurrentModel());
    console.log('[LlmService] Using constraints:', {
      requiredFields: constraints.requiredFields
    });

    // Choose API based on selected model
    if (this.getCurrentModel() === 'gemini') {
      return this.generateBaseWithGemini(prompt, constraints);
    } else {
      return this.generateBaseWithGroq(prompt, constraints);
    }
  }

  // Step 2: Generate event sections based on base event
  generateEventSectionsFromBase(baseEvent: any, prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Generating sections for base event:', baseEvent.name);
    console.log('[LlmService] Using model:', this.getCurrentModel());
    console.log('[LlmService] Using constraints:', {
      allowedSectionsCount: constraints.allowedSections.length,
      bannedWordsCount: constraints.bannedWords.length,
      bannedKeywordsCount: constraints.bannedKeywords.length
    });

    // Choose API based on selected model
    if (this.getCurrentModel() === 'gemini') {
      return this.generateSectionsWithGemini(baseEvent, prompt, constraints);
    } else {
      return this.generateSectionsWithGroq(baseEvent, prompt, constraints);
    }
  }
  
  // Base event generation with Gemini API
  private generateBaseWithGemini(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Gemini API for base event generation');
    
    if (!this.geminiApiKey) {
      console.error('[LlmService] Missing Gemini API key - cannot make API call');
      return of({
        success: false,
        error: 'Gemini API key is not configured'
      });
    }
    
    const systemPrompt = this.createBaseEventPrompt(constraints);
    
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
        maxOutputTokens: 2000,
        topP: 0.95,
        topK: 40
      }
    };
    
    console.log('[LlmService] Making Gemini API request for base event');
    console.log('[LlmService] Temperature:', payload.generationConfig.temperature);
    console.log('[LlmService] Max tokens:', payload.generationConfig.maxOutputTokens);
    
    return this.http.post<GeminiResponse>(apiUrlWithKey, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Gemini API for base event');
        if (response.candidates && response.candidates.length > 0) {
          console.log('[LlmService] Finish reason:', response.candidates[0].finishReason);
          const responseText = response.candidates[0].content.parts[0].text;
          console.log('[LlmService] Response content length:', responseText.length);
          console.log('[LlmService] Response preview:', responseText.substring(0, 100) + '...');
        }
      }),
      map(response => {
        console.log('[LlmService] Parsing Gemini response for base event...');
        return this.parseGeminiResponse(response);
      }),
      tap(parsedResponse => {
        if (parsedResponse.success === false) {
          console.error('[LlmService] Failed to process base event response:', parsedResponse.error);
        } else if (parsedResponse.event) {
          console.log('[LlmService] Successfully processed base event:', parsedResponse.event.name);
          
          if (parsedResponse.analysisSummary?.missingInformation?.length > 0) {
            console.warn('[LlmService] Missing base information:', parsedResponse.analysisSummary.missingInformation.map((item: any) => item.field).join(', '));
          }
        }
      }),
      catchError(error => {
        console.error('[LlmService] Gemini API request failed for base event:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate base event content with Gemini: ' + (error.message || 'Unknown error')
        });
      })
    );
  }
  
  // Section generation with Gemini API
  private generateSectionsWithGemini(baseEvent: any, prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Gemini API for sections generation');
    
    if (!this.geminiApiKey) {
      console.error('[LlmService] Missing Gemini API key - cannot make API call');
      return of({
        success: false,
        error: 'Gemini API key is not configured'
      });
    }
    
    const systemPrompt = this.createSectionsPrompt(constraints, baseEvent);
    
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
        maxOutputTokens: 3000,
        topP: 0.95,
        topK: 40
      }
    };
    
    console.log('[LlmService] Making Gemini API request for sections');
    console.log('[LlmService] Temperature:', payload.generationConfig.temperature);
    console.log('[LlmService] Max tokens:', payload.generationConfig.maxOutputTokens);
    
    return this.http.post<GeminiResponse>(apiUrlWithKey, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Gemini API for sections');
        if (response.candidates && response.candidates.length > 0) {
          console.log('[LlmService] Finish reason:', response.candidates[0].finishReason);
          const responseText = response.candidates[0].content.parts[0].text;
          console.log('[LlmService] Response content length:', responseText.length);
          console.log('[LlmService] Response preview:', responseText.substring(0, 100) + '...');
        }
      }),
      map(response => {
        console.log('[LlmService] Parsing Gemini response for sections...');
        return this.parseGeminiResponse(response);
      }),
      tap(parsedResponse => {
        if (parsedResponse.success === false) {
          console.error('[LlmService] Failed to process sections response:', parsedResponse.error);
        } else if (parsedResponse.sections) {
          console.log('[LlmService] Successfully processed sections, count:', parsedResponse.sections.length);
          
          if (parsedResponse.analysisSummary?.rejectedSections?.length > 0) {
            console.warn('[LlmService] Rejected sections:', parsedResponse.analysisSummary.rejectedSections.join(', '));
          }
          
          if (parsedResponse.analysisSummary?.missingInformation?.length > 0) {
            console.warn('[LlmService] Missing section information:', parsedResponse.analysisSummary.missingInformation.map((item: any) => item.field).join(', '));
          }
        }
      }),
      catchError(error => {
        console.error('[LlmService] Gemini API request failed for sections:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate sections content with Gemini: ' + (error.message || 'Unknown error')
        });
      })
    );
  }
  
  // Base event generation with Groq API
  private generateBaseWithGroq(prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Groq API for base event generation');
    
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

    const systemPrompt = this.createBaseEventPrompt(constraints);

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
      max_tokens: 2000
    };

    console.log('[LlmService] Making Groq API request for base event with model:', payload.model);
    console.log('[LlmService] Temperature:', payload.temperature);
    console.log('[LlmService] Max tokens:', payload.max_tokens);
    
    return this.http.post<GroqResponse>(this.groqApiUrl, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Groq API for base event');
        console.log('[LlmService] Response ID:', response.id);
        console.log('[LlmService] Model used:', response.model);
        console.log('[LlmService] Finish reason:', response.choices[0].finish_reason);
        console.log('[LlmService] Response content length:', response.choices[0].message.content.length);
        console.log('[LlmService] Response preview:', response.choices[0].message.content.substring(0, 100) + '...');
      }),
      map(response => {
        console.log('[LlmService] Parsing response for base event...');
        return this.parseGroqResponse(response);
      }),
      tap(parsedResponse => {
        if (parsedResponse.success === false) {
          console.error('[LlmService] Failed to process base event response:', parsedResponse.error);
        } else if (parsedResponse.event) {
          console.log('[LlmService] Successfully processed base event:', parsedResponse.event.name);
          
          if (parsedResponse.analysisSummary?.missingInformation?.length > 0) {
            console.warn('[LlmService] Missing base information:', parsedResponse.analysisSummary.missingInformation.map((item: any) => item.field).join(', '));
          }
        }
      }),
      catchError(error => {
        console.error('[LlmService] Groq API request failed for base event:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate base event content with Groq: ' + (error.message || 'Unknown error')
        });
      })
    );
  }

  // Section generation with Groq API
  private generateSectionsWithGroq(baseEvent: any, prompt: string, constraints: any): Observable<any> {
    console.log('[LlmService] Using Groq API for sections generation');
    
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

    const systemPrompt = this.createSectionsPrompt(constraints, baseEvent);

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
      max_tokens: 3000
    };

    console.log('[LlmService] Making Groq API request for sections with model:', payload.model);
    console.log('[LlmService] Temperature:', payload.temperature);
    console.log('[LlmService] Max tokens:', payload.max_tokens);
    
    return this.http.post<GroqResponse>(this.groqApiUrl, payload, { headers }).pipe(
      tap(response => {
        console.log('[LlmService] Received response from Groq API for sections');
        console.log('[LlmService] Response ID:', response.id);
        console.log('[LlmService] Model used:', response.model);
        console.log('[LlmService] Finish reason:', response.choices[0].finish_reason);
        console.log('[LlmService] Response content length:', response.choices[0].message.content.length);
        console.log('[LlmService] Response preview:', response.choices[0].message.content.substring(0, 100) + '...');
      }),
      map(response => {
        console.log('[LlmService] Parsing response for sections...');
        return this.parseGroqResponse(response);
      }),
      tap(parsedResponse => {
        if (parsedResponse.success === false) {
          console.error('[LlmService] Failed to process sections response:', parsedResponse.error);
        } else if (parsedResponse.sections) {
          console.log('[LlmService] Successfully processed sections, count:', parsedResponse.sections.length);
          
          if (parsedResponse.analysisSummary?.rejectedSections?.length > 0) {
            console.warn('[LlmService] Rejected sections:', parsedResponse.analysisSummary.rejectedSections.join(', '));
          }
          
          if (parsedResponse.analysisSummary?.missingInformation?.length > 0) {
            console.warn('[LlmService] Missing section information:', parsedResponse.analysisSummary.missingInformation.map((item: any) => item.field).join(', '));
          }
        }
      }),
      catchError(error => {
        console.error('[LlmService] Groq API request failed for sections:', error);
        
        if (error.status) {
          console.error('[LlmService] HTTP status:', error.status);
        }
        
        if (error.error) {
          console.error('[LlmService] Error details:', error.error);
        }
        
        return of({
          success: false,
          error: 'Failed to generate sections content with Groq: ' + (error.message || 'Unknown error')
        });
      })
    );
  }

  // Step 1: Prompt for base event generation
  private createBaseEventPrompt(constraints: any): string {
    const requiredFields = constraints.requiredFields.join(', ');
    
    return `
    You are an AI assistant specialized in generating structured data for public events based on user input.
    Your task is to extract ONLY the basic event information and return it in a strict JSON format.
    
    IMPORTANT:
    In this FIRST STEP, focus ONLY on extracting the basic event information WITHOUT any sections.
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
        "organizer": "Organizer name or organization"
      },
      "analysisSummary": {
        "missingInformation": [
          {
            "field": "field_name",
            "question": "Ask a natural language question to obtain this field"
          }
        ]
      }
    }
    
    CONSTRAINTS:
    - Required fields: ${requiredFields}
    - If the user input does not mention it explicitly is about an event, assume it is an event and ask the necessary clarifying questions in *missingInformation*.
    - If the user input does not mention a specific date, ask for it in *missingInformation*.
    
    CONTENT GENERATION GUIDELINES:
    - You MAY generate content for the following fields when there is enough contextual information:
      * "name": Generate a concise, relevant event name based on the overall event theme and purpose
      * "title": Generate a descriptive title that expands on the event name with more detail
      * "description": Generate a comprehensive description based on the event purpose, target audience, and other provided context
    
    CLARIFYING QUESTIONS LOGIC:
    For base event information:
    - If "name" is missing and cannot be reasonably inferred: Ask "What is the short name for this event?"
    - If "title" is missing and cannot be reasonably inferred: Ask "What would be a full title for this event?"
    - If "description" is missing and cannot be reasonably inferred: Ask "Could you provide a detailed description for this event?"
    - If "startDate" is missing: Ask "When will this event start? Please provide date and time."
    - If "endDate" is missing: Ask "When will this event end? Please provide date and time."
    - If "location" is missing: Ask "Where will this event take place? Is it virtual or in-person?"
    - If "organizer" is missing: Ask "Who is organizing this event?"
    
    BEGIN:
    The user will now describe a public event. Parse their input and return ONLY the basic event information in strict JSON format.
    `;
  }

  // Step 2: Prompt for sections generation
  private createSectionsPrompt(constraints: any, baseEvent: any): string {
    const allowedSections = constraints.allowedSections.join(', ');
    const bannedKeywords = constraints.bannedKeywords.join(', ');
    const bannedWords = constraints.bannedWords.join(', ');
    
    // Add section templates
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
    
    // Create JSON string of base event
    const baseEventJson = JSON.stringify(baseEvent, null, 2);

    return `
    You are an AI assistant specialized in generating structured data for public events based on user input.
    Your task is to extract only the SECTION information for an event and return it in a strict JSON format.
    
    IMPORTANT:
    In this SECOND STEP, I already have the basic event information, which I will provide to you. 
    You must focus ONLY on generating the SECTIONS of the event.
    
    BASE EVENT INFORMATION:
    ${baseEventJson}
    
    RESPONSE FORMAT:
    You must return a valid JSON object like this:
    {
      "sections": [
        {
          "type": "section_type",
          "title": "Title of this section",
          "content": {
            // Varies by section type, see templates below
          }
        }
      ],
      "analysisSummary": {
        "requestedSections": ["list", "of", "valid", "sections", "user", "mentioned"],
        "rejectedSections": ["sections", "rejected", "due", "to", "policy"],
        "rejectionReasons": {
          "section_name": "Reason for rejection (e.g., 'Contains banned keyword: gambling')"
        },
        "missingInformation": [
          {
            "field": "section_name.field_name",
            "question": "Ask a natural language question to obtain this field"
          }
        ]
      }
    }
    
    CONSTRAINTS:
    - Only use section types from this list: ${allowedSections}
    - Reject any section or content containing or related to these **banned keywords**: ${bannedKeywords}
    - Do not allow output to include these **banned words**: ${bannedWords}
    - If a field is not mentioned in the user request, you MAY generate reasonable content based on the base event information
    
    CONTENT GENERATION GUIDELINES:
    - For "faq" section:
      * Create 3-5 relevant questions and answers when "faq" section is requested
      * Base questions on likely attendee concerns (e.g., "What should I bring?", "Is there parking available?")
      * Ensure answers are generic enough to be broadly applicable yet specific enough to be helpful
    
    - For all generated content:
      * Ensure professional, engaging tone appropriate for event context
      * Keep descriptions focused on the apparent purpose of the event
      * Ensure content aligns with the base event information
    
    CLARIFYING QUESTIONS LOGIC:
    For "speakers" sections:
    - If speaker "name" is missing: Ask "Who will be speaking at this event? Please provide full names."
    - If speaker "role" is missing: Ask "What is the role or title of each speaker?"
    
    For "agenda" sections:
    - If agenda "items" are missing: Ask "What items would you like to include in the agenda?"
    - If agenda item "time" is missing: Ask "What are the time slots for each agenda item?"
    
    For "registration" sections:
    - If registration "fields" are missing: Ask "What fields should be included in the registration form? (e.g., name, email, etc.)"
    
    For "location" sections:
    - If location "address" is missing for physical events: Ask "What is the street address for this event?"
    
    ${sectionTemplates}
    
    BEGIN:
    Based on the above base event information and the user's original request, generate ONLY the event sections in strict JSON format.
    `;
  }

  // Legacy system prompt - keeping for reference
  private createSystemPrompt(constraints: any): string {
    const allowedSections = constraints.allowedSections.join(', ');
    const bannedKeywords = constraints.bannedKeywords.join(', ');
    const bannedWords = constraints.bannedWords.join(', ');
    const requiredFields = constraints.requiredFields.join(', ');
    
    // Add to system prompt in llm.service.ts
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

    // Add this variable to your existing prompt template
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
              // Varies by section type, see templates above
            }
          }
        ]
      },
      "analysisSummary": {
        "requestedSections": ["list", "of", "valid", "sections", "user", "mentioned"],
        "rejectedSections": ["sections", "rejected", "due", "to", "policy"],
        "rejectionReasons": {
          "section_name": "Reason for rejection (e.g., 'Contains banned keyword: gambling')"
        },
        "missingInformation": [
          {
            "field": "field_name",
            "question": "Ask a natural language question to obtain this field"
          }
        ]
      },
      "userFriendlyResponse": "A natural language explanation of what was created and any follow-up questions"
    }

    CONSTRAINTS:
    - Only use section types from this list: ${allowedSections}
    - Reject any section or content containing or related to these **banned keywords**: ${bannedKeywords}
    - Do not allow output to include these **banned words**: ${bannedWords}
    - Required fields: ${requiredFields}
    - If the user input does not mention it explicitly is about an event, assume it is an event and ask the necessary clarifying questions in *missingInformation*.
    - If the user input does not mention a specific date, ask for it in *missingInformation*.
    - Always format dates in ISO format (e.g., 2025-07-15T09:00:00Z)

    CONTENT GENERATION GUIDELINES:
    - You MAY generate content for the following fields when there is enough contextual information:
      * "name": Generate a concise, relevant event name based on the overall event theme and purpose
      * "title": Generate a descriptive title that expands on the event name with more detail
      * "description": Generate a comprehensive description based on the event purpose, target audience, and other provided context
      * "faq": Generate relevant FAQ questions and answers based on the event description, format, and purpose

    - For FAQ generation:
      * Create 3-5 relevant questions and answers when "faq" section is requested
      * Base questions on likely attendee concerns (e.g., "What should I bring?", "Is there parking available?")
      * Ensure answers are generic enough to be broadly applicable yet specific enough to be helpful
      * Include questions about registration process, event format, and audience expectations

    - For all generated content:
      * Ensure professional, engaging tone appropriate for event context
      * Avoid overly specific details that might contradict user-provided information
      * Keep descriptions focused on the apparent purpose of the event
      * Ensure content aligns with any theme, industry, or audience mentioned in the prompt

    - For all other fields NOT listed above, do NOT generate content and instead ask clarifying questions through the missingInformation field

    CLARIFYING QUESTIONS LOGIC:
    For base event information:
    - If "name" is missing and cannot be reasonably inferred: Ask "What is the short name for this event?"
    - If "title" is missing and cannot be reasonably inferred: Ask "What would be a full title for this event?"
    - If "description" is missing and cannot be reasonably inferred: Ask "Could you provide a detailed description for this event?"
    - If "startDate" is missing: Ask "When will this event start? Please provide date and time."
    - If "endDate" is missing: Ask "When will this event end? Please provide date and time."
    - If "location" is missing: Ask "Where will this event take place? Is it virtual or in-person?"
    - If "organizer" is missing: Ask "Who is organizing this event?"

    For "speakers" sections:
    - If speaker "name" is missing: Ask "Who will be speaking at this event? Please provide full names."
    - If speaker "role" is missing: Ask "What is the role or title of each speaker?"
    - If speaker "bio" is missing: Ask "Could you provide brief biographies for each speaker?"
    - If number of speakers is mentioned but no names: Ask "You mentioned [X] speakers. Could you provide their names?"

    For "agenda" sections:
    - If agenda "items" are missing: Ask "What items would you like to include in the agenda?"
    - If agenda item "time" is missing: Ask "What are the time slots for each agenda item?"
    - If agenda item "title" is missing: Ask "What is the title for each agenda item?"
    - If agenda item "description" is missing: Ask "Could you provide descriptions for each agenda item?"
    - If agenda item "speaker" is missing and speakers are included elsewhere: Ask "Which speakers will present each agenda item?"

    For "description" sections:
    - If description "text" is missing and cannot be reasonably inferred: Ask "What detailed description would you like for this section?"

    For "registration" sections:
    - If registration "text" is missing: Ask "What information would you like to include in the registration section?"
    - If registration "buttonText" is missing: Ask "What text would you like on the registration button?"
    - If registration "fields" are missing: Ask "What fields should be included in the registration form? (e.g., name, email, etc.)"
    - For each field, if "required" status is not specified: Ask "Which fields should be required for registration?"
    - For each field, if "type" is not specified: Ask "What type should each field be? (e.g., text, email, number)"

    For "location" sections:
    - If location "address" is missing for physical events: Ask "What is the street address for this event?"
    - If location "city" is missing for physical events: Ask "In which city will this event take place?"
    - If location "state" is missing for physical events: Ask "In which state/province will this event take place?"
    - If location "zipCode" is missing for physical events: Ask "What is the postal code for the event location?"
    - If "isVirtual" is ambiguous: Ask "Is this event virtual, in-person, or hybrid?"
    - If location "virtualLink" is missing for virtual events: Ask "What is the link or platform for this virtual event?"
    - If location "text" with additional details is missing: Ask "Is there any additional information about the location you'd like to include?"

    For "faq" sections:
    - If "faq" section is requested but no specific questions are provided: Generate relevant FAQs based on event context
    - If specific FAQ questions are mentioned but answers are missing: Ask "Could you provide answers for each FAQ question?"

    For "contact" sections:
    - If contact "email" is missing: Ask "What email address should be used for contact?"
    - If contact "phone" is missing: Ask "What phone number should be used for contact?"
    - If contact "socialMedia" is missing but implied: Ask "Would you like to include social media contact information? If so, which platforms and handles?"
    - If contact "text" with additional information is missing: Ask "Is there any additional contact information you'd like to include?"

    For "sponsors" sections:
    - If sponsors "sponsors" array is empty but section requested: Ask "Who are the sponsors for this event?"
    - If sponsor "name" is missing: Ask "What are the names of the sponsors?"
    - If sponsor "level" is missing: Ask "What sponsorship level does each sponsor have? (e.g., Gold, Silver, Bronze)"
    - If sponsor "description" is missing: Ask "Could you provide a brief description for each sponsor?"

    PRIORITY HANDLING:
    - If a user requests more than 8 sections, prioritize required sections first, then sections that appear earliest in their prompt
    - If sections conflict (e.g., both virtual and physical location requested), ask for clarification

    ${sectionTemplates}

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