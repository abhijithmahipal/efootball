# Firebase Setup Instructions

## Prerequisites

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database in the Firebase console
3. Enable Authentication in the Firebase console

## Configuration Steps

### 1. Get Firebase Configuration

1. Go to your Firebase project settings
2. In the "General" tab, scroll down to "Your apps"
3. Click on the web app icon (</>)
4. Copy the Firebase configuration object

### 2. Update Environment Files

Replace the placeholder values in the following files with your actual Firebase configuration:

**src/environments/environment.ts** (Development)
**src/environments/environment.prod.ts** (Production)

```typescript
export const environment = {
  production: false, // true for production
  firebase: {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id",
  },
};
```

### 3. Firestore Security Rules

Set up the following security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to matches and standings
    match /matches/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /players/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /tournaments/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /standings/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Authentication Setup

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Add authorized domains if needed for production

## Running the Application

```bash
npm start
```

The application will be available at http://localhost:4200

## Verification

- Check browser console for "Firebase service initialized" message
- Check browser console for "Auth state: Not logged in" message
- No Firebase connection errors should appear
