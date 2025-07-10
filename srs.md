### 📄 Software Requirements Specification (SRS)

## 🔐 ObsidianPass – Secure Password Manager

### 1. Purpose

To provide a secure, cloud-synced password manager with client-side encryption and a modern, responsive UI.

### 2. Scope

Users can securely store credentials using AES-encrypted entries stored in Firebase. Master passwords are hashed, and sensitive operations are done client-side to ensure maximum privacy.

### 3. Functional Requirements

- User authentication via Firebase Auth
- AES-encrypted password storage
- CRUD operations on credentials
- Password visibility toggle
- Real-time sync using Firestore

### 4. Non-Functional Requirements

- 100% HTTPS communication
- OWASP Top 10 security practices
- Response time < 2s
- Cross-browser compatibility

### 5. Tech Stack

- Frontend: Next.js, TypeScript, TailwindCSS, ShadCN
- Backend: Firebase Auth, Firestore
- Security: AES, bcrypt

### 6. Assumptions

- User data is never stored unencrypted
- Master password is known only to the user

### 7. Future Enhancements

- Two-Factor Authentication (2FA)
- Password history versioning
- Offline mode with IndexedDB

### 8. Entity Relationship Diagram (ERD)

```
[User]
 └── uid (PK)
 └── email
 └── master_password_hash

[PasswordEntry]
 └── id (PK)
 └── title
 └── username
 └── encrypted_password
 └── notes
 └── created_at
 └── user_id (FK → User.uid)

Relationship:
User 1 --- * PasswordEntry
```

### 9. System Architecture Diagram (Description)

- **Frontend**: Built with Next.js and ShadCN for a responsive UI.
- **Client-Side Encryption**: AES encryption is applied before sending data to Firestore.
- **Authentication**: Handled using Firebase Auth with bcrypt hashed master passwords.
- **Database**: Firestore stores encrypted entries tied to user UID.
- **Security Enforcement**: HTTPS, client-side validation, and OWASP-compliant practices.

