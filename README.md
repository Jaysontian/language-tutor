# Language Tutor

A simple Next.js language tutor application using OpenAI for text generation and Eleven Labs for text-to-speech.

## Features

- Tap to speak functionality using Web Speech API
- OpenAI integration for generating language learning responses
- Eleven Labs TTS for audio playback of responses
- Simple, clean UI with a blue circle button and transcript display

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here (optional)
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click the blue circle to start recording
2. Speak your message
3. The transcript will appear below
4. OpenAI will generate a response
5. The response will be read aloud using Eleven Labs TTS

## Notes

- The app uses the browser's built-in Speech Recognition API (works best in Chrome/Edge)
- Make sure to set up your API keys in `.env.local`
- You can customize the Eleven Labs voice ID in the environment variables


