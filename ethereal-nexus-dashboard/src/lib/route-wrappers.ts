import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from '@/data/users/actions';
import { HttpStatus } from '@/app/api/utils';
import { ApiKey, UserId } from '@/data/users/dto';

export type DefaultExt = { params?: unknown };
export type WrapperCallback<
  Req extends Request = Request,
  Ext extends DefaultExt = DefaultExt,
  Res extends Response | Promise<Response> = Response
> = (
  next: (req?: Req, ext?: Ext) => Res | Promise<Res>,
  req: Req,
  ext: Ext
) => Promise<Res> | Res;

export function wrapper<Req extends NextRequest = NextRequest, Ext extends DefaultExt = DefaultExt, Res extends Response = Response >(cb: WrapperCallback<Req, Ext, Res>) {
  return function <HExt extends DefaultExt = DefaultExt, HReq extends Request = Request, HRes extends Response | Promise<Response> = Response>(handler: (req: HReq & Req, ext?: HExt) => HRes | Promise<HRes>) {
    // the new handler
    return (req: HReq & Req, ext?: HExt) => {
      return cb(
        (_req, _ext) =>
          handler(
            (_req || req) as unknown as HReq & Req,
            (_ext || ext) as unknown as HExt & Ext
          ) as unknown as Res,
        req as unknown as Req,
        ext as unknown as Ext
      ) as unknown as ReturnType<typeof handler>;
    };
  };
}

export type AuthenticatedWithApiKeyUser = {
  user: {
    resources: string[]
  } & UserId
}

export const authenticatedWithKey = wrapper(
  async (next, request, ext: DefaultExt & AuthenticatedWithApiKeyUser) => {
    let key = '';
    const headersList = request.headers;
    const authorization = headersList.get('authorization');
    if (authorization && authorization.split(' ')[0] === 'apikey') {
      key = authorization.split(' ')[1];
    }

    const apiKey = await getApiKey(key);
    if (!apiKey.success) {
      return NextResponse.json(apiKey.error, {
        status: HttpStatus.FORBIDDEN
      });
    }
    ext.user = {
      id: apiKey.data.user_id,
      resources: apiKey.data.resources as unknown as string[] //This is a workaround caused by an error from zod-drizzle with pg array declarations. https://github.com/drizzle-team/drizzle-orm/issues/1110
    };
    return next();
  }
) as <HExt = DefaultExt & AuthenticatedWithApiKeyUser, HReq = Request, HRes = Response | Promise<Response>>(handler: (req: (HReq & NextRequest), ext?: HExt) => (Promise<HRes> | HRes)) => (req: (HReq & NextRequest), ext?: HExt) => (req: (HReq & NextRequest), ext?: HExt) => (Promise<HRes> | HRes) extends ((...args: any) => infer R) ? R : any