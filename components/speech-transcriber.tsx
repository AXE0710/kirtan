"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

type LangKey = "en" | "hi" | "pa" | "mr"

const LANG_MAP: Record<LangKey, { label: string; code: string; hint?: string }> = {
  en: { label: "English", code: "en-US" },
  hi: { label: "Hindi", code: "hi-IN" },
  pa: { label: "Punjabi", code: "pa-IN", hint: "Punjabi availability may vary by device." },
  mr: { label: "Marathi", code: "mr-IN", hint: "Marathi availability may vary by device." }
}

export default function SpeechTranscriber() {
  const [lang, setLang] = React.useState<LangKey>("en")
  const [isListening, setIsListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState("")
  const [interim, setInterim] = React.useState("")
  const [supported, setSupported] = React.useState<boolean | null>(null)
  const recognitionRef = React.useRef<any | null>(null)
  const restartingRef = React.useRef(false)
  const wakeLockRef = React.useRef<any | null>(null)
  const transcriptBoxRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      (typeof window.SpeechRecognition !== "undefined" || typeof window.webkitSpeechRecognition !== "undefined")
    setSupported(isSupported)
    // Stop recognition on unmount
    return () => {
      try {
        recognitionRef.current?.stop?.()
      } catch {}
      recognitionRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const released = false
    const requestWakeLock = async () => {
      try {
        const wl = await (navigator as any)?.wakeLock?.request?.("screen")
        if (wl) {
          wakeLockRef.current = wl
          wl.addEventListener?.("release", () => {
            wakeLockRef.current = null
          })
        }
      } catch {
        // swallow if unsupported or denied
      }
    }

    if (isListening) {
      requestWakeLock()
    } else {
      try {
        wakeLockRef.current?.release?.()
      } catch {}
      wakeLockRef.current = null
    }

    // Re-acquire on visibility change (common on mobile)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isListening && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      try {
        wakeLockRef.current?.release?.()
      } catch {}
      wakeLockRef.current = null
    }
  }, [isListening])

  React.useEffect(() => {
    const el = transcriptBoxRef.current
    if (!el) return
    try {
      el.scrollTop = el.scrollHeight
    } catch {}
  }, [transcript, interim])

  const handleStart = () => {
    if (!supported) return
    if (isListening) return
    setTranscript((t) => (t.endsWith(" ") ? t : t + " "))
    setInterim("")
    setIsListening(true)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleRestart = React.useCallback(() => {
    if (!isListening || restartingRef.current) return

    restartingRef.current = true
    setTimeout(() => {
      try {
        recognitionRef.current?.start()
      } catch (e) {
        // console.error("Error restarting recognition:", e)
      } finally {
        restartingRef.current = false
      }
    }, 100)
  }, [isListening])

  React.useEffect(() => {
    if (!isListening) {
      return
    }

    if (!recognitionRef.current) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) return

      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.lang = LANG_MAP[lang]?.code ?? "en-US"

      recognition.audio = {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      }

      recognition.onresult = (event: any) => {
        let interimChunk = ""
        let finalChunk = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          const text = (res[0]?.transcript || "") + " "
          if (res.isFinal) finalChunk += text
          else interimChunk += text
        }
        if (finalChunk.trim()) {
          setTranscript((prev) => (prev + finalChunk).replace(/\s+/g, " "))
        }
        setInterim(interimChunk)
      }

      recognitionRef.current = recognition
    }

    const recognition = recognitionRef.current
    recognition.lang = LANG_MAP[lang]?.code ?? "en-US"

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "network" || event.error === "aborted") {
        handleRestart()
      }
    }

    recognition.onend = () => {
      if (isListening) {
        handleRestart()
      }
    }

    try {
      recognition.start()
    } catch {}
  }, [isListening, lang, handleRestart])

  const handleStop = () => {
    setIsListening(false)
    setInterim("")
    try {
      recognitionRef.current?.stop?.()
    } catch {}
  }

  const handleToggle = () => {
    if (isListening) handleStop()
    else handleStart()
  }

  const handleClear = () => {
    setTranscript("")
    setInterim("")
  }

  const unsupportedMsg = "Speech recognition is not available in this browser. Try using Chrome on Android."

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("rounded-lg border border-border bg-card p-3", "flex items-center justify-between gap-2")}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              isListening ? "bg-destructive animate-pulse" : "bg-muted-foreground/40",
            )}
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-medium">{isListening ? "Listening..." : "Tap to start"}</p>
            <p className="text-muted-foreground text-xs">Language: {LANG_MAP[lang].label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className={cn(
              "rounded-md border border-input bg-background px-3 py-2.5 text-sm h-11 min-w-[120px]",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            value={lang}
            onChange={(e) => setLang(e.target.value as LangKey)}
            aria-label="Select language"
            disabled={isListening}
          >
            {Object.entries(LANG_MAP).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          <Button
            onClick={handleToggle}
            className="h-11 min-w-28 px-5"
            variant={isListening ? "destructive" : "default"}
            aria-pressed={isListening}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? "Stop" : "Start"}
          </Button>
        </div>
      </div>

      {LANG_MAP[lang].hint ? <p className="text-xs text-muted-foreground">{LANG_MAP[lang].hint}</p> : null}

      {supported === false && (
        <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
          {unsupportedMsg}
        </div>
      )}

      <div
        className={cn("rounded-lg border border-border bg-card p-4", "min-h-[50dvh] md:min-h-[30dvh] overflow-auto")}
        role="region"
        aria-live="polite"
        aria-label="Transcription"
        ref={transcriptBoxRef}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {transcript}
          <span className="opacity-60">{interim}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleClear} className="h-10 px-4">
          Clear
        </Button>

      </div>
    </div>
  )
}
