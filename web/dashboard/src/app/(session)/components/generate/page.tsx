import React from "react";
import Chat  from '../../../../components/components/create/Chat';
import { AI } from "@/components/components/create/utils/actions";

export default async function GenerateComponentPage() {
    return (
        <AI>
            <div className="container h-full flex-1 flex-col space-y-8 md:flex" style={{ height: "calc(100vh - 10rem)"}}>
                <Chat />
            </div>
        </AI>
    );
}
