import { CHARSET, CHARSET_LENGTH } from "./constants";

export interface TransformStep {
  index: number;
  inputChar: string;
  outputChar: string;
  origPos: number;
  newPos: number;
  supported: boolean;
}

export interface FrequencyData {
  char: string;
  count: number;
  frequency: number;
}

/**
 * Modulo-92 Caesar Rotational Cipher (TypeScript Implementation).
 */
export class CaesarCipherTS {
  private shift: number;

  constructor(shift: number = 3) {
    this.shift = ((shift % CHARSET_LENGTH) + CHARSET_LENGTH) % CHARSET_LENGTH;
  }

  encrypt(text: string): string {
    let result = "";
    for (const char of text) {
      const idx = CHARSET.indexOf(char);
      if (idx !== -1) {
        const newIdx = (idx + this.shift) % CHARSET_LENGTH;
        result += CHARSET[newIdx];
      } else {
        result += char; // Passthrough
      }
    }
    return result;
  }

  decrypt(text: string): string {
    let result = "";
    for (const char of text) {
      const idx = CHARSET.indexOf(char);
      if (idx !== -1) {
        const newIdx = (idx - this.shift + CHARSET_LENGTH) % CHARSET_LENGTH;
        result += CHARSET[newIdx];
      } else {
        result += char;
      }
    }
    return result;
  }

  getTransformationSteps(text: string): TransformStep[] {
    const steps: TransformStep[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const idx = CHARSET.indexOf(char);
      if (idx !== -1) {
        const newPos = (idx + this.shift) % CHARSET_LENGTH;
        steps.push({
          index: i,
          inputChar: char,
          outputChar: CHARSET[newPos],
          origPos: idx,
          newPos: newPos,
          supported: true,
        });
      } else {
        steps.push({
          index: i,
          inputChar: char,
          outputChar: char,
          origPos: -1,
          newPos: -1,
          supported: false,
        });
      }
    }
    return steps;
  }
}

/**
 * Random Substitution Cipher (TypeScript Implementation with strict key validation).
 */
export class SubstitutionCipherTS {
  public readonly key: string;
  private encryptMap: Map<string, string> = new Map();
  private decryptMap: Map<string, string> = new Map();

  constructor(key: string) {
    this.key = SubstitutionCipherTS.validateKey(key);
    for (let i = 0; i < CHARSET_LENGTH; i++) {
      this.encryptMap.set(CHARSET[i], this.key[i]);
      this.decryptMap.set(this.key[i], CHARSET[i]);
    }
  }

  static validateKey(key: string): string {
    if (typeof key !== "string") {
      throw new Error("Key must be a string.");
    }
    if (key.length !== CHARSET_LENGTH) {
      throw new Error(`Key length must be exactly ${CHARSET_LENGTH}, got ${key.length}.`);
    }
    const keySet = new Set(key);
    if (keySet.size !== CHARSET_LENGTH) {
      throw new Error(`Key contains duplicate characters.`);
    }
    for (const char of CHARSET) {
      if (!keySet.has(char)) {
        throw new Error(`Key is missing required alphabet character: '${char}'.`);
      }
    }
    return key;
  }

  static generateRandomKey(): string {
    const arr = CHARSET.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }

  encrypt(text: string): string {
    let result = "";
    for (const char of text) {
      result += this.encryptMap.get(char) ?? char;
    }
    return result;
  }

  decrypt(text: string): string {
    let result = "";
    for (const char of text) {
      result += this.decryptMap.get(char) ?? char;
    }
    return result;
  }
}

/**
 * Shuffle (Transposition) Cipher.
 */
export class ShuffleCipherTS {
  static parseKey(rawKey: string | number[], length: number): number[] {
    if (length <= 0) return [];

    let indices: number[] = [];
    if (Array.isArray(rawKey)) {
      indices = rawKey;
    } else {
      const tokens = rawKey.replace(/,/g, " ").trim().split(/\s+/);
      indices = tokens.map((t) => {
        const n = parseInt(t, 10);
        if (isNaN(n)) throw new Error(`Invalid non-integer token: '${t}'.`);
        return n;
      });
    }

    if (indices.length !== length) {
      throw new Error(`Key length mismatch: expected ${length} indices, got ${indices.length}.`);
    }

    const seen = new Set<number>();
    for (const idx of indices) {
      if (idx < 0 || idx >= length) {
        throw new Error(`Index ${idx} out of range [0, ${length - 1}].`);
      }
      if (seen.has(idx)) {
        throw new Error(`Duplicate index ${idx} in shuffle key.`);
      }
      seen.add(idx);
    }
    return indices;
  }

  static generateKey(length: number): number[] {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  encrypt(text: string, key: string | number[]): string {
    if (text.length === 0) return "";
    const parsedKey = ShuffleCipherTS.parseKey(key, text.length);
    return parsedKey.map((idx) => text[idx]).join("");
  }

  decrypt(text: string, key: string | number[]): string {
    if (text.length === 0) return "";
    const parsedKey = ShuffleCipherTS.parseKey(key, text.length);
    const result = new Array(text.length);
    parsedKey.forEach((origIdx, outIdx) => {
      result[origIdx] = text[outIdx];
    });
    return result.join("");
  }
}

/**
 * Calculates letter frequency and Shannon entropy for cryptanalysis.
 */
export function calculateFrequency(text: string): {
  frequencies: FrequencyData[];
  entropy: number;
} {
  if (!text) return { frequencies: [], entropy: 0 };

  const counts: Record<string, number> = {};
  for (const char of text) {
    counts[char] = (counts[char] || 0) + 1;
  }

  const total = text.length;
  let entropy = 0;
  const frequencies: FrequencyData[] = Object.entries(counts)
    .map(([char, count]) => {
      const p = count / total;
      entropy -= p * Math.log2(p);
      return { char, count, frequency: p };
    })
    .sort((a, b) => b.count - a.count);

  return { frequencies, entropy };
}
