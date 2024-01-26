import React from "react";
import {ComponentsDataTable} from "@/components/components/components-data-table/data-table";

export default async function Components() {
    return (
        <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Components</h2>
                    <p className="text-muted-foreground">Manage your components here!</p>
                </div>
            </div>
            <ComponentsDataTable/>
        </div>
    );
}
