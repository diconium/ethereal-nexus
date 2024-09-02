"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const GeneratedCodePreviewer = ({ children, ...props }) => {
    const [contentRef, setContentRef] = useState(null);

    const mountNode = contentRef?.contentWindow?.document?.body;

    React.useEffect(() => {
        const iframe = document.getElementById(`iframe-${props.id}`);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const tw = iframeDoc.createElement("script");
        tw.setAttribute("src", "https://cdn.tailwindcss.com");
        tw.onload = function () {
            iframeDoc.body.innerHTML = iframeDoc.body.innerHTML; // re render
        };
        iframeDoc.head.appendChild(tw);
    }, []);

    return (
        <React.Fragment>
            <iframe {...props} id={`iframe-${props.id}`} ref={setContentRef} width="100%" height="500px">
                {mountNode && createPortal(children, mountNode)}
            </iframe>
        </React.Fragment>
    )
}

export default GeneratedCodePreviewer;
