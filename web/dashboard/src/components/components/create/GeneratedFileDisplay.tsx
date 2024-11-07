"use client";

import React  from 'react';

interface GeneratedFileDisplayProps {
    generatedCode: string;
};

export const GeneratedFileDisplay = ({ generatedCode }: GeneratedFileDisplayProps) => {
    const lines = generatedCode?.trim().split('\n');

    return (
        <section className="w-full">
          <pre className="p-4 text-sm whitespace-pre-wrap">
            <code className="language-jsx">
              {lines?.map((line, index) => (
                  <div key={index} className="table-row">
                      <span className="table-cell text-right pr-4 select-none opacity-50 text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="table-cell">
                        {line}
                      </span>
                  </div>
              ))}
            </code>
          </pre>
        </section>
    );
}
