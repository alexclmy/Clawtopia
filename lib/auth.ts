import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const devFallbackAuthSecret = "clawclub-dev-auth-secret-change-this";

export const isGoogleAuthConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
const demoAuthEnv = process.env.ENABLE_DEMO_AUTH?.trim().toLowerCase();
export const isDemoAuthEnabled =
  demoAuthEnv === "true" || (demoAuthEnv !== "false" && process.env.NODE_ENV !== "production");

const authSecret = process.env.NEXTAUTH_SECRET || devFallbackAuthSecret;

const providers: NextAuthOptions["providers"] = [];

if (isDemoAuthEnabled) {
  providers.push(
    CredentialsProvider({
      name: "Demo Sign In",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const name = credentials?.name?.trim();

        if (!email) {
          return null;
        }

        return {
          id: email.toLowerCase(),
          email: email.toLowerCase(),
          name: name || email.split("@")[0]
        };
      }
    })
  );
}

if (isGoogleAuthConfigured) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  );
}

// Runtime-only validation — not at module level so the build doesn't fail
// when env vars are absent from the Vercel build environment.
// Call this inside request handlers or server components if you need an
// early, explicit error instead of a silent auth failure.
export function assertAuthConfig(): void {
  if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET is required in production.");
  }
  if (providers.length === 0) {
    throw new Error("No auth provider configured. Enable Google OAuth or set ENABLE_DEMO_AUTH=true.");
  }
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  providers,
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.email = token.email ?? session.user.email;
      }

      return session;
    }
  }
};
