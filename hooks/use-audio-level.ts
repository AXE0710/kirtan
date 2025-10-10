"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type UseAudioLevel = {
  supported: boolean
  level: number
  start: () => Promise<void>
  stop: () => void
  clear: () => void
}

export function useAudioLevel(): UseAudioLevel {
  const [supported, setSupported] = useState(false)
  const [level, setLevel] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const hasSupport =
      typeof window !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      (window.AudioContext || (window as any).webkitAudioContext)
    setSupported(!!hasSupport)

    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const bufferLen = analyser.fftSize
    const data = new Uint8Array(bufferLen)
    analyser.getByteTimeDomainData(data)

    // Compute RMS of time-domain data (centered at 128)
    let sumSquares = 0
    for (let i = 0; i < bufferLen; i++) {
      const v = (data[i] - 128) / 128 // normalize to -1..1
      sumSquares += v * v
    }
    const rms = Math.sqrt(sumSquares / bufferLen)

    // Light smoothing to avoid jitter
    setLevel((prev) => prev * 0.7 + rms * 0.3)

    rafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    if (!supported) return
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
        audioCtxRef.current = new Ctx()
      }

      const ctx = audioCtxRef.current
      if (!sourceRef.current && streamRef.current && ctx) {
        sourceRef.current = ctx.createMediaStreamSource(streamRef.current)
      }
      if (!analyserRef.current && ctx) {
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024 // small for responsive RMS
        analyser.smoothingTimeConstant = 0.4
        analyserRef.current = analyser
      }

      // Connect graph: mic -> analyser (no output)
      if (sourceRef.current && analyserRef.current) {
        sourceRef.current.connect(analyserRef.current)
      }

      if (ctx && ctx.state === "suspended") {
        await ctx.resume()
      }

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    } catch (_e) {
      // If permission denied or other errors, mark meter as unsupported
      setSupported(false)
    }
  }, [supported, tick])

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (sourceRef.current && analyserRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {}
    }
    analyserRef.current = null
    sourceRef.current = null

    // Do not stop stream tracks here so SpeechRecognition can continue using mic.
    // Only tear down on unmount or explicit clear if needed.
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.suspend()
      } catch {}
    }
  }, [])

  const clear = useCallback(() => {
    setLevel(0)
    // Fully tear down streams and context (optional)
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {}
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop())
      } catch {}
      streamRef.current = null
    }
  }, [])

  return { supported, level, start, stop, clear }
}
