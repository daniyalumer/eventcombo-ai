# EventCombo AI

EventCombo AI is an intelligent event generation tool that creates event content from natural language prompts. Built with Angular, this application demonstrates how to implement a conversational UI for generating structured event data.

## Features

- **Natural Language Prompt Processing**: Describe your event in plain language
- **Intelligent Event Generation**: Automatically creates structured event content
- **Content Constraints**: Enforces platform constraints like banned words and allowed sections
- **Interactive Clarification**: Requests additional information when needed
- **Dynamic Event Preview**: Real-time preview of the generated event

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
│   │   └── clarification-dialog/ # Dialog for requesting additional information
│   └── assets/
│       └── json/         # Constraint configuration files
```

## Development server

To start a local development server, run:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify source files.

## How It Works

1. **Enter a Prompt**: Describe the event you want to create in natural language
2. **AI Processing**: The system analyzes your prompt for required information and requested sections
3. **Clarification (if needed)**: If essential information is missing, the system will ask for clarification
4. **Event Generation**: Creates a structured event with appropriate sections
5. **Preview and Edit**: View the generated event and make changes if needed

## Constraint System

The application includes a constraint system that enforces platform rules:

- **Allowed Sections**: Only certain section types are permitted
- **Banned Words/Content**: Content with prohibited keywords is rejected
- **Required Fields**: Ensures all necessary event information is provided

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the dist directory.

## Running unit tests

Execute unit tests with Karma:

```bash
ng test
```

## Technical Implementation

- **Angular 19+**: Built with the latest Angular framework
- **Standalone Components**: Uses Angular's standalone component architecture
- **Type Safety**: Comprehensive TypeScript interfaces and type guards
- **Reactive Programming**: RxJS for handling asynchronous operations

## Future Enhancements

- **Enhanced NLP**: More sophisticated prompt analysis
- **User Accounts**: Save and manage generated events
- **Export Options**: Export events to various formats
- **Template Gallery**: Pre-made event templates
- **Social Sharing**: Share generated events on social media

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [RxJS Documentation](https://rxjs.dev/guide/overview)