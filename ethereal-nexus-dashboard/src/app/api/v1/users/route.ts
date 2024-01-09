import {insertUser} from "@/data/users/actions"
import { NextResponse } from 'next/server';

async function POST(request: Request) {
    const req = await request.json();
    const user= await insertUser(req);

    if(!user.success) {
        return NextResponse.json(user.error,{status: 400})
    }

    return NextResponse.json(user.data)
}

export { POST }