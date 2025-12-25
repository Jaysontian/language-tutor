import { EventEmitter } from 'events';

/**
 * Professional Gemini Live Client
 * Manages WebSocket state, handshakes, and message routing
 */
export class GeminiLiveClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(proxyUrl: string = 'ws://localhost:8080') {
    super();
    this.url = proxyUrl;
  }

  connect(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to Gemini Proxy:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ Connected to Proxy');
        // Send setup configuration as the first message
        this.send({ setup: config });
        this.emit('open');
        resolve();
      };

      this.ws.onmessage = async (evt) => {
        try {
          let data = evt.data;
          
          // Handle binary data (Audio chunks)
          if (data instanceof ArrayBuffer || data instanceof Blob) {
            this.emit('audio', data);
            return;
          }

          // Handle text data (JSON)
          const message = JSON.parse(data);
          
          if (message.setupComplete) {
            console.log('✅ Gemini Setup Complete');
            this.emit('setupComplete');
          } else if (message.serverContent) {
            this.emit('content', message.serverContent);
          } else if (message.toolCall) {
            this.emit('toolCall', message.toolCall);
          } else if (message.error) {
            console.error('❌ Gemini Error:', message.error);
            this.emit('error', message.error);
          }
        } catch (e) {
          console.error('❌ Failed to parse message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        this.emit('error', err);
        reject(err);
      };

      this.ws.onclose = (evt) => {
        console.log('🔌 Disconnected from Proxy:', evt.code, evt.reason);
        this.emit('close');
      };
    });
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not open, message dropped');
    }
  }

  sendRealtimeInput(base64PCM: string) {
    this.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm',
          data: base64PCM
        }]
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

