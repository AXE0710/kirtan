"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { cn } from "@/lib/utils"
import { transliterateGurmukhiToLatin } from "@/lib/transliterate"
import { Switch } from "@/components/ui/switch"
import { HINDI_SONG, SHABAD_LINES } from "@/data/shabad-kirtan"
import { findBestMatch, normalizeGurmukhi, normalizeHindi } from "@/lib/string-similarity"
import { useAudioLevel } from "@/hooks/use-audio-level"

const LANG_OPTIONS = [
  { label: "Punjabi (India) — pa-IN", value: "pa-IN" },
  { label: "Hindi (India) — hi-IN", value: "hi-IN" },
  { label: "English (India) — en-IN", value: "en-IN" },
  { label: "English (US) — en-US", value: "en-US" },
]

function limitTail(text: string, max = 500) {
  if (!text) return ""
  return text.length > max ? text.slice(-max) : text
}

function extractRecentSnippet(fullText: string, interim: string) {
  // Prefer the freshest speech (interim). If not available, use most recent sentence or tail.
  const interimTrimmed = interim?.trim()
  if (interimTrimmed) return interimTrimmed

  // Split on danda/double-danda or newlines to isolate latest phrase
  const parts = (fullText || "").split(/[\u0964\u0965\n]+/) // \u0964 = ।, \u0965 = ॥
  const last = (parts[parts.length - 1] || "").trim()

  // Keep the last ~140 chars to avoid bias from earlier lines
  const MAX_SNIPPET = 140
  return last.length > MAX_SNIPPET ? last.slice(-MAX_SNIPPET) : last
}

export default function VoiceRecognizer() {
  const [lang, setLang] = useState<string>(LANG_OPTIONS[0].value)
  const [guided, setGuided] = useState<boolean>(false)
  const [matchSnippet, setMatchSnippet] = useState<string>("")

  const { supported, listening, transcript, interim, error, start, stop, clear, setRecognitionLang } =
    useSpeechRecognition(lang, {
      onFinal: () => {
        // After a final phrase completes, reset the matching buffer so next line starts fresh
        setMatchSnippet("")
      },
    })

  const { supported: micSupported, level: micLevel, start: startMic, stop: stopMic, clear: clearMic } = useAudioLevel()

  function handleLangChange(next: string) {
    setLang(next)
    setRecognitionLang(next)
  }

  const fullTextRaw = (transcript + (interim ? (transcript ? " " : "") + interim : "")).trim()
  const fullText = limitTail(fullTextRaw, 500)

  const isPunjabi = lang.startsWith("pa")
  const isHindi = lang.startsWith("hi")
  const englishLetters = isPunjabi ? transliterateGurmukhiToLatin(fullText) : fullText

  // Whenever interim changes, update matchSnippet to the freshest live speech
  // This ensures that once a phrase finalizes (and onFinal clears), we only match on new incoming speech
  if (interim && interim.trim() !== matchSnippet) {
    setMatchSnippet(interim.trim())
  }

  // Use only matchSnippet for guided matching (no fallback to historical transcript)
  const snippet = matchSnippet

  const bestPunjabiMatch = useMemo(() => {
    if (!guided || !isPunjabi || !snippet) return null
    return findBestMatch(SHABAD_LINES, snippet, normalizeGurmukhi)
  }, [guided, isPunjabi, snippet])

  const bestHindiMatch = useMemo(() => {
    if (!guided || !isHindi || !snippet) return null
    return findBestMatch(HINDI_SONG, snippet, normalizeHindi)
  }, [guided, isHindi, snippet])

  if (!supported) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <p className="text-sm">
            Your browser does not support the Web Speech API for speech recognition. Please try Chrome on desktop or
            Android. iOS Safari does not currently support this feature.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={cn("inline-block h-3 w-3 rounded-full", listening ? "bg-green-500" : "bg-muted-foreground/30")}
            aria-hidden
          />
          <span className="text-sm">{listening ? "Listening..." : "Idle"}</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="lang" className="text-sm font-medium">
            Language
          </label>
          <select
            id="lang"
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* <div className="flex items-center gap-2">
          <Switch id="guided" checked={guided} onCheckedChange={setGuided} />
          <label htmlFor="guided" className="text-sm">
            Guided lyrics Matching
          </label>
        </div> */}

        <div className="ml-auto flex items-center gap-2">
          {!listening ? (
            <Button
              onClick={() => {
                start()
                startMic()
              }}
              aria-label="Start listening"
            >
              Start
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                stop()
                stopMic()
              }}
              aria-label="Stop listening"
            >
              Stop
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              clear()
              clearMic()
              setMatchSnippet("")
            }}
            aria-label="Clear all"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isPunjabi ? (
          <>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Punjabi (Gurmukhi)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Live transcript in Punjabi script.</p>
              <div
                aria-live="polite"
                aria-atomic="false"
                className="min-h-24 whitespace-pre-wrap leading-relaxed mt-2"
              >
                {fullText ? (
                  <span>{fullText}</span>
                ) : (
                  <span className="text-muted-foreground">Your Punjabi words will appear here…</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium">English letters</p>
              <p className="text-xs text-muted-foreground mt-1">
                Romanized output. For best results, use Punjabi (pa-IN).
              </p>
              <div
                aria-live="polite"
                aria-atomic="false"
                className="min-h-24 whitespace-pre-wrap leading-relaxed mt-2"
              >
                {englishLetters ? (
                  <span>{englishLetters}</span>
                ) : (
                  <span className="text-muted-foreground">English letters will appear here…</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border p-4 md:col-span-2">
            <p className="font-medium">Recognized Text</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isHindi ? "Live transcript in Hindi script." : "Live transcript."}
            </p>
            <div aria-live="polite" aria-atomic="false" className="min-h-24 whitespace-pre-wrap leading-relaxed mt-2">
              {fullText ? <span>{fullText}</span> : <span className="text-muted-foreground">Words will appear here…</span>}
            </div>
          </div>
        )}
      </div>

      {guided ? (
        <div className="rounded-lg border p-4">
          {isPunjabi ? (
            <>
              <p className="font-medium">Closest Shabad Line</p>
              <p className="text-xs text-muted-foreground mt-1">
                Matching resets after each final phrase. Only fresh words are used to find the closest line.
              </p>

              <div className="mt-2 text-xs text-muted-foreground">
                Matching snippet: <span className="text-foreground">{snippet || "—"}</span>
              </div>

              <div className="mt-3 space-y-2">
                {bestPunjabiMatch ? (
                  <>
                    <div>
                      <div className="text-sm">Punjabi (Gurmukhi)</div>
                      <div className="mt-1 leading-relaxed">{SHABAD_LINES[bestPunjabiMatch.index]}</div>
                    </div>
                    <div>
                      <div className="text-sm">English letters</div>
                      <div className="mt-1 leading-relaxed">
                        {transliterateGurmukhiToLatin(SHABAD_LINES[bestPunjabiMatch.index])}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(bestPunjabiMatch.score * 100).toFixed(0)}%
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {bestPunjabiMatch.prev !== null ? (
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground mb-1">Previous</div>
                          <div className="text-sm">{SHABAD_LINES[bestPunjabiMatch.prev]}</div>
                        </div>
                      ) : null}
                      {bestPunjabiMatch.next !== null ? (
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground mb-1">Next</div>
                          <div className="text-sm">{SHABAD_LINES[bestPunjabiMatch.next]}</div>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Start singing in Punjabi (pa-IN) to see the closest line…
                  </div>
                )}
              </div>
            </>
          ) : isHindi ? (
            <>
              <p className="font-medium">Closest Song Line</p>
              <p className="text-xs text-muted-foreground mt-1">
                Matching resets after each final phrase. Only fresh words are used to find the closest line.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Matching snippet: <span className="text-foreground">{snippet || "—"}</span>
              </div>
              <div className="mt-3 space-y-2">
                {bestHindiMatch ? (
                  <>
                    <div className="mt-1 leading-relaxed">{HINDI_SONG[bestHindiMatch.index]}</div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(bestHindiMatch.score * 100).toFixed(0)}%
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Start singing in Hindi (hi-IN) to see the closest line…
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{error}</div>
      ) : null}

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Voice level</p>
          {!micSupported ? (
            <span className="text-xs text-muted-foreground">Mic meter not supported in this browser</span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Live microphone level (use this to gauge input loudness; green bar should move while you sing).
        </p>

        {/* Accessible meter */}
        <div className="mt-3">
          {micSupported ? (
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((micLevel || 0) * 100)}
              aria-label="Voice input level"
              className="w-full rounded-md border border-border bg-muted p-1"
            >
              <div
                className="h-2 rounded bg-primary transition-[width] duration-100 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, Math.round((micLevel || 0) * 100)))}%` }}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Not available</div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">{`Level: ${Math.round((micLevel || 0) * 100)}%`}</div>
        </div>
      </div>

      <div className="flex items-center justify-center mt-4">
        <p className="text-sm">Mic Level: {micLevel.toFixed(2)}</p>
      </div>
    </div>
  )
}

export { VoiceRecognizer }
