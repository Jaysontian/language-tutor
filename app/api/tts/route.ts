import { NextRequest, NextResponse } from 'next/server'

type TTSProvider = 'elevenlabs' | 'browser' | 'openai'

export async function POST(request: NextRequest) {
  try {
    const { text, language, learningLanguage, provider = 'elevenlabs' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const ttsProvider = provider as TTSProvider

    // Browser TTS is handled client-side, so we only handle ElevenLabs here
    if (ttsProvider === 'browser') {
      return NextResponse.json(
        { error: 'Browser TTS should be handled client-side' },
        { status: 400 }
      )
    }

    // Handle OpenAI GPT-4o-mini-tts provider
    if (ttsProvider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        )
      }

      // Map learning languages to OpenAI voices
      // OpenAI voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
      // We'll use different voices for different languages to provide variety
      const learningLanguageToVoiceMap: Record<string, string> = {
        'French': 'nova',      // Clear, pleasant voice
        'Spanish': 'coral',    // Warm, expressive voice
        'Chinese': 'shimmer',  // Clear, articulate voice
        'Japanese': 'sage',     // Calm, measured voice
      }

      // Map language codes to voices (fallback)
      const languageCodeToVoiceMap: Record<string, string> = {
        'FR': 'nova',
        'ES': 'coral',
        'ZH': 'shimmer',
        'JA': 'sage',
        'EN': 'alloy', // Default English voice
      }

      // Always prioritize learning language voice
      const voiceFromLearningLanguage =
        typeof learningLanguage === 'string' ? learningLanguageToVoiceMap[learningLanguage] : undefined

      const languageCode = language?.toUpperCase()
      const voiceFromChunkLanguage =
        languageCode && languageCodeToVoiceMap[languageCode] ? languageCodeToVoiceMap[languageCode] : undefined

      // Determine if text is English
      const isEnglish = languageCode === 'EN' || !languageCode
      
      // Voice selection: Always prioritize learning language voice
      // If English text, use learning language voice (will add accent via instructions)
      // If learning language text, use learning language voice
      // Fallback to chunk language voice, then default
      const selectedVoice = voiceFromLearningLanguage || voiceFromChunkLanguage || 'alloy'

      // Build instructions based on context
      let instructions = `when the word is in ${learningLanguage.toLowerCase()} use that language to pronounce it.`
      // if (isEnglish && learningLanguage && voiceFromLearningLanguage) {
      //   // If speaking English, use learning language voice with English accent
      //   instructions = `Speak this English text with a ${learningLanguage.toLowerCase()} accent, maintaining clear English pronunciation.`
      // } else if (learningLanguage && !isEnglish && voiceFromLearningLanguage) {
      //   // If speaking in learning language, emphasize natural pronunciation
      //   instructions = `Speak this ${learningLanguage} text naturally and clearly with proper pronunciation.`
      // } else if (learningLanguage && voiceFromLearningLanguage) {
      //   // Fallback: use learning language voice for any text
      //   instructions = `Speak this text using ${learningLanguage.toLowerCase()} pronunciation and accent.`
      // }

      console.log(
        `TTS request (OpenAI) - LearningLanguage: ${learningLanguage || 'N/A'}, ChunkLanguage: ${language || 'N/A'}, Voice: ${selectedVoice}, Text: ${text.substring(0, 50)}...`
      )

      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            voice: selectedVoice,
            input: text,
            response_format: 'wav', // Return WAV format
            ...(instructions && { instructions }), // Only include if we have instructions
            speed: 1, // Normal speed
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          console.error('OpenAI TTS API error:', error)
          return NextResponse.json(
            { error: 'Failed to generate speech with OpenAI' },
            { status: response.status }
          )
        }

        const audioBuffer = await response.arrayBuffer()

        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/wav',
          },
        })
      } catch (error) {
        console.error('OpenAI TTS error:', error)
        return NextResponse.json(
          { error: 'Failed to generate speech with OpenAI' },
          { status: 500 }
        )
      }
    }

    // Handle Eleven Labs provider (default)
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Eleven Labs API key not configured' },
        { status: 500 }
      )
    }

    // Map language codes to specific voice IDs for better pronunciation
    const voiceIdMap: Record<string, string> = {
      'FR': 'm5U7XCsc8v988k2RJAqN', // French
      'ES': 'zl7szWVBXnpgrJmAalgz', // Spanish
      'ZH': 'W8lBaQb9YIoddhxfQNLP', // Chinese
      'JA': 'GR4dBIFsYe57TxyrHKXz', // Japanese
    }

    // Map learning language name to the same voice IDs.
    // We intentionally use the learning language voice even when speaking English,
    // so English explanations are pronounced with the target-language accent.
    const learningLanguageToVoiceIdMap: Record<string, string> = {
      'French': voiceIdMap['FR'],
      'Spanish': voiceIdMap['ES'],
      'Chinese': voiceIdMap['ZH'],
      'Japanese': voiceIdMap['JA'],
    }
    
    // Get voice ID based on learning language (preferred), otherwise fall back to chunk language.
    const voiceIdFromLearningLanguage =
      typeof learningLanguage === 'string' ? learningLanguageToVoiceIdMap[learningLanguage] : undefined

    const languageCode = language?.toUpperCase()
    const voiceIdFromChunkLanguage =
      languageCode && voiceIdMap[languageCode] ? voiceIdMap[languageCode] : undefined

    const voiceId =
      voiceIdFromLearningLanguage ||
      voiceIdFromChunkLanguage ||
      (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM') // Default voice for English
    
    // Use ElevenLabs Multilingual Model
    // eleven_multilingual_v2 supports 30+ languages and automatically detects language from text
    // eleven_turbo_v2 also supports multilingual but v2 is more stable
    // Can override with ELEVENLABS_MODEL_ID env var (e.g., 'eleven_multilingual_v1' or 'eleven_turbo_v2')
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'
    
    // Log for debugging
    console.log(
      `TTS request - LearningLanguage: ${learningLanguage || 'N/A'}, ChunkLanguage: ${language || 'N/A'}, Model: ${modelId}, Text: ${text.substring(0, 50)}...`
    )

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.8,

          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Eleven Labs API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error) {
    console.error('Error in TTS API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


