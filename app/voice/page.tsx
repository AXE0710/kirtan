import VoiceRecognizer from "@/components/voice-recognizer"

export default function VoicePage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-pretty">Punjabi + English Voice Recognizer</h1>
        <p className="text-muted-foreground">
          Live speech-to-text in your browser. Choose a language, start listening, and see both Punjabi words and
          English letters.
        </p>
      </header>
      <VoiceRecognizer />
    </main>
  )
}
