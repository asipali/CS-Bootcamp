import { DEFAULT_KDF_ITERATIONS, FORMAT_VERSION } from "./constants";
import { serializeContainer, deserializeContainer } from "./container";

/**
 * Universal crypto provider (works in both Browser window.crypto and Node.js globalThis.crypto).
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (SubtleCrypto) is not available in this environment.");
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto.getRandomValues(array);
  }
  throw new Error("crypto.getRandomValues is not available.");
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) suitable for AES-KW wrapping.
 */
async function deriveKek(
  subtle: SubtleCrypto,
  masterPassword: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * Client-Side File Encryption via Web Crypto API.
 * Encrypts arbitrary binary file bytes and packages them into a versioned .cvault container.
 */
export async function encryptFileClientSide(
  fileBytes: Uint8Array,
  masterPassword: string,
  iterations: number = DEFAULT_KDF_ITERATIONS
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();

  // 1. Generate 16-byte random salt
  const salt = getRandomValues(new Uint8Array(16));

  // 2. Derive 256-bit KEK
  const kek = await deriveKek(subtle, masterPassword, salt, iterations);

  // 3. Generate ephemeral 256-bit File Encryption Key (FEK)
  const fek = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 4. Wrap FEK with KEK using AES-KW (produces 40-byte wrapped key)
  const wrappedFekBuffer = await subtle.wrapKey("raw", fek, kek, "AES-KW");
  const wrappedFek = new Uint8Array(wrappedFekBuffer);

  // 5. Generate 12-byte unique IV (96-bit nonce)
  const nonce = getRandomValues(new Uint8Array(12));

  // 6. Additional Authenticated Data (AAD)
  const aad = new Uint8Array(4 + 1 + 16);
  new TextEncoder().encodeInto("CVLT", aad);
  aad[4] = FORMAT_VERSION;
  aad.set(salt, 5);

  // 7. AES-256-GCM Encryption
  // SubtleCrypto appends the 16-byte authentication tag to the returned ciphertext ArrayBuffer
  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128,
    },
    fek,
    fileBytes as unknown as BufferSource
  );

  const fullEncryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = fullEncryptedBytes.slice(0, fullEncryptedBytes.length - 16);
  const authTag = fullEncryptedBytes.slice(fullEncryptedBytes.length - 16);

  // 8. Serialize into .cvault container
  return serializeContainer(salt, iterations, wrappedFek, nonce, authTag, ciphertext);
}

/**
 * Client-Side File Decryption via Web Crypto API.
 * Verifies authenticity, unwraps FEK, and recovers original plaintext file bytes.
 * Throws on incorrect password or modified ciphertext.
 */
export async function decryptFileClientSide(
  containerBytes: Uint8Array,
  masterPassword: string
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();

  // 1. Unpack container
  const container = deserializeContainer(containerBytes);

  // 2. Derive KEK
  const kek = await deriveKek(subtle, masterPassword, container.salt, container.iterations);

  // 3. Unwrap FEK using AES-KW
  let fek: CryptoKey;
  try {
    fek = await subtle.unwrapKey(
      "raw",
      container.wrappedFek as unknown as BufferSource,
      kek,
      "AES-KW",
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  } catch {
    throw new Error("Decryption failed: Incorrect master password or corrupted key envelope.");
  }

  // 4. Reconstruct AAD
  const aad = new Uint8Array(4 + 1 + 16);
  new TextEncoder().encodeInto("CVLT", aad);
  aad[4] = container.version;
  aad.set(container.salt, 5);

  // 5. Reassemble ciphertext + tag for SubtleCrypto
  const fullPayload = new Uint8Array(container.ciphertext.length + container.authTag.length);
  fullPayload.set(container.ciphertext, 0);
  fullPayload.set(container.authTag, container.ciphertext.length);

  // 6. Authenticated AES-GCM Decryption
  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: container.nonce as unknown as BufferSource,
        additionalData: aad as unknown as BufferSource,
        tagLength: 128,
      },
      fek,
      fullPayload as unknown as BufferSource
    );
    return new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error(
      "Decryption failed: Authentication tag verification failed. Ciphertext has been modified or corrupted."
    );
  }
}

/**
 * Inspects decrypted plaintext bytes to detect common MIME types and suggested file extensions.
 */
export function inferMimeTypeAndExtension(
  data: Uint8Array,
  fallbackBaseName: string = "decrypted_file"
): { mimeType: string; suggestedName: string } {
  // Strip .cvault if present on the base name
  let cleanName = fallbackBaseName;
  if (cleanName.toLowerCase().endsWith(".cvault")) {
    cleanName = cleanName.slice(0, -7);
  }

  // If already has a valid dot extension (e.g. sample.pdf), preserve it
  if (cleanName.includes(".") && !cleanName.endsWith(".")) {
    return { mimeType: "application/octet-stream", suggestedName: cleanName };
  }

  // 1. PDF signature (%PDF-)
  if (
    data.length >= 4 &&
    data[0] === 0x25 &&
    data[1] === 0x50 &&
    data[2] === 0x44 &&
    data[3] === 0x46
  ) {
    return { mimeType: "application/pdf", suggestedName: `${cleanName}.pdf` };
  }

  // 2. PNG signature (\x89PNG)
  if (
    data.length >= 4 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return { mimeType: "image/png", suggestedName: `${cleanName}.png` };
  }

  // 3. JPEG signature (0xFF 0xD8 0xFF)
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { mimeType: "image/jpeg", suggestedName: `${cleanName}.jpg` };
  }

  // 4. ZIP / DOCX signature (PK\x03\x04)
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    return { mimeType: "application/zip", suggestedName: `${cleanName}.zip` };
  }

  // 5. UTF-8 Plaintext probe
  let isText = true;
  for (let i = 0; i < Math.min(data.length, 512); i++) {
    const byte = data[i];
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte === 0x7f) {
      isText = false;
      break;
    }
  }
  if (isText && data.length > 0) {
    return { mimeType: "text/plain", suggestedName: `${cleanName}.txt` };
  }

  return { mimeType: "application/octet-stream", suggestedName: `${cleanName}.bin` };
}

