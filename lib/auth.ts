import type { User } from "@/types";

const STORAGE_KEY = "aerorescue_auth";

// Prototype credentials — swap for real auth (NextAuth, Clerk, etc.) later
const DEMO_CREDENTIALS = {
  email: "commander@aerorescue.ai",
  password: "rescue2024",
};

export interface AuthSession {
  user: User;
  expiresAt: number;
}

export function login(email: string, password: string): User | null {
  if (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  ) {
    const user: User = {
      id: "usr_001",
      name: "Commander Hayes",
      email: DEMO_CREDENTIALS.email,
      role: "Rescue Commander",
    };
    const session: AuthSession = {
      user,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    return user;
  }
  return null;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}
