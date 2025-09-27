const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { randomUUID } = require('crypto');
const {
  TranscribeStreamingClient,
  StartMedicalStreamTranscriptionCommand,
} = require('@aws-sdk/client-transcribe-streaming');
require('dotenv').config();

// For debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// For debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const fs = require('fs');
const path = require('path');
const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts');
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

// Track last saved final transcript per session to avoid duplicate writes
const sessionFiles = new Map(); // sessionId -> { lastFinalText: string }

console.log('AWS Configuration:', {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : undefined,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Do not override endpoint; let the AWS SDK determine the correct regional endpoint.
  // Add a logger so the SDK emits debug/error context to stdout which helps diagnose HTTP/2 handshake failures.
  logger: console,
});

wss.on('connection', (ws) => {
  console.log('New client connected');
  let isTranscribing = false;
  let audioStreamResolver = null;
  let transcribeStream = null;
  // no AbortController: prefer clean generator termination by resolving the audio promise

  const createAudioStream = async function* () {
    try {
      while (isTranscribing) {
        const chunk = await new Promise((resolve, reject) => {
          if (!isTranscribing) {
            reject(new Error('Transcription stopped'));
            return;
          }
          audioStreamResolver = resolve;
        });
        
  if (!chunk || !isTranscribing) break;
        
        // Convert the incoming buffer to the correct format
  const audioChunk = chunk instanceof Buffer ? chunk : Buffer.from(chunk);

  // Compute RMS for quick signal-level diagnostics
  const rmsInfo = computeRmsFromInt16Buffer(audioChunk);
  console.log(`AWS send chunk RMS: ${rmsInfo.rms.toFixed(2)} (linear), ${rmsInfo.db.toFixed(1)} dB`);
        
        // Ensure the chunk size is reasonable (not too small or large)
        if (audioChunk.length > 0 && audioChunk.length <= 32000) { // 32KB max chunk size
          yield { AudioEvent: { AudioChunk: audioChunk } };
          console.log('Sent audio chunk to AWS of size:', audioChunk.length);
        } else {
          console.warn('Skipping invalid chunk size:', audioChunk.length);
        }
      }
    } catch (e) {
      console.error('Error in audio stream:', e);
      isTranscribing = false;
    } finally {
      console.log('Audio stream generator ended');
    }
  };

  const cleanup = async () => {
    console.log('Cleaning up resources...');
    // flip flag first so generators/resolvers stop
    isTranscribing = false;

    // Clear transcribeStream reference so it's GC'able
    transcribeStream = null;

    // Resolve any pending audio promise to unblock the generator
    if (audioStreamResolver) {
      try {
        audioStreamResolver(null);
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
      audioStreamResolver = null;
    }
  };

  ws.on('message', async (data) => {
    try {
      if (data.toString() === 'START_STREAM') {
        console.log('Starting new transcription stream');
        await cleanup(); // Clean up any existing stream and wait
        isTranscribing = true;

        try {
          const sessionId = randomUUID();
          console.log('Starting medical transcription with configuration:');
          const config = {
            LanguageCode: 'en-US',
            MediaEncoding: 'pcm',
            MediaSampleRateHertz: 16000,
            AudioStream: createAudioStream(),
            Specialty: 'PRIMARYCARE',
            Type: 'DICTATION',
            SessionId: sessionId,
            EnableChannelIdentification: false,
            ShowSpeakerLabels: false,
            VocabularyName: process.env.VOCABULARY_NAME
          };
          console.log(JSON.stringify(config, null, 2));
          
          const command = new StartMedicalStreamTranscriptionCommand(config);
          console.log('Sending transcription command to AWS...');

          // Send the command to AWS (no explicit abort signal; we'll end the audio generator to finish)
          transcribeStream = await transcribeClient.send(command);
          console.log('Transcription stream established successfully');
          console.log('AWS Stream configuration:', {
            LanguageCode: command.input.LanguageCode,
            MediaEncoding: command.input.MediaEncoding,
            MediaSampleRateHertz: command.input.MediaSampleRateHertz,
            Specialty: command.input.Specialty,
            Type: command.input.Type
          });

          // Process transcription results and log raw events for debugging
          (async () => {
            try {
              let eventCount = 0;
              for await (const event of transcribeStream.TranscriptResultStream) {
                eventCount++;
                // Log the first 20 events in full to inspect structure
                if (eventCount <= 20) {
                  console.log(`RAW_TRANSCRIBE_EVENT[${eventCount}]:`, JSON.stringify(event));
                }

                if (!isTranscribing || ws.readyState !== WebSocket.OPEN) {
                  console.log('Stopping transcription stream');
                  break;
                }

                // If SDK provided transcript results, forward them
                if (event.TranscriptEvent?.Transcript?.Results) {
                  const results = event.TranscriptEvent.Transcript.Results;
                  console.log('Got transcription results:', JSON.stringify(results));

                  for (const result of results) {
                    if (result.Alternatives?.[0]) {
                              const msgObj = {
                                type: 'transcription',
                                text: result.Alternatives[0].Transcript,
                                isPartial: result.IsPartial
                              };
                              const message = JSON.stringify(msgObj);
                              console.log('Sending transcription:', message);
                              ws.send(message);

                              // Persist transcripts:
                              // 1) Always append a raw log line with partial/final annotations for debugging/audit
                              // 2) Additionally, append only final (non-partial) text to a consolidated <sessionId>.final.txt file
                              try {
                                const sessionFile = path.join(TRANSCRIPTS_DIR, `${sessionId}.txt`);
                                const timestamp = new Date().toISOString();
                                const line = `${timestamp}\t${msgObj.isPartial ? 'partial' : 'final'}\t${msgObj.text.replace(/\r?\n/g, ' ')}\n`;
                                fs.appendFile(sessionFile, line, (err) => {
                                  if (err) console.error('Failed to append transcript to file:', err);
                                });

                                // If this is a final result, append to the consolidated final file but avoid duplicates
                                if (!msgObj.isPartial) {
                                  const finalFile = path.join(TRANSCRIPTS_DIR, `${sessionId}.final.txt`);
                                  const sess = sessionFiles.get(sessionId) || { lastFinalText: null };
                                  const cleanedText = msgObj.text.replace(/\r?\n/g, ' ').trim();
                                  if (cleanedText && cleanedText !== sess.lastFinalText) {
                                    // Append with timestamp and a newline-separated conversation style
                                    const outLine = `${timestamp} ${cleanedText}\n`;
                                    fs.appendFile(finalFile, outLine, (err) => {
                                      if (err) console.error('Failed to append final transcript to file:', err);
                                    });
                                    sessionFiles.set(sessionId, { lastFinalText: cleanedText });
                                  } else {
                                    // duplicate or empty final text; ignore
                                  }
                                }
                              } catch (err) {
                                console.error('Error persisting transcript:', err);
                              }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error processing transcription:', error);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Transcription error: ' + error.message
                }));
              }
            }
          })().catch(error => {
            console.error('Fatal error in transcription handler:', error);
          });

        } catch (error) {
          console.error('Error starting transcription:', error);
          await cleanup();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to start transcription: ' + error.message
            }));
          }
        }
      } else if (data instanceof Buffer || data instanceof ArrayBuffer) {
        if (audioStreamResolver && isTranscribing) {
          try {
            let audioData = data instanceof ArrayBuffer ? Buffer.from(data) : data;

            // Add some rate limiting to avoid overwhelming the stream
            await new Promise(resolve => setTimeout(resolve, 20)); // 50 chunks per second max

            // Compute RMS assuming Int16
            const int16Info = computeRmsFromInt16Buffer(audioData);
            // Compute RMS assuming Float32 (in case frontend sent float32 samples)
            const float32Info = computeRmsFromFloat32Buffer(audioData);

            // Log both interpretations for diagnostics
            console.log('Received chunk sizes', audioData.length, 'Int16RMS:', int16Info.rms.toFixed(4), `${int16Info.db.toFixed(1)}dB`, 'Float32RMS:', float32Info.rms.toFixed(4), `${float32Info.db.toFixed(1)}dB`);

            // If the buffer looks like Float32 (float RMS significantly higher than int16 RMS), convert it
            if (float32Info.rms > Math.max(1e-6, int16Info.rms * 10)) {
              // Convert Float32 samples to Int16 LE buffer
              audioData = float32ToInt16Buffer(audioData);
              const reconv = computeRmsFromInt16Buffer(audioData);
              console.log('Converted Float32->Int16; new Int16RMS:', reconv.rms.toFixed(4), `${reconv.db.toFixed(1)}dB`);
            }

            if (isTranscribing) { // Check again after delay
              // Resolve one waiting generator promise and then clear resolver to avoid double-resolve
              const resolver = audioStreamResolver;
              audioStreamResolver = null;
              resolver && resolver(audioData);
              // Log RMS of received chunk for diagnostics
              const rmsInfo = computeRmsFromInt16Buffer(audioData);
              console.log('Processed audio chunk of size:', audioData.length, `RMS:${rmsInfo.rms.toFixed(4)}`, `${rmsInfo.db.toFixed(1)}dB`);
            }
          } catch (error) {
            console.error('Error processing audio data:', error);
            console.error('Audio data type:', data.constructor.name);
            console.error('Audio data size:', data.byteLength || data.length);
          }
        }
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      cleanup();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanup();
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    cleanup();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Helper: compute RMS and dB for Int16 PCM buffer
function computeRmsFromInt16Buffer(buf) {
  try {
    const view = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    // Interpret as signed 16-bit little-endian samples
    const sampleCount = Math.floor(view.length / 2);
    if (sampleCount === 0) return { rms: 0, db: -Infinity };
    let sumSq = 0;
    for (let i = 0; i < sampleCount; i++) {
      const sample = view.readInt16LE(i * 2);
      sumSq += sample * sample;
    }
    const meanSq = sumSq / sampleCount;
    const rms = Math.sqrt(meanSq) / 32767; // normalize to [0,1]
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    return { rms, db };
  } catch (e) {
    return { rms: 0, db: -Infinity };
  }
}

function computeRmsFromFloat32Buffer(buf) {
  try {
    const view = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const sampleCount = Math.floor(view.length / 4);
    if (sampleCount === 0) return { rms: 0, db: -Infinity };
    let sumSq = 0;
    for (let i = 0; i < sampleCount; i++) {
      const sample = view.readFloatLE(i * 4);
      sumSq += sample * sample;
    }
    const meanSq = sumSq / sampleCount;
    const rms = Math.sqrt(meanSq); // float32 samples should already be in [-1,1]
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    return { rms, db };
  } catch (e) {
    return { rms: 0, db: -Infinity };
  }
}

function float32ToInt16Buffer(buf) {
  const view = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const sampleCount = Math.floor(view.length / 4);
  const out = Buffer.alloc(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    const f = view.readFloatLE(i * 4);
    const clamped = Math.max(-1, Math.min(1, f));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    out.writeInt16LE(int16, i * 2);
  }
  return out;
}