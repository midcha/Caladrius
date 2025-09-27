const fs = require('fs');
const WebSocket = require('ws');

// Usage: node send-audio-test.js <pcm16le-file>
// The file should be 16kHz, 16-bit PCM, mono (raw .pcm data). This script streams the file
// in 4096-byte chunks to ws://localhost:3001 and sends 'START_STREAM' before streaming.

const [, , filePath] = process.argv;
if (!filePath) {
  console.error('Usage: node send-audio-test.js <pcm16le-file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => {
  console.log('Connected to server, sending START_STREAM');
  ws.send('START_STREAM');

  const stream = fs.createReadStream(filePath, { highWaterMark: 4096 });
  stream.on('data', (chunk) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk);
      console.log('Sent chunk', chunk.length);
    }
  });

  stream.on('end', () => {
    console.log('File stream ended, closing websocket');
    ws.close();
  });
});

ws.on('message', (msg) => {
  try {
    const data = JSON.parse(msg.toString());
    console.log('Server message:', data);
  } catch (e) {
    console.log('Server raw message:', msg.toString());
  }
});

ws.on('close', () => {
  console.log('Connection closed');
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});