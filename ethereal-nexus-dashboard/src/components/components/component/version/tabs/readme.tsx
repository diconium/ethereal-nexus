"use client"

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Separator} from "@/components/ui/separator";


interface PreviewProps {
    selectedVersion: string;
}

const Readme: React.FC<PreviewProps> = ({selectedVersion}) => {

    return (
        <div className="mx-auto grid grid-cols-5 gap-4">
            <div className="col-span-3">
                <div className="mx-auto">
                    <ReactMarkdown components={{
                        h1: ({node, ...props}) => <h1
                            className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2
                            className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl mb-4" {...props} />,
                        h3: ({node, ...props}) => <h3
                            className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-3xl mb-4" {...props} />,
                        p: ({node, ...props}) => <p className="scroll-m-20 text-lg text-gray-500 mb-4" {...props} />,
                    }}>
                        {selectedVersion.readme ? selectedVersion.readme : 'No Readme Provided'}
                    </ReactMarkdown>
                </div>
            </div>
            <div className="col-span-2">
                <p className="text-xl text-muted-foreground">
                    Weekly Downloads</p>
                <p>10,0213</p>
                <Separator/>
            </div>
        </div>
    );
};

export default Readme;
