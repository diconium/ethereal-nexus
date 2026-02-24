import { NextRequest, NextResponse } from 'next/server';
import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import {
  getComponents,
  upsertComponentWithVersion,
} from '@/data/components/actions';

export const POST = async (request: NextRequest) => {
  const req = await request.json();
  const user = await authenticatedWithApiKeyUser();

  const permissions = user?.permissions;
  if (permissions?.['components'] !== 'write') {
    return NextResponse.json(
      'You do not have permissions to write this resource.',
      {
        status: HttpStatus.FORBIDDEN,
      },
    );
  }
  const componentWithVersion = await upsertComponentWithVersion(req, user?.id);

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
};

export const GET = async () => {
  const user = await authenticatedWithApiKeyUser();
  const permissions = user?.permissions;
  if (
    permissions?.['components'] !== 'read' &&
    permissions?.['components'] !== 'write'
  ) {
    return NextResponse.json(
      'You do not have permissions to write this resource.',
      {
        status: HttpStatus.FORBIDDEN,
      },
    );
  }

  const componentWithVersion = await getComponents();

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
};
