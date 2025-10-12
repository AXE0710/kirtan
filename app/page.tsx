import SpeechTranscriber from "@/components/speech-transcriber"
import MicLevelMeter from "@/components/mic-level-meter"

export default function Page() {
  return (
    <main
      className="min-h-dvh flex flex-col bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url(https://www.whoa.in/download/lord-guru-nanak-with-quote-hd-wallpaper)" }}
    >
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <h1 className="text-lg font-semibold text-pretty">Speech to Text</h1>
          <p className="text-sm text-muted-foreground">English · Hindi · Punjabi</p>
        </div>
      </header>

      <section className="flex-1">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <div className="flex flex-col gap-4">
            <SpeechTranscriber />
            <MicLevelMeter />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div
          className="mx-auto w-full max-w-screen-sm px-4 py-3 text-xs text-muted-foreground"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          Tip: For best results, use Chrome on Android. Allow microphone access when prompted.
        </div>
      </footer>
    </main>
  )
}
