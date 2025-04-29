# EventCombo AI

EventCombo AI is an intelligent event generation tool that creates event content from natural language prompts. Built with Angular, this application demonstrates the implementation of a conversational UI for generating structured event data using large language models.

## Features

- **Natural Language Prompt Processing**: Describe your event in plain language
- **Multi-Model AI Integration**: Switch between Groq (Llama 3.3) and Google Gemini models
- **Intelligent Event Generation**: Automatically creates structured event content
- **Content Constraints**: Enforces platform constraints like banned words and allowed sections
- **Interactive Clarification**: Requests additional information when needed
- **Dynamic Event Preview**: Real-time preview of the generated event
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Project Structure

The application follows a feature-based organization:

```
src/
├── app/
│   ├── core/
│   │   ├── models/       # Data models and interfaces
│   │   └── services/     # Core services for constraints and event generation
│   ├── features/
│   │   ├── prompt-input/         # User prompt input component
│   │   ├── event-preview/        # Event preview component
│   │   ├── event-section/        # Event section component for different section types
│   │   ├── model-selector/       # AI model selection component
│   │   └── clarification-dialog/ # Dialog for requesting additional information
│   └── assets/
│       └── json/         # Constraint configuration files
```

## AI Models

EventCombo AI supports multiple AI models:

- **Groq (Llama 3.3 70B)**: High-performance model with fast response times
- **Google Gemini (2.0 Flash)**: Google's advanced generative AI model

The model selector in the UI allows you to switch between these models at any time.

## Development Environment

### Prerequisites

- Node.js (LTS version recommended)
- Angular CLI 19+
- API keys for Groq and Google Gemini

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/eventcombo-ai.git
   cd eventcombo-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a file environment.ts with your API keys:
   ```typescript
   export const environment = {
     production: false,
     groqApiKey: 'YOUR_GROQ_API_KEY',
     geminiApiKey: 'YOUR_GEMINI_API_KEY',
   };
   ```

4. Start the development server:
   ```bash
   ng serve
   ```

5. Navigate to `http://localhost:4200/` in your browser

## How It Works

1. **Enter a Prompt**: Describe the event you want to create in natural language
2. **Select AI Model**: Choose between Groq and Gemini for event generation
3. **AI Processing**: The system analyzes your prompt for required information and requested sections
4. **Clarification (if needed)**: If essential information is missing, the system will ask for clarification
5. **Event Generation**: Creates a structured event with appropriate sections
6. **Preview and Edit**: View the generated event and make changes if needed

## Constraint System

The application includes a constraint system that enforces platform rules:

- **Allowed Sections**: Only certain section types are permitted (speakers, agenda, registration, etc.)
- **Banned Words/Content**: Content with prohibited keywords is rejected
- **Required Fields**: Ensures all necessary event information is provided

## Building for Production

```bash
ng build --configuration production
```

This will compile your project and store the build artifacts in the dist directory.

## Running The Project


```bash
ng serve --open
```

## Technical Implementation

- **Angular 19+**: Built with the latest Angular framework
- **Standalone Components**: Uses Angular's standalone component architecture
- **RxJS**: Reactive programming for handling asynchronous operations
- **TypeScript**: Comprehensive interfaces and type guards
- **HTTP Client**: Integration with external AI APIs
- **Responsive UI**: Mobile-friendly design using CSS flexbox and grid

## Future Enhancements

- **Enhanced NLP**: More sophisticated prompt analysis
- **User Accounts**: Save and manage generated events
- **Export Options**: Export events to various formats
- **Template Gallery**: Pre-made event templates
- **Social Sharing**: Share generated events on social media
- **Additional LLM Support**: Integration with more AI providers

## License

MIT License

## Acknowledgements

- [Angular](https://angular.dev)
- [Groq API](https://console.groq.com/docs/quickstart)
- [Google Gemini API](https://ai.google.dev/tutorials/web_quickstart)