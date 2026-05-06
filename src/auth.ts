import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

const providers = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  }),
  ...(process.env.AUTH_APPLE_ID
    ? [
        Apple({
          clientId: process.env.AUTH_APPLE_ID!,
          clientSecret: process.env.AUTH_APPLE_SECRET!,
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/auth/oauth-callback`;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
      };
    },
  },
  secret: process.env.AUTH_SECRET,
});
