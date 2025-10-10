// Utilities for normalizing and fuzzy-matching Punjabi (Gurmukhi) strings

export function normalizeGurmukhi(input: string): string {
  return input
    .replace(/[੦-੯0-9,।]/g, "") // Gurmukhi/Latin digits, comma, and danda
    .replace(/[.:;?!'"`~@#$%^&*()_+=<>|{}[\]\-\\/]/g, "") // Common punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function normalizeHindi(input: string): string {
  return input
    .replace(/[०-९0-9,।]/g, "") // Devanagari digits, latin digits, comma, and danda
    .replace(/[.:;?!'"`~@#$%^&*()_+=<>|{}[\]\-\\/]/g, "") // Common punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

// Simple Levenshtein-based similarity ratio
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1
  const dist = editDistance(a, b)
  return 1 - dist / Math.max(a.length, b.length, 1)
}

export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(
        dp[j] + 1, // deletion
        dp[j - 1] + 1, // insertion
        prev + cost, // substitution
      )
      prev = tmp
    }
  }
  return dp[n]
}

export function findBestMatch(
  lines: string[],
  rawInput: string,
  normalizeFn: (input: string) => string,
): {
  index: number
  score: number
  prev: number | null
  next: number | null
} {
  const normalizedInput = normalizeFn(rawInput)
  const scores = lines.map((l) => similarity(normalizeFn(l), normalizedInput))
  let bestIdx = 0
  let bestScore = -1
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i]
      bestIdx = i
    }
  }
  return {
    index: bestIdx,
    score: bestScore,
    prev: bestIdx > 0 ? bestIdx - 1 : null,
    next: bestIdx < lines.length - 1 ? bestIdx + 1 : null,
  }
}
