import { getApiKeyByKey, getServiceUser } from '@/data/users/actions';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { decodeJwt } from 'jose';
import * as client from 'openid-client';
import { auth } from '@/auth';
import process from 'node:process';

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;

export const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Authorization, Origin, X-Requested-With, Content-Type, Accept',
};

export enum HttpStatus {
  OK = 200,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export async function keyCloakIntrospect(token: JWT | null) {
  if (!KEYCLOAK_ISSUER) {
    throw new Error('KEYCLOAK_ISSUER environment variable is not defined');
  }
  if (!KEYCLOAK_CLIENT_ID) {
    throw new Error('KEYCLOAK_CLIENT_ID environment variable is not defined');
  }
  const config = await client.discovery(
    new URL(KEYCLOAK_ISSUER),
    KEYCLOAK_CLIENT_ID,
    {
      client_secret: KEYCLOAK_CLIENT_SECRET,
    },
  );


  return await client.tokenIntrospection(config, token.access_token);
}

export async function keyCloakRefresh(token: JWT | null) {
  if (!KEYCLOAK_ISSUER) {
    throw new Error('KEYCLOAK_ISSUER environment variable is not defined');
  }
  if (!KEYCLOAK_CLIENT_ID) {
    throw new Error('KEYCLOAK_CLIENT_ID environment variable is not defined');
  }
  const config = await client.discovery(
    new URL(KEYCLOAK_ISSUER),
    KEYCLOAK_CLIENT_ID,
    {
      client_secret: KEYCLOAK_CLIENT_SECRET,
    },
  );


  const refresh = await client.refreshTokenGrant(config, token.refresh_token);
  console.log('refreshTokenGrant', refresh);
  return refresh;
}

export async function authenticatedWithApiKeyUser(req?: NextRequest) {
  const headersList = await headers();
  const authorization = headersList.get('authorization');

  if (!authorization) {
    return null;
  }

  if (req && KEYCLOAK_CLIENT_SECRET && KEYCLOAK_CLIENT_SECRET && KEYCLOAK_ISSUER) {
    console.log('Keycloak instance must validate user');

    const session = await auth();
    if (!session) {
      console.log('No session found');
      return null;
    }

    const [type, token] = authorization.split(' ');

    switch (type.toLowerCase()) {
      case 'apikey':
        return handleApiKeyAuthentication(token);
      case 'bearer':
        return handleBearerAuthentication(token);
      default:
        return null;
    }

  }
}

async function handleApiKeyAuthentication(token: string) {
  const apiKey = await getApiKeyByKey(token);
  if (!apiKey.success) {
    NextResponse.json(apiKey.error, {
      status: HttpStatus.FORBIDDEN,
    });
    return;
  }

  return {
    id: apiKey.data.user_id,
    permissions: apiKey.data.permissions,
  };
}

async function handleBearerAuthentication(token: string) {
  try {
    const { iss, sub } = decodeJwt(token);
    if (!iss || !sub) {
      NextResponse.json('Invalid OAuth credentials.', {
        status: HttpStatus.FORBIDDEN,
      });
      return;
    }

    const serviceUser = await getServiceUser(iss, sub);
    if (!serviceUser.success) {
      NextResponse.json('User not found.', {
        status: HttpStatus.NOT_FOUND,
      });
      return;
    }

    const { id, client_id, client_secret, permissions } = serviceUser.data;
    const config = await client.discovery(
      new URL(iss),
      client_id,
      {
        client_secret: client_secret ?? undefined,
      },
      undefined,
      {
        execute: [
          client.allowInsecureRequests,
        ],
      },
    );
    const introspection = await client.tokenIntrospection(config, token);
    if (!introspection.active) {
      NextResponse.json('Token is not active.', {
        status: HttpStatus.UNAUTHORIZED,
      });
      return;
    }
    return {
      id,
      permissions,
    };
  } catch (error) {
    console.error(error);
    NextResponse.json(error, {
      status: HttpStatus.FORBIDDEN,
    });
    return;
  }
}
