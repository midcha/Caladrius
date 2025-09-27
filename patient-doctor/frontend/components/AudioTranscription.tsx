'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioTranscriptionProps {
  onTranscription: (text: string) => void;
}

interface MediaRecorderWithStop {
  stop: () => void;
}

export default function AudioTranscription({ onTranscription }: AudioTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset error state
      setError(null);

      // Initialize WebSocket connection
      websocketRef.current = new WebSocket('ws://localhost:3001');
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
        // Signal the start of streaming
        websocketRef.current?.send('START_STREAM');
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };

      websocketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setError('Connection closed');
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: string;
            text?: string;
            isPartial?: boolean;
            resultId?: string;
            message?: string;
          };
          
          console.log('Frontend received WebSocket message:', data);
          
          if (data.type === 'transcription') {
            console.log('Frontend processing transcription:', {
              text: data.text,
              isPartial: data.isPartial,
              resultId: data.resultId
            });
            
            // Always update the transcription, whether partial or final
            if (data.text?.trim()) {
              const newText = data.text.trim();
              console.log('Updating transcription text to:', newText);
              onTranscription(newText);
            }
          } else if (data.type === 'error') {
            console.error('Frontend received error:', data.message);
            setError(data.message ?? 'Unknown error occurred');
            stopRecording();
          }
        } catch (error) {
          console.error('Frontend error parsing WebSocket message:', error);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        stopRecording();
      };

      // Get audio stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create AudioContext for processing with correct sample rate
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(streamRef.current);
      
  // Create a processor node for raw PCM data with smaller buffer for lower latency
  const processor = audioContext.createScriptProcessor(2048, 1, 1);
  console.log('AudioContext sampleRate:', audioContext.sampleRate);
      
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          try {
            // Get raw PCM data
            const inputData = e.inputBuffer.getChannelData(0);
            // Debug: compute simple frame stats to ensure microphone captures non-zero samples
            try {
              let max = -Infinity, min = Infinity, nonzero = 0;
              const samplePreview: number[] = [];
              for (let i = 0; i < inputData.length; i++) {
                const v = inputData[i];
                if (v !== 0) nonzero++;
                if (v > max) max = v;
                if (v < min) min = v;
                if (i < 10) samplePreview.push(v);
              }
              console.log('audio frame stats', { samples: inputData.length, max, min, nonzero, nonzeroPct: (nonzero/inputData.length), preview: samplePreview });
            } catch (dbgErr) {
              console.warn('Failed to compute audio frame stats', dbgErr);
            }
            
            // Convert to 16-bit PCM at 16kHz
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // Normalize and convert to 16-bit PCM
              pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32767)));
            }
            
            // Make sure to send the raw ArrayBuffer
            websocketRef.current.send(pcmData.buffer);
            
            console.log('Sent audio buffer of size:', pcmData.length, 'samples, byteLength:', pcmData.buffer.byteLength);
          } catch (error) {
            console.error('Error processing audio:', error);
            setError('Error processing audio data');
          }
        }
      };
      
      // Connect the audio nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Store references for cleanup
      mediaRecorderRef.current = {
        stop: () => {
          processor.disconnect();
          source.disconnect();
          audioContext.close();
        }
      };
      
      // Start recording immediately
      setIsRecording(true);    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Error accessing microphone');
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsRecording(false);
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-md ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-semibold transition-colors`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isRecording ? 'Recording in progress...' : 'Ready to record'}
          </span>
        </div>
      </div>
    </div>
  );
}