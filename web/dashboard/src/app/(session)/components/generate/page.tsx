import React from "react";
import Chat  from '@/components/components/create/chat';
import { ChatProvider } from "@/components/components/create/utils/chat-context";
import { auth } from "@/auth";

export default async function GenerateComponentPage() {
    const session = await auth();

    return (
        <ChatProvider>
            <div className="flex-1 flex-col space-y-8 md:flex" style={{ height: "calc(100vh - 10rem)"}}>
                <Chat chatId={session?.user?.id} />
            </div>
        </ChatProvider>
    );
}
