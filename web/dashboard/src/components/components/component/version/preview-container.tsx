"use client"
import React, {useState} from 'react';
import Script from "next/script";
import {useRouter} from "next/navigation";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import Link from "next/link";
import {ExternalLinkIcon} from "@radix-ui/react-icons";
import {z} from "zod";
import {componentAssetsSchema} from "@/data/components/dto";


interface PreviewContainerProps {
    componentSlug: string | null;
    componentAssets: z.infer<typeof componentAssetsSchema>[];
    selectedVersion: any;
    component: any;
}

const PreviewContainer: React.FC<PreviewContainerProps> = ({
                                                               component,
                                                               componentAssets = [],
                                                               componentSlug,
                                                               selectedVersion
                                                           }) => {
    const [inputValues, setInputValues] = useState({});

    const router = useRouter();
    const mappedObjStr = Object.entries(inputValues)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return (
        <div>
            <div
                className={"mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative rounded-md border"}
                style={{position: 'relative'}}>
                <div style={{position: 'absolute', top: '2px', right: '2px'}}>
                    <Link target={'_blank'}
                          href={`/components/${component.data.id}/versions/${selectedVersion.id}/preview-new-window`}>
                        <button className="m-4 p-2 border rounded">

                            <ExternalLinkIcon/>
                        </button>
                    </Link>
                </div>
                <div className="flex items-center justify-between p-4 min-h-[300px]">
                    {componentAssets.map(({url, type, id}, index) => {
                        if (type === "js") {
                            return <Script key={id} src={url} type={"module"}></Script>
                        }

                    })}
                    <div key={selectedVersion}
                         id={selectedVersion}
                         dangerouslySetInnerHTML={{
                             __html: `
                    <${componentSlug} ${mappedObjStr}></${componentSlug}>`
                         }}
                    />
                </div>
            </div>
            <Table className="mt-4">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Controls</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedVersion.dialog.map((item: any, index: number) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.placeholder}</TableCell>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>
                                <code
                                    className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                    {item.default ? item.default : "undefined"}
                                </code>
                            </TableCell>
                            <TableCell className="text-right">
                                <Input onChange={(e) => setInputValues({...inputValues, [item.name]: e.target.value})}
                                       placeholder="Value"/></TableCell>
                        </TableRow>
                    ))}

                </TableBody>
            </Table>
        </div>
    );
};

export default PreviewContainer;
