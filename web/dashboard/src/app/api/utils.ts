import { getApiKeyByKey, getServiceUser } from '@/data/users/actions';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { decodeJwt } from 'jose';
import * as client from 'openid-client';

export const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Authorization, Origin, X-Requested-With, Content-Type, Accept'
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

export async function authenticatedWithApiKeyUser() {
  const headersList = await headers();
  const authorization = headersList.get('authorization');

  if (!authorization) {
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

async function handleApiKeyAuthentication(token: string) {
  const apiKey = await getApiKeyByKey(token);
  if (!apiKey.success) {
    return NextResponse.json(apiKey.error, {
      status: HttpStatus.FORBIDDEN
    });
  }

  return {
    id: apiKey.data.user_id,
    permissions: apiKey.data.permissions
  };
}

async function handleBearerAuthentication(token: string) {
  try {
    const { iss, sub } = decodeJwt(token);
    if (!iss || !sub) {
      return NextResponse.json('Invalid OAuth credentials.', {
        status: HttpStatus.FORBIDDEN
      });
    }

    const serviceUser = await getServiceUser(iss, sub);
    if(!serviceUser.success) {
      return NextResponse.json('User not found.', {
        status: HttpStatus.NOT_FOUND
      });
    }

    const { id, client_id, client_secret, permissions } = serviceUser.data;
    const config = await client.discovery(new URL(iss), client_id, { client_secret: client_secret ?? undefined });
    const introspection = await client.tokenIntrospection(config, token);
    if (!introspection.active) {
      return NextResponse.json('Token is not active.', {
        status: HttpStatus.UNAUTHORIZED
      });
    }

    return {
      id,
      permissions,
    };
  } catch (error) {
    console.error(error);
    return NextResponse.json(error, {
      status: HttpStatus.FORBIDDEN
    });
  }
}
