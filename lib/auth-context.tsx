"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAppAuth, getAppDb, googleProvider } from "./firebase";
import type { UserProfile } from "./types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  needsDisplayName: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsDisplayName, setNeedsDisplayName] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAppAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(getAppDb(), "users", firebaseUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
          setNeedsDisplayName(false);
        } else {
          setNeedsDisplayName(true);
        }
      } else {
        setProfile(null);
        setNeedsDisplayName(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(getAppAuth(), googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // user cancelled — not an error
      }
      console.error("Sign-in failed:", err);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(getAppAuth());
    setProfile(null);
  };

  const setDisplayName = async (name: string) => {
    if (!user) return;
    const userDocRef = doc(getAppDb(), "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: name,
      email: user.email || "",
      createdAt: serverTimestamp(),
      totalAnswered: 0,
      totalCorrect: 0,
    });
    const freshDoc = await getDoc(userDocRef);
    setProfile(freshDoc.data() as UserProfile);
    setNeedsDisplayName(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        setDisplayName,
        needsDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
