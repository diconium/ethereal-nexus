"use client"

import React from 'react';

interface PreviewProps {
    component: any;
    assets: any;
    selectedVersion: any;
    key: any;
}

const Preview: React.FC<PreviewProps> = ({key, component, selectedVersion, assets}) => {

    return (
        <div>

            <iframe src={`/components/${component.data.id}/versions/${selectedVersion.id}/preview-new-window`}
                    className="w-full h-[500px] border-none"/>


        </div>
    );
};

export default Preview;
