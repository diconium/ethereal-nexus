import NextAuth, { DefaultSession } from 'next-auth';

export declare module 'next-auth' {
  interface Session extends DefaultSession {
    permissions: {
      [key: string]: string;
    };
  }
}
