import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import VoiceRecognizer from "@/components/voice-recognizer"

export default function HomePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Live Voice Recognizer</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceRecognizer />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
