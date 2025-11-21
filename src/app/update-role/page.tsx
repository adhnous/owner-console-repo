'use client';

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function UpdateRolePage() {
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdateRole = async () => {
    try {
      if (!uid || !role) {
        setMessage('❌ Please enter both UID and role.');
        return;
      }
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, { role });
      setMessage(`✅ Updated role for ${uid} to "${role}".`);
    } catch (err: any) {
      setMessage(`⚠️ Error: ${err.message}`);
    }
  };

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Update User Role</h1>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="User UID"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="New Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          onClick={handleUpdateRole}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Update Role
        </button>
      </div>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
