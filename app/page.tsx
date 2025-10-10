import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import VoiceRecognizer from "@/components/voice-recognizer"

export default function HomePage() {
  return (
    <main
      className="min-h-dvh flex items-center justify-center p-6 bg-cover bg-center relative "
      style={{ backgroundImage: "url('https://myindianthings.com/cdn/shop/products/Attract_Blessings_Guru_Nanak_Wallpaper_800x.jpg?v=1710913546')" }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />
      <div className="w-full max-w-3xl z-10">
        <Card className="opacity-85">
          <CardHeader>
            <CardTitle className="text-balance">Live Voice Recognizer Credesoft</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceRecognizer />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
