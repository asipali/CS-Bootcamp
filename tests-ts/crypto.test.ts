import { describe, it, expect } from "vitest";
import {
  encryptFileClientSide,
  decryptFileClientSide,
  inferMimeTypeAndExtension,
} from "@/lib/crypto/web-crypto";
import {
  serializeContainer,
  deserializeContainer,
  inspectContainer,
} from "@/lib/crypto/container";
import { MAGIC_BYTES, FORMAT_VERSION } from "@/lib/crypto/constants";

describe("Web Crypto API AES-256-GCM Engine & Portable File Sharing", () => {
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

  it("should handle multi-format file payloads: TXT, PDF, PNG, DOCX, BIN, and empty files", async () => {
    const formats = [
      { name: "sample.txt", data: new TextEncoder().encode("Hello, World! This is plaintext.") },
      { name: "sample.pdf", data: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25]) },
      { name: "sample.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]) },
      { name: "sample.docx", data: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]) },
      { name: "empty.bin", data: new Uint8Array(0) },
    ];

    for (const f of formats) {
      const password = `FormatPass_${f.name}_2026!`;
      const container = await encryptFileClientSide(f.data, password);
      expect(container.length).toBe(93 + f.data.length);

      const decrypted = await decryptFileClientSide(container, password);
      expect(decrypted).toEqual(f.data);

      const { suggestedName } = inferMimeTypeAndExtension(decrypted, `${f.name}.cvault`);
      expect(suggestedName).toBe(f.name);
    }
  });

  it("should generate fresh cryptographic nonces, salts, and wrapped keys on repeated encryptions", async () => {
    const payload = new TextEncoder().encode("Static text payload encrypted twice.");
    const c1 = await encryptFileClientSide(payload, masterPassword);
    const c2 = await encryptFileClientSide(payload, masterPassword);

    const d1 = deserializeContainer(c1);
    const d2 = deserializeContainer(c2);

    // Fresh CSPRNG salt
    expect(d1.salt).not.toEqual(d2.salt);
    // Fresh CSPRNG nonce
    expect(d1.nonce).not.toEqual(d2.nonce);
    // Unique wrapped FEK
    expect(d1.wrappedFek).not.toEqual(d2.wrappedFek);
    // Unique ciphertext due to unique FEK + IV
    expect(d1.ciphertext).not.toEqual(d2.ciphertext);
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

  it("should reject tampered nonce IV", async () => {
    const data = new TextEncoder().encode("System integrity report");
    const container = await encryptFileClientSide(data, masterPassword);

    // Nonce is located at bytes 65..77
    const tampered = new Uint8Array(container);
    tampered[68] ^= 0x55;

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

  it("should inspect valid and invalid containers gracefully without throwing", async () => {
    const data = new TextEncoder().encode("Inspected container content");
    const container = await encryptFileClientSide(data, masterPassword);

    const validInsp = inspectContainer(container);
    expect(validInsp.isValid).toBe(true);
    expect(validInsp.version).toBe(1);
    expect(validInsp.algorithm).toContain("AES-256-GCM");
    expect(validInsp.kdfAlgorithm).toContain("PBKDF2");
    expect(validInsp.iterations).toBe(600000);
    expect(validInsp.ciphertextSize).toBe(data.length);
    expect(validInsp.totalSize).toBe(container.length);

    // Test corrupted signature
    const corruptMagic = new Uint8Array(container);
    corruptMagic[0] = 0x58; // 'X'
    const invalidInsp = inspectContainer(corruptMagic);
    expect(invalidInsp.isValid).toBe(false);
    expect(invalidInsp.error).toContain("Invalid container signature");

    // Test too short
    const shortInsp = inspectContainer(new Uint8Array(50));
    expect(shortInsp.isValid).toBe(false);
    expect(shortInsp.error).toContain("too small");
  });

  it("should support end-to-end portable file transfer between isolated users", async () => {
    // 1. User A (Sender) encrypts a confidential PDF offline
    const confidentialPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0xde, 0xad, 0xbe, 0xef]);
    const sharedPassword = "SuperSecretTransferPass#2026!";

    const portableContainer = await encryptFileClientSide(confidentialPdf, sharedPassword);
    expect(portableContainer.length).toBe(93 + confidentialPdf.length);

    // 2. User B (Recipient) receives the .cvault file independently
    // Simulating completely separate session: recipient does NOT have access to User A's session, DB, or keys
    const recipientInspection = inspectContainer(portableContainer);
    expect(recipientInspection.isValid).toBe(true);
    expect(recipientInspection.algorithm).toBe("AES-256-GCM (NIST SP 800-38D)");

    // User B enters the shared password
    const recoveredBytes = await decryptFileClientSide(portableContainer, sharedPassword);
    expect(recoveredBytes).toEqual(confidentialPdf);

    // User B tries wrong password -> fails safely
    await expect(
      decryptFileClientSide(portableContainer, "WrongPassword!")
    ).rejects.toThrow(/Decryption failed/i);
  });
});
