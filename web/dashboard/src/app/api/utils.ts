import { getApiKeyByKey } from '@/data/users/actions';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers":"Authorization, Origin, X-Requested-With, Content-Type, Accept",
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
  let key = '';
  const headersList = await headers();
  const authorization = headersList.get('authorization');
  if (authorization && authorization.split(' ')[0] === 'apikey') {
    key = authorization.split(' ')[1];
  }

  const apiKey = await getApiKeyByKey(key);
  if (!apiKey.success) {
    NextResponse.json(apiKey.error, {
      status: HttpStatus.FORBIDDEN
    });
    return;
  }

  return  {
    id: apiKey.data.user_id,
    permissions: apiKey.data.permissions,
  };
}