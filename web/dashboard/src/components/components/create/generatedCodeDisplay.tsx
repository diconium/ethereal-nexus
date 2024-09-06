"use client";

import React  from 'react';

interface GeneratedCodeDisplayProps {
    generatedCode: string;
};

const GeneratedCodeDisplay = ({ generatedCode }: GeneratedCodeDisplayProps) => {
    return (
        <section>
            <pre className="whitespace-pre-wrap">
                <code>
                    {generatedCode}
                </code>
            </pre>
        </section>
    );
}

export default GeneratedCodeDisplay;
