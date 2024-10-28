import "next-auth/jwt"
import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import GitHubProvider from 'next-auth/providers/github';
import { userLoginSchema } from '@/data/users/dto';
import { getUserByEmail, getUserById, insertInvitedSsoUser } from '@/data/users/actions';
import { getMembersByUser } from '@/data/member/actions';
import { NextAuthConfig } from 'next-auth';
import { Permissions } from '@/data/users/permission-utils';

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
    signIn: '/auth/signin'
  },
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
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async signIn({profile, account}) {
      if (account?.provider == "credentials") {
        return true;
      }
      if (account?.provider == "github") {
        const existingUser = await getUserByEmail(profile?.email);
        if(!existingUser.success && profile) {
          const insert = await insertInvitedSsoUser({
            email: profile.email,
            name: profile.name,
            image: profile.avatar_url,
            email_verified: new Date()
          })
          return insert.success
        }
        return true
      }
      return false
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

      if(members.success && members.data.length > 0) {
        session.permissions = members.data.reduce((acc,member) => {
          acc[member.resource] = member.permissions;
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
