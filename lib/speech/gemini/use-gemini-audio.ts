'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { GeminiLiveClient } from './gemini-live-client'
import type { SttHookResult, SttConfig } from '../stt/types'
import type { TtsHookResult, TtsConfig } from '../tts/types'
import type { InputLanguage, SpeechChunk, LearningLanguage } from '../types'

export function useGeminiAudio(
  sttConfig: SttConfig,
  ttsConfig: TtsConfig,
  learningLanguage: LearningLanguage,
  model: string = 'gemini-2.5-flash-native-audio-preview-12-2025'
): { stt: SttHookResult; tts: TtsHookResult } {
  const { onStart, onTranscript, onStop, onError: onSttError } = sttConfig
  const { onSpeakStart, onSpeakEnd, onComplete } = ttsConfig

  // State
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messageId, setMessageId] = useState<string | null>(null)

  // Refs
  const clientRef = useRef<GeminiLiveClient | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextInputRef = useRef<AudioContext | null>(null)
  const audioContextOutputRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const transcriptRef = useRef('')
  const setupCompleteRef = useRef(false)

  const cleanup = useCallback(() => {
    console.log('🧹 Cleanup called');
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextInputRef.current?.state !== 'closed') audioContextInputRef.current?.close();
    if (audioContextOutputRef.current?.state !== 'closed') audioContextOutputRef.current?.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (clientRef.current) clientRef.current.disconnect();
    
    clientRef.current = null;
    setupCompleteRef.current = false;
    workletNodeRef.current = null;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const playRawAudioChunk = useCallback(async (data: ArrayBuffer | Blob) => {
    try {
      if (!audioContextOutputRef.current) {
        audioContextOutputRef.current = new AudioContext({ sampleRate: 24000 });
        await audioContextOutputRef.current.audioWorklet.addModule('/pcm-processor.js');
        workletNodeRef.current = new AudioWorkletNode(audioContextOutputRef.current, 'pcm-processor');
        workletNodeRef.current.connect(audioContextOutputRef.current.destination);
      }

      if (audioContextOutputRef.current.state === 'suspended') {
        await audioContextOutputRef.current.resume();
      }

      let arrayBuffer: ArrayBuffer;
      if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer();
      } else {
        arrayBuffer = data;
      }

      const pcm16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

      workletNodeRef.current?.port.postMessage(float32);
      setIsSpeaking(true);
    } catch (e) {
      console.error('❌ Playback error:', e);
    }
  }, []);

  const start = useCallback(async (inputLang?: InputLanguage) => {
    if (clientRef.current) {
      console.warn('⚠️ Already connected');
      return;
    }

    try {
      console.log('🎤 Starting Gemini Live...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1, 
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
      audioContextInputRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextInputRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextInputRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (!clientRef.current || !setupCompleteRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32768)));
        }
        
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64 = btoa(binary);
        
        clientRef.current.sendRealtimeInput(base64);
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextInputRef.current.destination);

      const client = new GeminiLiveClient('ws://localhost:8080');
      clientRef.current = client;

      client.on('open', () => {
        setIsListening(true);
        const msgId = Date.now().toString();
        setMessageId(msgId);
        onStart?.(msgId, inputLang || 'learning');
      });

      client.on('setupComplete', () => {
        setupCompleteRef.current = true;
        console.log('✅ Handshake complete');
        
        // Initial greeting to trigger response
        client.send({
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{ text: 'Hello! I want to practice my language skills.' }]
            }],
            turnComplete: true
          }
        });
      });

      client.on('audio', (data) => {
        console.log('🔊 Received binary audio chunk');
        playRawAudioChunk(data);
        onSpeakStart?.(Date.now().toString());
      });

      client.on('content', (content) => {
        if (content.interrupted) {
          console.log('🛑 Interrupted');
          setIsSpeaking(false);
          return;
        }

        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.mimeType === 'audio/pcm') {
              console.log('🔊 Received inline audio (base64)');
              // Handle inline base64 audio if provided
              const binaryString = atob(part.inlineData.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
              playRawAudioChunk(bytes.buffer);
              onSpeakStart?.(Date.now().toString());
            }
            if (part.text) {
              console.log('💬 Text:', part.text);
              transcriptRef.current += part.text;
              setTranscript(transcriptRef.current);
              onTranscript?.(transcriptRef.current, false);
            }
          }
        }

        if (content.turnComplete) {
          setIsSpeaking(false);
          onSpeakEnd?.(Date.now().toString());
          onComplete?.();
        }
      });

      client.on('close', () => {
        setIsListening(false);
        cleanup();
      });

      client.on('error', (err) => {
        onSttError?.(err);
      });

      await client.connect({
        model: `models/${model}`,
        generationConfig: { 
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        },
        systemInstruction: { 
          parts: [{ 
            text: `You are a patient language tutor helping users practice ${learningLanguage}. Keep responses concise and encouraging.` 
          }] 
        }
      });

    } catch (err) {
      console.error('❌ Start error:', err);
      onSttError?.(err as Error);
      cleanup();
    }
  }, [learningLanguage, model, onStart, onTranscript, onSttError, playRawAudioChunk, onSpeakStart, onSpeakEnd, onComplete, cleanup]);

  const stop = useCallback(() => {
    console.log('⏹️ Stopping...');
    cleanup();
    setIsListening(false);
    onStop?.(transcriptRef.current, messageId || '', 'learning', true);
  }, [cleanup, messageId, onStop]);

  return {
    stt: {
      state: isListening ? 'listening' : 'idle',
      isListening,
      transcript,
      messageId,
      inputLanguage: 'learning',
      audioChunks: [],
      start,
      stop,
      supportsAutoTurnDetection: true,
      isMultilingual: true,
    },
    tts: {
      state: isSpeaking ? 'speaking' : 'idle',
      isSpeaking,
      currentMessageId: null,
      speak: async () => {}, // Handled internally
      stop: () => setIsSpeaking(false),
      cancel: () => setIsSpeaking(false),
    },
  }
}
