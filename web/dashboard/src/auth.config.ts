import "next-auth/jwt"
import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import GitHubProvider from 'next-auth/providers/github';
import { User, userLoginSchema } from '@/data/users/dto';
import { getUserByEmail, getUserById, insertInvitedSsoUser } from '@/data/users/actions';
import { getMembersByUser } from '@/data/member/actions';
import { AuthError, NextAuthConfig, Profile } from 'next-auth';
import { Permissions } from '@/data/users/permission-utils';
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from '@/db';
import Azure from '@/utils/providers/azure';
import { accounts, users, verificationTokens } from '@/data/users/schema';
import process from 'node:process';
import { AdapterUser } from "next-auth/adapters";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    role?: Role
  }
}
type Role = "viewer" | "user" | "admin"

declare module "next-auth" {
  interface User {
    role?: Role
  }

  interface Session {
    user?: User;
    permissions: {
      [key: string]: Permissions | undefined
    }
  }
}

async function handleSSOLogin(user: AdapterUser, profile?: Profile) {
  if (!user && profile) {
    const insert = await insertInvitedSsoUser({
      email: profile.email,
      name: profile.name,
      image: profile.avatar_url,
      email_verified: new Date()
    });
    return insert.success;
  }
  return true;
}

function handleCredentialsLogin(user: AdapterUser) {
  if(!user) {
    return false;
  }
  if(process.env.AUTH_ENFORCE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
    throw new AuthError("Email not verified", { type: "Verification"});
  }

  return true;
}

export const authConfig = {
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  secret: process.env.NEXT_AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/email'
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens
  }),
  providers: [
    Credential({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@yourcompany.com" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const safeCredentials = userLoginSchema.safeParse(credentials)
        if(safeCredentials.success) {
          const { password, email } = safeCredentials.data;
          const user = await getUserByEmail(email);
          if(user.success && user.data.password && password) {
            const passwordMatches = await bcrypt.compare(
              password,
              user.data.password
            )

            if(passwordMatches) {
              return user.data
            }
          }
        }
        return null;
      }
    }),
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    MicrosoftEntraID({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
    Azure({
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async signIn({user, profile, account}) {
      switch (account?.provider) {
        case "azure-communication-service":
          return true;
        case "credentials":
          return handleCredentialsLogin(user as AdapterUser);
        case "github":
        case "microsoft-entra-id":
          return await handleSSOLogin(user as AdapterUser, profile);
        default:
          return false;
      }
    },
    async jwt({ token, user }) {
      const dbUser = await getUserByEmail(token.email);
      if (user && dbUser.success) {
        token.sub = dbUser.data.id;
      }
      return token
    },
    async session({ session, token }) {
      const members = await getMembersByUser(token.sub)
      const user = await getUserById(token.sub)

      if(user.success && members.success && members.data.length > 0) {
        session.permissions = members.data.reduce((acc,member) => {
          switch (user.data.role) {
            case "admin":
              acc[member.resource] = "write";
              break;
            case "viewer":
              acc[member.resource] = "read";
              break;
            default:
              acc[member.resource] = member.role !== 'owner' ? member.permissions : 'manage';
              break;
          }
          return acc;
        }, {})
      }

      if(token.sub && session.user && user.success) {
        session.user.id = token.sub;
        session.user.role = user.data.role;
      }

      return session
    },
  }
} satisfies NextAuthConfig
