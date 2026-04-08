import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { NextResponse } from 'next/server';
import { getEnvironmentComponentConfig } from '@/data/projects/actions';
import { callSSR } from '@/lib/ssr/ssr';
import { logger } from '@/lib/logger';

export const POST = async (
  request,
  { params }: { params: Promise<{ id: string; name: string }> },
) => {
  const { id, name } = await params;
  if (!id) {
    return NextResponse.json('No identifier provided.', {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  const user = await authenticatedWithApiKeyUser();
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

  const req = await request.json().catch(() => {});

  const response = await getEnvironmentComponentConfig(id, name, userId);

  if (!response.success) {
    return NextResponse.json(response.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  if (!response.data.ssr_active) {
    logger.warn('SSR called on a component with SSR disabled', {
      operation: 'ssr-render',
      componentType: response.data.name,
    });
    const result = {
      output: '',
      serverSideProps: {},
      version: response.data.version,
    };

    return NextResponse.json(result, { status: HttpStatus.OK });
  }

  const { output, serverSideProps } = await callSSR(
    response.data.name,
    req,
    response.data.assets,
  );
  if (output !== '') {
    const result = { output, serverSideProps, version: response.data.version };
    return NextResponse.json(result, { status: HttpStatus.OK });
  }

  return NextResponse.json(
    { output, serverSideProps, version: response.data.version },
    { status: HttpStatus.OK },
  );
};
