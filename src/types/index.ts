
export interface Credential {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User UID
  websiteName: string;
  websiteUrl?: string;
  username: string;
  // Base64 string of a JSON object: { iv: string (base64), ciphertext: string (base64) }
  // This is what's stored in Firestore.
  encryptedData: string;
  createdAt: string; // ISO string date

  // Client-side only, after decryption. Not stored in Firestore.
  // Used for forms and display.
  decryptedPassword?: string;
}
