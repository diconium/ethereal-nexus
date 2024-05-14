"use client"

import React from 'react';

interface PreviewProps {
    componentId: string;
    selectedVersionId: string;
}

const Preview: React.FC<PreviewProps> = ({componentId, selectedVersionId}) => {

    return (
        <div>
            <iframe src={`/components/${componentId}/versions/${selectedVersionId}/preview-new-window`}
                    className="w-full h-[500px] border-none"/>
        </div>
    );
};

export default Preview;
