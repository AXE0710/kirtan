"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type RecognitionType = typeof window extends any
  ? (window & {
      webkitSpeechRecognition?: any
      SpeechRecognition?: any
    })["SpeechRecognition"]
  : any

type RecognitionInstance = InstanceType<RecognitionType> | any

type UseSpeechOptions = {
  onFinal?: (finalText: string) => void
}

export function useSpeechRecognition(initialLang = "pa-IN", opts?: UseSpeechOptions) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  const langRef = useRef(initialLang)
  const recRef = useRef<RecognitionInstance | null>(null)
  const shouldRestartRef = useRef(false)
  const optsRef = useRef<UseSpeechOptions | undefined>(opts)
  optsRef.current = opts

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return null

    const recognition: RecognitionInstance = new SpeechRecognition()
    recognition.lang = langRef.current
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    return recognition
  }, [])

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    setSupported(!!isSupported)
    if (!isSupported) return

    recRef.current = createRecognition()

    const handleResult = (event: any) => {
      let finalText = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ""
        if (result.isFinal) {
          finalText += text + " "
        } else {
          interimText += text + " "
        }
      }

      if (finalText) {
        const trimmed = finalText.trim()
        setTranscript((prev) => (prev + " " + trimmed).trim())
        optsRef.current?.onFinal?.(trimmed)
      }
      setInterim(interimText.trim())
    }

    const handleEnd = () => {
      setInterim("")
      if (shouldRestartRef.current) {
        try {
          recRef.current?.start()
        } catch {
          // ignore restart errors
        }
      } else {
        setListening(false)
      }
    }

    const handleError = (e: any) => {
      setError(e?.error ? `${e.error}${e.message ? `: ${e.message}` : ""}` : "Recognition error")
      if (shouldRestartRef.current) {
        try {
          recRef.current?.start()
        } catch {
          // ignore
        }
      } else {
        setListening(false)
      }
    }

    if (recRef.current) {
      recRef.current.onresult = handleResult
      recRef.current.onend = handleEnd
      recRef.current.onerror = handleError
    }

    return () => {
      try {
        recRef.current?.stop()
      } catch {
        // ignore
      }
      recRef.current = null
    }
  }, [createRecognition])

  const start = useCallback(() => {
    if (!supported) return
    if (!recRef.current) recRef.current = createRecognition()
    setError(null)
    shouldRestartRef.current = true
    try {
      recRef.current.lang = langRef.current
      recRef.current.start()
      setListening(true)
    } catch (e) {
      // start can throw if already started
    }
  }, [supported, createRecognition])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    try {
      recRef.current?.stop()
    } catch {
      // ignore
    }
  }, [])

  const clear = useCallback(() => {
    setTranscript("")
    setInterim("")
    setError(null)
  }, [])

  const setRecognitionLang = useCallback((nextLang: string) => {
    langRef.current = nextLang
    if (recRef.current) {
      recRef.current.lang = nextLang
      if (shouldRestartRef.current) {
        try {
          recRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    clear,
    setRecognitionLang,
  }
}
