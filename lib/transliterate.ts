const consonants: Record<string, string> = {
  ਕ: "k",
  ਖ: "kh",
  ਗ: "g",
  ਘ: "gh",
  ਙ: "ṅ",
  ਚ: "ch",
  ਛ: "chh",
  ਜ: "j",
  ਝ: "jh",
  ਞ: "ñ",
  ਟ: "ṭ",
  ਠ: "ṭh",
  ਡ: "ḍ",
  ਢ: "ḍh",
  ਣ: "ṇ",
  ਤ: "t",
  ਥ: "th",
  ਦ: "d",
  ਧ: "dh",
  ਨ: "n",
  ਪ: "p",
  ਫ: "ph",
  ਬ: "b",
  ਭ: "bh",
  ਮ: "m",
  ਯ: "y",
  ਰ: "r",
  ਲ: "l",
  ਵ: "v",
  ਸ਼: "sh",
  ਸ: "s",
  ਹ: "h",
  ਖ਼: "kh",
  ਗ਼: "gh",
  ਜ਼: "z",
  ਫ਼: "f",
  ੜ: "ṛ",
  ਲ਼: "ḷ",
}

const vowelsIndependent: Record<string, string> = {
  ਅ: "a",
  ਆ: "ā",
  ਇ: "i",
  ਈ: "ī",
  ਉ: "u",
  ਊ: "ū",
  ਏ: "e",
  ਐ: "ai",
  ਓ: "o",
  ਔ: "au",
}

const matras: Record<string, string> = {
  "ਾ": "ā",
  "ਿ": "i",
  "ੀ": "ī",
  "ੁ": "u",
  "ੂ": "ū",
  "ੇ": "e",
  "ੈ": "ai",
  "ੋ": "o",
  "ੌ": "au",
}

const VIRAMA = "੍"
const BINDI = "ਂ" // nasalization dot
const TIPPI = "ੰ" // nasalization sign
const CANDRA = "ਁ" // candrabindu-like nasalization

function isGurmukhiChar(ch: string) {
  const code = ch.codePointAt(0)!
  return code >= 0x0a00 && code <= 0x0a7f
}

export function transliterateGurmukhiToLatin(input: string): string {
  if (!/[\u0A00-\u0A7F]/.test(input)) {
    // No Gurmukhi found; return as-is.
    return input
  }

  const out: string[] = []
  // We keep track if the last token had an inherent 'a' to replace with a matra.
  let lastHadInherentAIndex: number | null = null

  const pushToken = (token: string, hasInherentA: boolean) => {
    out.push(token)
    lastHadInherentAIndex = hasInherentA ? out.length - 1 : null
  }

  const replaceInherentWith = (vowel: string) => {
    if (lastHadInherentAIndex === null) {
      // No inherent 'a' to replace, just append the vowel
      out.push(vowel)
      return
    }
    const prev = out[lastHadInherentAIndex]
    if (prev.endsWith("a")) {
      out[lastHadInherentAIndex] = prev.slice(0, -1) + vowel
    } else {
      out[lastHadInherentAIndex] = prev + vowel
    }
    // After applying a matra, no more inherent 'a' remains.
    lastHadInherentAIndex = null
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    // Preserve whitespace & punctuation
    if (!isGurmukhiChar(ch)) {
      out.push(ch)
      lastHadInherentAIndex = null
      continue
    }

    // Independent vowels
    if (ch in vowelsIndependent) {
      pushToken(vowelsIndependent[ch], false)
      continue
    }

    // Consonants (with inherent 'a')
    if (ch in consonants) {
      pushToken(consonants[ch] + "a", true)
      continue
    }

    // Matras (vowel signs)
    if (ch in matras) {
      replaceInherentWith(matras[ch])
      continue
    }

    // Halant/virama — remove the inherent 'a'
    if (ch === VIRAMA) {
      if (lastHadInherentAIndex !== null) {
        const prev = out[lastHadInherentAIndex]
        if (prev.endsWith("a")) {
          out[lastHadInherentAIndex] = prev.slice(0, -1)
        }
      }
      lastHadInherentAIndex = null
      continue
    }

    // Nasalization marks
    if (ch === BINDI || ch === TIPPI || ch === CANDRA) {
      // Append nasal sound to the previous token
      if (out.length > 0) {
        out[out.length - 1] += "ṅ"
      } else {
        out.push("ṅ")
      }
      lastHadInherentAIndex = null
      continue
    }

    // Default: pass-through unknown chars
    out.push(ch)
    lastHadInherentAIndex = null
  }

  return out.join("").replace(/\s+/g, " ").trim()
}
