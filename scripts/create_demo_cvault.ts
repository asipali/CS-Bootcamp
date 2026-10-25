import { encryptFileClientSide } from "../src/lib/crypto/web-crypto";
import fs from "fs";
import path from "path";

async function generateDemoFile() {
  const content =
    "This is an authentic demonstration document encrypted by CipherVault 2.0.\n" +
    "Algorithm: AES-256-GCM (NIST SP 800-38D, 128-bit MAC tag)\n" +
    "Key Derivation: PBKDF2-HMAC-SHA256 (600,000 iterations)\n" +
    "Envelope: NIST SP 800-38F AES Key Wrap\n\n" +
    "If you are reading this text, your cryptographic verification and decryption succeeded flawlessly!\n";

  const rawBytes = new TextEncoder().encode(content);
  const password = "DemoVault@2026!";

  console.log("[*] Generating portable CipherVault_Demo_Encrypted.cvault...");
  const containerBytes = await encryptFileClientSide(rawBytes, password);

  const outputPath = path.resolve("./CipherVault_Demo_Encrypted.cvault");
  fs.writeFileSync(outputPath, Buffer.from(containerBytes));
  console.log(`[+] Successfully wrote ${containerBytes.length} bytes to ${outputPath}`);
}

generateDemoFile().catch((err) => {
  console.error("[-] Failed to create demo file:", err);
  process.exit(1);
});
