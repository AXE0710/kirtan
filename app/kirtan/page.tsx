"use client"

import { VoiceRecognizer } from "@/components/voice-recognizer"

export default function KirtanPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-pretty">Shabad Kirtan Recognizer</h1>
        <p className="mt-2 text-muted-foreground">
          Live Punjabi recognition with guided matching to your pre-fed Shabad. Displays both Punjabi words and English
          letters.
        </p>
      </header>
      <VoiceRecognizer />
    </main>
  )
}
