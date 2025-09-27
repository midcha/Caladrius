'use client';

import { useState } from 'react';
import AudioTranscription from '../../components/AudioTranscription';

export default function Home() {
  const [transcribedText, setTranscribedText] = useState<string>('');

  const handleTranscription = (text: string) => setTranscribedText(text);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center">
      <header className="w-full max-w-4xl px-6 py-6">
        <h1 className="text-3xl font-bold text-center">Caladrius — Medical Transcription</h1>
      </header>

      <main className="flex-1 w-full max-w-4xl px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left column: placeholder for another component */}
        <section className="col-span-1 md:col-span-1 bg-gray-50 border rounded-lg p-6 flex items-center justify-center min-h-[240px]">
          <div className="text-center text-sm text-gray-600">Placeholder area for another component</div>
        </section>

        {/* Middle column: main interaction area — big center slot */}
        <section className="col-span-1 md:col-span-1 flex flex-col gap-6 items-center">
          <div className="w-full bg-white border rounded-lg p-8 flex flex-col items-center">
            <div className="mb-4">
              <AudioTranscription onTranscription={handleTranscription} />
            </div>
            <div className="w-full mt-2 text-center text-sm text-gray-500">Click to start/stop recording. Transcription appears on the right.</div>
          </div>
        </section>

        {/* Right column: transcription display */}
        <section className="col-span-1 md:col-span-1 bg-white border rounded-lg p-6 min-h-[240px]">
          <h2 className="text-lg font-semibold mb-3">Transcribed Text</h2>
          <div className="whitespace-pre-wrap text-sm text-gray-800 min-h-[160px]">{transcribedText || <span className="text-gray-400">No transcription yet.</span>}</div>
        </section>
      </main>

      <footer className="w-full max-w-4xl px-6 py-6 text-center text-xs text-gray-500">Built for HackGT-25</footer>
    </div>
  );
}
