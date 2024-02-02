import { NextRequest, NextResponse } from 'next/server';
import { getUserByApiKey } from '@/data/users/actions';
import { HttpStatus } from '@/app/api/utils';
import { UserId } from '@/data/users/dto';

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

export const authenticatedWithKey = wrapper(
  async (next, request, ext: DefaultExt & {user: UserId}) => {
    let apiKey = '';
    const headersList = request.headers;
    const authorization = headersList.get('authorization');
    if (authorization && authorization.split(' ')[0] === 'apikey') {
      apiKey = authorization.split(' ')[1];
    }

    const user = await getUserByApiKey(apiKey);
    if (!user.success) {
      return NextResponse.json(user.error, {
        status: HttpStatus.FORBIDDEN
      });
    }
    ext.user = user.data;
    return next();
  }
) as <HExt = DefaultExt & {user: UserId}, HReq = Request, HRes = Response | Promise<Response>>(handler: (req: (HReq & NextRequest), ext?: HExt) => (Promise<HRes> | HRes)) => (req: (HReq & NextRequest), ext?: HExt) => (req: (HReq & NextRequest), ext?: HExt) => (Promise<HRes> | HRes) extends ((...args: any) => infer R) ? R : any