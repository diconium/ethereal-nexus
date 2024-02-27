"use client";

import React from 'react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {useRouter} from "next/navigation";


const ComponentVersionHeader = ({component,selectedVersion,versions,activeTab}) => {
    const { push } = useRouter();

    return (
        <div className={"flex"}>
            <div>
                <h3 className="text-lg font-medium">{component.data.name}</h3>
                <p className="text-sm text-muted-foreground">
                    {selectedVersion.version} ~ {component.data.slug} - {selectedVersion.created_at.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="ml-auto">
                <Select value={selectedVersion.id} onValueChange={(newVersionId) => push(`/components/${component.data.id}/versions/${newVersionId}/${activeTab}`)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a version"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Version</SelectLabel>
                            {versions.data.map((version) => (
                                <SelectItem key={version.id} value={version.id}>{version.version}</SelectItem>))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default ComponentVersionHeader;
