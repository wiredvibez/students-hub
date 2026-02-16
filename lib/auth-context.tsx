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
    await signInWithPopup(getAppAuth(), googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(getAppAuth());
    setProfile(null);
  };

  const setDisplayName = async (name: string) => {
    if (!user) return;
    const profileData: UserProfile = {
      uid: user.uid,
      displayName: name,
      email: user.email || "",
      createdAt: serverTimestamp() as never,
      totalAnswered: 0,
      totalCorrect: 0,
    };
    await setDoc(doc(getAppDb(), "users", user.uid), profileData);
    setProfile(profileData);
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
