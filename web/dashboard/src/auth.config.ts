import "next-auth/jwt"
import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import GitHubProvider from 'next-auth/providers/github';
import KeycloakProvider from "next-auth/providers/keycloak";
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
import { keyCloakIntrospect, keyCloakRefresh } from '@/app/api/utils';

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
  console.log("handleSSOLogin", {user, profile});

  // More detailed logging for debugging
  console.log("Profile details:", {
    email: profile?.email,
    name: profile?.name,
    image: profile?.avatar_url || profile?.picture,
    profile_keys: profile ? Object.keys(profile) : [],
    user_exists: !!user
  });

  if (!user && profile) {
    try {
      // For Keycloak, the profile structure might be different
      const email = profile.email;
      const name = profile.name || profile.preferred_username;
      const image = profile.avatar_url || profile.picture;

      console.log("Attempting to insert SSO user:", { email, name, image });

      const insert = await insertInvitedSsoUser({
        email,
        name,
        image,
        email_verified: new Date()
      });

      console.log("Insert result:", insert);
      return insert.success;
    } catch (error) {
      console.error("Error in handleSSOLogin:", error);
      return false;
    }
  }
  return true;
}

function handleCredentialsLogin(user: AdapterUser) {
  console.log("handleCredentialsLogin", {user})
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
  debug: true,
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
          else {
            console.log('User not found or password not set');
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
      connectionString: process.env.COMMUNICATION_SERVICES_CONNECTION_STRING,
      from: process.env.EMAIL_FROM,
    }),
    ...(process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER ? [
      KeycloakProvider({
        allowDangerousEmailAccountLinking: true,
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        issuer: process.env.KEYCLOAK_ISSUER,
      })
    ] : [])
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
        case "keycloak":
          return await handleSSOLogin(user as AdapterUser, profile);
        default:
          return false;
      }
    },
    async jwt(t) {
      const { token, user, account } = t;
      if (token?.access_token) {
        console.debug('validating access_token', token.sub);
        const introspectionResponse = await keyCloakIntrospect(token);
        if (!introspectionResponse.active) {
          console.debug('token is not valid', token.sub);
          console.debug('trying to use refresh token', token.sub);
          const refreshResponse = await keyCloakRefresh(token);

          if(!refreshResponse.access_token) {
            console.debug('refresh token is not valid');
            return null;
          }
          token.access_token = refreshResponse.access_token;
          return token;
        }
        console.debug('token is valid', token.sub);
      }


      const dbUser = await getUserByEmail(token.email);
      if (user && dbUser.success) {
        token.sub = dbUser.data.id;
      }

      if(account?.provider==="keycloak") {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
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
