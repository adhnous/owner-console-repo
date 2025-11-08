'use client';

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Optional: configure your Firebase app if needed
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Debug Auth Page</h1>

      {user ? (
        <div>
          <p className="text-green-700">✅ User is signed in</p>
          <pre className="bg-gray-100 rounded p-4 mt-2 text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-red-700">❌ No user signed in</p>
      )}
    </div>
  );
}
