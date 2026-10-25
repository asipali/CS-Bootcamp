import { MAGIC_BYTES, FORMAT_VERSION, MIN_HEADER_SIZE } from "./constants";

export interface DecodedVaultContainer {
  version: number;
  salt: Uint8Array;
  iterations: number;
  wrappedFek: Uint8Array;
  nonce: Uint8Array;
  authTag: Uint8Array;
  ciphertext: Uint8Array;
}

/**
 * Serializes cryptographic components into a versioned binary .cvault container (Uint8Array).
 */
export function serializeContainer(
  salt: Uint8Array,
  iterations: number,
  wrappedFek: Uint8Array,
  nonce: Uint8Array,
  authTag: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  if (salt.length !== 16) throw new Error("Salt must be 16 bytes.");
  if (wrappedFek.length !== 40) throw new Error("Wrapped FEK must be 40 bytes.");
  if (nonce.length !== 12) throw new Error("Nonce must be 12 bytes.");
  if (authTag.length !== 16) throw new Error("Auth tag must be 16 bytes.");

  const totalLength = MIN_HEADER_SIZE + ciphertext.length;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // 1. Magic bytes "CVLT"
  const encoder = new TextEncoder();
  buffer.set(encoder.encode(MAGIC_BYTES), 0);

  // 2. Version (uint8)
  buffer[4] = FORMAT_VERSION;

  // 3. Salt (16 bytes)
  buffer.set(salt, 5);

  // 4. Iterations (uint32 big-endian)
  view.setUint32(21, iterations, false);

  // 5. Wrapped FEK (40 bytes)
  buffer.set(wrappedFek, 25);

  // 6. Nonce (12 bytes)
  buffer.set(nonce, 65);

  // 7. Auth Tag (16 bytes)
  buffer.set(authTag, 77);

  // 8. Ciphertext
  buffer.set(ciphertext, 93);

  return buffer;
}

/**
 * Deserializes and validates a binary .cvault container.
 */
export function deserializeContainer(data: Uint8Array): DecodedVaultContainer {
  if (data.length < MIN_HEADER_SIZE) {
    throw new Error(
      `Container truncated: length is ${data.length} bytes, expected at least ${MIN_HEADER_SIZE} bytes.`
    );
  }

  // Check magic bytes
  const magic = new TextDecoder().decode(data.slice(0, 4));
  if (magic !== MAGIC_BYTES) {
    throw new Error(`Invalid container magic: expected '${MAGIC_BYTES}', got '${magic}'.`);
  }

  // Check version
  const version = data[4];
  if (version !== FORMAT_VERSION) {
    throw new Error(`Unsupported container version: ${version}. Expected ${FORMAT_VERSION}.`);
  }

  const salt = data.slice(5, 21);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const iterations = view.getUint32(21, false);

  if (iterations < 100000) {
    throw new Error(`Insecure iteration count: ${iterations}.`);
  }

  const wrappedFek = data.slice(25, 65);
  const nonce = data.slice(65, 77);
  const authTag = data.slice(77, 93);
  const ciphertext = data.slice(93);

  return {
    version,
    salt,
    iterations,
    wrappedFek,
    nonce,
    authTag,
    ciphertext,
  };
}

export interface ContainerInspection {
  isValid: boolean;
  version?: number;
  algorithm?: string;
  kdfAlgorithm?: string;
  iterations?: number;
  saltHex?: string;
  nonceHex?: string;
  authTagHex?: string;
  ciphertextSize?: number;
  totalSize?: number;
  error?: string;
}

/**
 * Inspects a .cvault binary container and extracts non-sensitive cryptographic metadata.
 * Returns a validated inspection object or a descriptive error without throwing.
 */
export function inspectContainer(data: Uint8Array): ContainerInspection {
  if (data.length < MIN_HEADER_SIZE) {
    return {
      isValid: false,
      error: `File is too small (${data.length} bytes) to be a valid .cvault container (minimum ${MIN_HEADER_SIZE} bytes).`,
    };
  }

  const magic = new TextDecoder().decode(data.slice(0, 4));
  if (magic !== MAGIC_BYTES) {
    return {
      isValid: false,
      error: `Invalid container signature '${magic}'. Supported format requires standard '${MAGIC_BYTES}' binary header.`,
    };
  }

  const version = data[4];
  if (version !== FORMAT_VERSION) {
    return {
      isValid: false,
      error: `Unsupported container format version ${version}. Only version ${FORMAT_VERSION} is supported.`,
    };
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const iterations = view.getUint32(21, false);

  if (iterations < 100000 || iterations > 5000000) {
    return {
      isValid: false,
      error: `Insecure or unsupported PBKDF2 iteration parameter: ${iterations}. Expected 100,000 - 5,000,000.`,
    };
  }

  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return {
    isValid: true,
    version,
    algorithm: "AES-256-GCM (NIST SP 800-38D)",
    kdfAlgorithm: "PBKDF2-HMAC-SHA256",
    iterations,
    saltHex: toHex(data.slice(5, 21)),
    nonceHex: toHex(data.slice(65, 77)),
    authTagHex: toHex(data.slice(77, 93)),
    ciphertextSize: data.length - MIN_HEADER_SIZE,
    totalSize: data.length,
  };
}
