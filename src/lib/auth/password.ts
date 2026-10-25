import crypto from "crypto";

const KDF_ALGORITHM = "sha512";
const KDF_ITERATIONS = 210000;
const KEY_LENGTH = 64; // 512 bits
const SALT_BYTES = 16;

/**
 * Hashes a password using PBKDF2-HMAC-SHA512 with 210,000 iterations (OWASP recommendation).
 * Produces format: $pbkdf2-sha512$iterations$saltHex$hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      KDF_ITERATIONS,
      KEY_LENGTH,
      KDF_ALGORITHM,
      (err, derivedKey) => {
        if (err) return reject(err);
        const saltHex = salt.toString("hex");
        const hashHex = derivedKey.toString("hex");
        resolve(`$pbkdf2-sha512$${KDF_ITERATIONS}$${saltHex}$${hashHex}`);
      }
    );
  });
}

/**
 * Constant-time verification of a candidate password against stored hash.
 */
export async function verifyPassword(
  storedHash: string,
  candidatePassword: string
): Promise<boolean> {
  if (!storedHash || !candidatePassword) return false;

  const parts = storedHash.split("$");
  // Format: ["", "pbkdf2-sha512", "iterations", "saltHex", "hashHex"]
  if (parts.length !== 5 || parts[1] !== "pbkdf2-sha512") {
    return false;
  }

  const iterations = parseInt(parts[2], 10);
  const salt = Buffer.from(parts[3], "hex");
  const originalHash = Buffer.from(parts[4], "hex");

  return new Promise((resolve) => {
    crypto.pbkdf2(
      candidatePassword,
      salt,
      iterations,
      originalHash.length,
      KDF_ALGORITHM,
      (err, derivedKey) => {
        if (err) return resolve(false);
        // Constant-time comparison preventing timing attacks
        resolve(crypto.timingSafeEqual(originalHash, derivedKey));
      }
    );
  });
}
