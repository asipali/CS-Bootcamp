import { describe, it, expect } from "vitest";
import { encryptFileClientSide, decryptFileClientSide } from "@/lib/crypto/web-crypto";
import { serializeContainer, deserializeContainer } from "@/lib/crypto/container";
import { MAGIC_BYTES, FORMAT_VERSION } from "@/lib/crypto/constants";

describe("Web Crypto API AES-256-GCM Engine", () => {
  const masterPassword = "TestMasterPassword#2026!";

  it("should encrypt and decrypt arbitrary binary bytes accurately", async () => {
    // 32 KB simulated binary data
    const originalBytes = new Uint8Array(1024 * 32);
    for (let i = 0; i < originalBytes.length; i++) {
      originalBytes[i] = i % 256;
    }

    const containerBytes = await encryptFileClientSide(originalBytes, masterPassword);
    expect(containerBytes.length).toBeGreaterThan(originalBytes.length);

    // Verify container header
    const decoded = deserializeContainer(containerBytes);
    expect(decoded.version).toBe(FORMAT_VERSION);
    expect(decoded.salt.length).toBe(16);
    expect(decoded.wrappedFek.length).toBe(40);
    expect(decoded.nonce.length).toBe(12);
    expect(decoded.authTag.length).toBe(16);

    const decryptedBytes = await decryptFileClientSide(containerBytes, masterPassword);
    expect(decryptedBytes).toEqual(originalBytes);
  });

  it("should handle empty (0-byte) file payload", async () => {
    const emptyBytes = new Uint8Array(0);
    const container = await encryptFileClientSide(emptyBytes, masterPassword);
    const decrypted = await decryptFileClientSide(container, masterPassword);
    expect(decrypted.length).toBe(0);
  });

  it("should fail decryption when given an incorrect master password", async () => {
    const data = new TextEncoder().encode("Highly sensitive confidential document.");
    const container = await encryptFileClientSide(data, "CorrectPassword123");

    await expect(
      decryptFileClientSide(container, "WrongPassword456")
    ).rejects.toThrow(/Decryption failed/i);
  });

  it("should reject tampered ciphertext via authentication tag check", async () => {
    const data = new TextEncoder().encode("Wire transfer: $50,000 to Account X");
    const container = await encryptFileClientSide(data, masterPassword);

    // Flip 1 byte in the ciphertext payload (after the 93-byte header)
    const tampered = new Uint8Array(container);
    tampered[95] ^= 0x01;

    await expect(
      decryptFileClientSide(tampered, masterPassword)
    ).rejects.toThrow(/Authentication tag verification failed/i);
  });

  it("should reject tampered authentication tag", async () => {
    const data = new TextEncoder().encode("Critical system command: EXEC");
    const container = await encryptFileClientSide(data, masterPassword);

    // Auth tag is located at bytes 77..93
    const tampered = new Uint8Array(container);
    tampered[80] ^= 0xff;

    await expect(
      decryptFileClientSide(tampered, masterPassword)
    ).rejects.toThrow(/Authentication tag verification failed/i);
  });

  it("should reject truncated container files", async () => {
    const truncated = new Uint8Array([0x43, 0x56, 0x4c, 0x54, 0x01]); // 5 bytes < 93 bytes
    expect(() => deserializeContainer(truncated)).toThrow(/Container truncated/i);
  });

  it("should reject containers with invalid magic bytes", async () => {
    const invalidMagic = new Uint8Array(95);
    invalidMagic.set(new TextEncoder().encode("BAAD"), 0);
    expect(() => deserializeContainer(invalidMagic)).toThrow(/Invalid container magic/i);
  });
});
