import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { NextResponse } from 'next/server';
import { getProjectComponentConfig } from '@/data/projects/actions';

export const GET = async (
  _,
  { params }: { params: Promise<{ id: string; name: string }> },
) => {
  const user = await authenticatedWithApiKeyUser();
  const { id, name } = await params;
  if (!id) {
    return NextResponse.json('No identifier provided.', {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const userId = user?.id;
  if (!userId) {
    return NextResponse.json('Api key not provided or invalid.', {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const permissions = user.permissions;
  if (permissions?.[id] === 'none') {
    return NextResponse.json('You do not have permissions for this resource.', {
      status: HttpStatus.FORBIDDEN,
    });
  }

  const response = await getProjectComponentConfig(id, name, userId);

  if (!response.success) {
    return NextResponse.json(response.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  return NextResponse.json(response.data, { status: HttpStatus.OK });
}
