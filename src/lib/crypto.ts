
// WARNING: THE DEMO_ENCRYPTION_KEY_STRING IS FOR DEMO PURPOSES ONLY FOR IN-APP PASSWORD ENCRYPTION
// AND IS NOT SECURE FOR PRODUCTION. A hardcoded key is used here.
// In a real application, use a robust key management strategy.

// Functions for in-app password encryption/decryption (using fixed demo key)
const DEMO_ENCRYPTION_KEY_STRING = "YourSecure32ByteEncryptionKeyStr"; // Ensure this is exactly 32 bytes

function getFixedKeyMaterial(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available for fixed key material generation.");
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(DEMO_ENCRYPTION_KEY_STRING);
  if (keyData.byteLength !== 32) {
    throw new Error("Fixed encryption key must be 32 bytes for AES-256.");
  }
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  if (!password) {
    return JSON.stringify({ iv: '', ciphertext: '' });
  }

  try {
    const key = await getFixedKeyMaterial();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedPassword = encoder.encode(password);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedPassword
    );

    return JSON.stringify({
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(encryptedBuffer),
    });
  } catch (error) {
    console.error("Encryption failed (fixed key):", error);
    throw new Error("Could not encrypt password with fixed key.");
  }
}

export async function decryptPassword(encryptedPayload: string): Promise<string> {
   if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  if (!encryptedPayload) {
    const testEmpty = JSON.parse(encryptedPayload); // This will fail if payload is truly empty, but handles "null" string
    if (testEmpty.iv === '' && testEmpty.ciphertext === '') return '';
    throw new Error("Encrypted payload is missing.");
  }

  try {
    const { iv: ivBase64, ciphertext: ciphertextBase64 } = JSON.parse(encryptedPayload);

    if (!ivBase64 || !ciphertextBase64) {
        if (ivBase64 === '' && ciphertextBase64 === '') return '';
        console.warn("IV or Ciphertext missing in payload for fixed key decryption.");
        return "";
    }

    const key = await getFixedKeyMaterial();
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed (fixed key):", error);
    throw new Error("Could not decrypt password with fixed key. Data might be corrupted or key incorrect.");
  }
}


// --- New functions for password-based file encryption/decryption for Export/Import ---

const PBKDF2_ITERATIONS = 200000; // Number of iterations for PBKDF2

async function deriveKeyFromUserPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available for key derivation.");
  }
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    importedKey,
    { name: "AES-GCM", length: 256 },
    true, // allow export (false in production if key isn't needed outside deriveKey)
    ["encrypt", "decrypt"]
  );
}

export async function encryptDataWithUserPassword(plaintext: string, userPassword: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available for data encryption.");
  }
  if (!userPassword) {
    throw new Error("A secret key (password) is required for encryption.");
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
    const iv = crypto.getRandomValues(new Uint8Array(12));   // 12 bytes IV for AES-GCM
    const encoder = new TextEncoder();
    const encodedPlaintext = encoder.encode(plaintext);

    const key = await deriveKeyFromUserPassword(userPassword, salt);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedPlaintext
    );

    return JSON.stringify({
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(encryptedBuffer),
    });
  } catch (error) {
    console.error("Encryption with user password failed:", error);
    throw new Error("Could not encrypt data with the provided secret key.");
  }
}

export async function decryptDataWithUserPassword(encryptedPayloadString: string, userPassword: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available for data decryption.");
  }
   if (!userPassword) {
    throw new Error("A secret key (password) is required for decryption.");
  }

  try {
    const { salt: saltBase64, iv: ivBase64, ciphertext: ciphertextBase64 } = JSON.parse(encryptedPayloadString);

    if (!saltBase64 || !ivBase64 || !ciphertextBase64) {
      throw new Error("Malformed encrypted payload: missing salt, IV, or ciphertext.");
    }

    const salt = base64ToArrayBuffer(saltBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);

    const key = await deriveKeyFromUserPassword(userPassword, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption with user password failed:", error);
    // More specific error for wrong key might be hard to distinguish from corrupted data
    // without more complex checks. For now, a general failure message.
    throw new Error("Could not decrypt data. The secret key might be incorrect or the data corrupted.");
  }
}
