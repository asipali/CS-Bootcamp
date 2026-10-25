import { describe, it, expect } from "vitest";
import {
  CaesarCipherTS,
  SubstitutionCipherTS,
  ShuffleCipherTS,
  calculateFrequency,
} from "@/lib/crypto/classical";
import { CHARSET, CHARSET_LENGTH } from "@/lib/crypto/constants";

describe("TypeScript Classical Ciphers & Frequency Analysis (Module A)", () => {
  it("should perform Caesar rotational encryption and decryption", () => {
    const cipher = new CaesarCipherTS(5);
    const text = "ATTACK AT DAWN 2026!";
    const encrypted = cipher.encrypt(text);
    expect(encrypted).not.toBe(text);
    expect(cipher.decrypt(encrypted)).toBe(text);
  });

  it("should generate transformation steps for visualizer", () => {
    const cipher = new CaesarCipherTS(2);
    const steps = cipher.getTransformationSteps("AB");
    expect(steps.length).toBe(2);
    expect(steps[0].inputChar).toBe("A");
    expect(steps[0].outputChar).toBe(cipher.encrypt("A"));
  });

  it("should validate and execute Random Substitution cipher", () => {
    const key = SubstitutionCipherTS.generateRandomKey();
    expect(key.length).toBe(CHARSET_LENGTH);

    const cipher = new SubstitutionCipherTS(key);
    const text = "Secret Intelligence Payload 12345.";
    const encrypted = cipher.encrypt(text);
    expect(encrypted).not.toBe(text);
    expect(cipher.decrypt(encrypted)).toBe(text);
  });

  it("should reject invalid substitution keys with duplicate characters", () => {
    const badKey = CHARSET.slice(0, -1) + CHARSET[0];
    expect(() => new SubstitutionCipherTS(badKey)).toThrow(/duplicate/i);
  });

  it("should perform Shuffle Transposition encryption and decryption", () => {
    const cipher = new ShuffleCipherTS();
    const text = "HELLO";
    const key = [2, 0, 4, 1, 3];
    const encrypted = cipher.encrypt(text, key);
    expect(cipher.decrypt(encrypted, key)).toBe(text);
  });

  it("should reject invalid shuffle keys with out-of-range indices", () => {
    expect(() => ShuffleCipherTS.parseKey([0, 1, 99], 3)).toThrow(/out of range/i);
  });

  it("should compute character frequencies and Shannon entropy", () => {
    const text = "AAAAABBBCC";
    const { frequencies, entropy } = calculateFrequency(text);
    expect(frequencies[0].char).toBe("A");
    expect(frequencies[0].count).toBe(5);
    expect(frequencies[0].frequency).toBe(0.5);
    expect(entropy).toBeGreaterThan(0);
  });
});
