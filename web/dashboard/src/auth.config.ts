import 'next-auth/jwt';
import * as bcrypt from 'bcryptjs';
import Credential from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import GitHubProvider from 'next-auth/providers/github';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { User, userLoginSchema } from '@/data/users/dto';
import {
  getUserByEmail,
  getUserById,
  insertInvitedSsoUser,
} from '@/data/users/actions';
import { getMembersByUser } from '@/data/member/actions';
import { AuthError, NextAuthConfig, Profile } from 'next-auth';
import { Permissions } from '@/data/users/permission-utils';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import Azure from '@/utils/providers/azure';
import { accounts, users, verificationTokens } from '@/data/users/schema';
import process from 'node:process';
import { AdapterUser } from 'next-auth/adapters';
import { keyCloakIntrospect, keyCloakRefresh } from '@/app/api/utils';
import { logger } from '@/lib/logger';

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    role?: Role;
  }
}
type Role = 'viewer' | 'user' | 'admin';

declare module 'next-auth' {
  interface User {
    role?: Role;
  }

  interface Session {
    user?: User;
    permissions: {
      [key: string]: Permissions | undefined;
    };
  }
}

async function handleSSOLogin(user: AdapterUser, profile?: Profile) {
  logger.debug('SSO login attempt initiated', {
    operation: 'sso-login',
    userExists: !!user,
    hasProfile: !!profile,
    profileEmail: profile?.email,
  });

  // More detailed logging for debugging
  logger.debug('SSO profile details received', {
    operation: 'sso-login',
    email: profile?.email,
    name: profile?.name,
    image: profile?.avatar_url || profile?.picture,
    profileKeys: profile ? Object.keys(profile) : [],
    userExists: !!user,
  });

  if (!user && profile) {
    try {
      // For Keycloak, the profile structure might be different
      const email = profile.email;
      const name = profile.name || profile.preferred_username;
      const image = profile.avatar_url || profile.picture;

      logger.info('Creating new SSO user from invitation', {
        operation: 'sso-user-creation',
        email,
        name,
        hasImage: !!image,
      });

      const insert = await insertInvitedSsoUser({
        email,
        name,
        image,
        email_verified: new Date(),
      });

      logger.info('SSO user creation completed', {
        operation: 'sso-user-creation',
        success: insert.success,
        email,
      });
      return insert.success;
    } catch (error) {
      logger.error('Failed to create SSO user', error as Error, {
        operation: 'sso-user-creation',
        email: profile?.email,
      });
      return false;
    }
  }
  return true;
}

function handleCredentialsLogin(user: AdapterUser) {
  logger.info('Credentials login attempt', {
    operation: 'credentials-login',
    userId: user?.id,
    email: user?.email,
    hasUser: !!user,
  });

  if (!user) {
    logger.warn('Credentials login failed: user not found', {
      operation: 'credentials-login',
    });
    return false;
  }

  if (
    process.env.AUTH_ENFORCE_EMAIL_VERIFICATION === 'true' &&
    !user.emailVerified
  ) {
    logger.warn('Credentials login failed: email not verified', {
      operation: 'credentials-login',
      userId: user.id,
      email: user.email,
    });
    throw new AuthError('Email not verified');
  }

  logger.info('Credentials login successful', {
    operation: 'credentials-login',
    userId: user.id,
    email: user.email,
  });
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
    verifyRequest: '/auth/email',
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credential({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'text',
          placeholder: 'jsmith@yourcompany.com',
        },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const safeCredentials = userLoginSchema.safeParse(credentials);
        if (safeCredentials.success) {
          const { password, email } = safeCredentials.data;
          const user = await getUserByEmail(email);
          if (user.success && user.data.password && password) {
            const passwordMatches = await bcrypt.compare(
              password,
              user.data.password,
            );

            if (passwordMatches) {
              logger.info('User authenticated successfully via credentials', {
                operation: 'credentials-authorize',
                email,
                userId: user.data.id,
              });
              return user.data;
            } else {
              logger.warn('Password mismatch during credential authorization', {
                operation: 'credentials-authorize',
                email,
              });
            }
          } else {
            logger.warn('User not found or password not set', {
              operation: 'credentials-authorize',
              email,
              userFound: user.success,
              hasPassword: !!(user.success && user.data.password),
            });
          }
        } else {
          logger.warn('Invalid credentials format', {
            operation: 'credentials-authorize',
            validationErrors: safeCredentials.error?.errors,
          });
        }
        return null;
      },
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
    ...(process.env.KEYCLOAK_CLIENT_ID &&
    process.env.KEYCLOAK_CLIENT_SECRET &&
    process.env.KEYCLOAK_ISSUER
      ? [
          KeycloakProvider({
            allowDangerousEmailAccountLinking: true,
            clientId: process.env.KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
            issuer: process.env.KEYCLOAK_ISSUER,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, profile, account }) {
      switch (account?.provider) {
        case 'azure-communication-service':
          return true;
        case 'credentials':
          return handleCredentialsLogin(user as AdapterUser);
        case 'github':
        case 'microsoft-entra-id':
        case 'keycloak':
          return await handleSSOLogin(user as AdapterUser, profile);
        default:
          return false;
      }
    },
    async jwt(t) {
      const { token, user, account } = t;
      if (token?.access_token) {
        logger.debug('Validating Keycloak access token', {
          operation: 'jwt-token-validation',
          userId: token.sub,
        });
        const introspectionResponse = await keyCloakIntrospect(token);
        if (!introspectionResponse.active) {
          logger.debug('Access token is not valid, attempting refresh', {
            operation: 'jwt-token-refresh',
            userId: token.sub,
          });
          const refreshResponse = await keyCloakRefresh(token);

          if (!refreshResponse.access_token) {
            logger.warn('Refresh token is not valid, token refresh failed', {
              operation: 'jwt-token-refresh',
              userId: token.sub,
            });
            return null;
          }
          logger.info('Access token refreshed successfully', {
            operation: 'jwt-token-refresh',
            userId: token.sub,
          });
          token.access_token = refreshResponse.access_token;
          return token;
        }
        logger.debug('Access token is valid', {
          operation: 'jwt-token-validation',
          userId: token.sub,
        });
      }

      const dbUser = await getUserByEmail(token.email);
      if (user && dbUser.success) {
        token.sub = dbUser.data.id;
      }

      if (account?.provider === 'keycloak') {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
      }

      return token;
    },
    async session({ session, token }) {
      const members = await getMembersByUser(token.sub);
      const user = await getUserById(token.sub);

      if (user.success && members.success && members.data.length > 0) {
        session.permissions = members.data.reduce((acc, member) => {
          switch (user.data.role) {
            case 'admin':
              acc[member.resource] = 'write';
              break;
            case 'viewer':
              acc[member.resource] = 'read';
              break;
            default:
              acc[member.resource] =
                member.role !== 'owner' ? member.permissions : 'manage';
              break;
          }
          return acc;
        }, {});
      }

      if (token.sub && session.user && user.success) {
        session.user.id = token.sub;
        session.user.role = user.data.role;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
