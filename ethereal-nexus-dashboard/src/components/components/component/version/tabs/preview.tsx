"use client"

import React, {useState} from 'react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import Link from "next/link";
import PreviewContainer from "@/components/components/component/version/preview-container";
import {ExternalLinkIcon} from "@radix-ui/react-icons";


interface PreviewProps {
    component: any;
    assets: any;
    selectedVersion: any;
    key: any;
}

const Preview: React.FC<PreviewProps> = ({key, component, selectedVersion, assets}) => {

    console.log(key)
    return (
        <div>

            <iframe src={`/components/${component.data.id}/versions/${selectedVersion.id}/preview-new-window`}
                    className="w-full h-[500px] border-none"/>


        </div>
    );
};

export default Preview;
