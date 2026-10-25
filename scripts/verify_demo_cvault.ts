import fs from 'fs';
import { decryptFileClientSide } from '../src/lib/crypto/web-crypto';
import { inspectContainer } from '../src/lib/crypto/container';

async function main() {
  const buf = fs.readFileSync('CipherVault_Demo_Encrypted.cvault');
  const uint8 = new Uint8Array(buf);
  const info = inspectContainer(uint8);
  console.log('Container Inspection Valid:', info.isValid);
  console.log('Container Version:', info.version);
  console.log('KDF Iterations:', info.iterations);
  console.log('Ciphertext Size (bytes):', info.ciphertextSize);

  // 1. Wrong Password test
  try {
    await decryptFileClientSide(uint8, 'WrongPassword123!');
    console.error('FAIL: Should not decrypt with wrong password');
    process.exit(1);
  } catch (e) {
    console.log('PASS: Correctly rejected wrong password ->', (e as Error).message);
  }

  // 2. Correct Password test
  const dec = await decryptFileClientSide(uint8, 'DemoVault@2026!');
  const text = new TextDecoder().decode(dec);
  console.log('PASS: Successfully decrypted container with DemoVault@2026!');
  console.log('Decrypted File Content:\n' + text);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
