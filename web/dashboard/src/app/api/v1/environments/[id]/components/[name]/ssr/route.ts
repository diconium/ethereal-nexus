import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { NextResponse } from 'next/server';
import { getEnvironmentComponentConfig } from '@/data/projects/actions';
import { callSSR } from '@/lib/ssr/ssr';
import crypto from 'crypto';
import { LRUCache } from '@/lib/cache/LRUCache';
import { logger } from '@/lib/logger';

const cache = new LRUCache<string, any>(10000); // Set the cache capacity to 100

export const POST =
  async (
    request,
    { params }: { params: Promise<{ id: string; name: string }> },
  ) => {
      const {id, name} = await params;
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

      const req = await request.json();

      const response = await getEnvironmentComponentConfig(id, name, userId);

      const reqHash = crypto.createHash('sha256').update(JSON.stringify(req) + JSON.stringify(response)).digest('hex');


      if (cache.get(reqHash)) {
         return NextResponse.json(cache.get(reqHash), { status: HttpStatus.OK });
      }


      if (!response.success) {
          return NextResponse.json(response.error, {
              status: HttpStatus.BAD_REQUEST,
          });
      }

      if(response.data.ssr_active === false){
          logger.warn("SSR called on a component with SSR disabled", {
              operation: 'ssr-render',
              componentType: response.data.name,
          })
          const result = {output: "", serverSideProps: {}, version: response.data.version};
          cache.set(reqHash, result);
          return NextResponse.json(result, { status: HttpStatus.OK });
      }


      const {output, serverSideProps } = await callSSR(response.data.name, req, response.data.assets);
      if (output !== "") {
          const result = {output, serverSideProps, version: response.data.version};
          cache.set(reqHash, result);
          return NextResponse.json(result, { status: HttpStatus.OK });
      }

      return NextResponse.json({output, serverSideProps, version: response.data.version}, { status: HttpStatus.OK });
  }
