import React from "react";
import { NewProjectModalPage } from './Chat';
import {AI} from "@/data/ai/actions";

export default async function GenerateComponentPage() {
    return (
        <AI>
            <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
                <NewProjectModalPage />
            </div>
        </AI>
    );
}
