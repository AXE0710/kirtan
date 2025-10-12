"use client"

import React from "react"

export function MicLevelMeter() {
  const [active, setActive] = React.useState(false)
  const [level, setLevel] = React.useState(0) // 0-100
  const [supported, setSupported] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const srcRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const dataRef = React.useRef<Uint8Array | null>(null)

  const stopMeter = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (srcRef.current) {
      try {
        srcRef.current.disconnect()
      } catch {}
      srcRef.current = null
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect()
      } catch {}
      analyserRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const loop = React.useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const bufferLength = analyser.fftSize
    if (!dataRef.current || dataRef.current.length !== bufferLength) {
      dataRef.current = new Uint8Array(bufferLength)
    }
    const data = dataRef.current!
    analyser.getByteTimeDomainData(data)

    // Compute RMS around 128 center to estimate amplitude
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      const v = (data[i] - 128) / 128 // -1..1
      sum += v * v
    }
    const rms = Math.sqrt(sum / bufferLength) // 0..~1
    // Convert to percentage, clamp, add slight smoothing
    const pct = Math.min(100, Math.max(0, Math.round(rms * 160))) // tuned factor
    setLevel((prev) => Math.round(prev * 0.75 + pct * 0.25))

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const startMeter = React.useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      streamRef.current = stream

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const src = ctx.createMediaStreamSource(stream)
      srcRef.current = src

      src.connect(analyser)

      if (ctx.state === "suspended") {
        await ctx.resume()
      }

      rafRef.current = requestAnimationFrame(loop)
      setActive(true)
    } catch (e: any) {
      setError(e?.message || "Unable to access microphone.")
      stopMeter()
      setActive(false)
    }
  }, [loop, stopMeter])

  const handleToggle = async () => {
    if (active) {
      stopMeter()
      setActive(false)
      setLevel(0)
    } else {
      await startMeter()
    }
  }

  React.useEffect(() => {
    return () => {
      // cleanup on unmount
      stopMeter()
    }
  }, [stopMeter])

  React.useEffect(() => {
    const isSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    setSupported(isSupported)
  }, [])

  return (
    <section className="w-full max-w-xl mx-auto rounded-[var(--radius)] border border-border bg-card p-4 md:p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-medium text-foreground text-pretty">Mic level</h2>
        <button
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center justify-center rounded-[calc(var(--radius)-2px)] px-4 py-3 text-sm font-medium transition-colors ${
            active ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
          }`}
          aria-pressed={active}
        >
          {active ? "Stop" : "Start"}
        </button>
      </header>

      {!supported ? (
        <p className="text-sm text-muted-foreground">
          Microphone level not supported in this browser. Try Chrome on Android.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={level}
            aria-label="Current microphone level"
            className="w-full h-5 md:h-6 rounded-full bg-muted relative overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Level: <span className="tabular-nums">{level}%</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default MicLevelMeter
