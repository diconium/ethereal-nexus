"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const GeneratedCodePreviewer = ({ children, ...props }) => {
    const [contentRef, setContentRef] = useState(null);
    const [height, setHeight] = React.useState("0px");

    const mountNode = contentRef?.contentWindow?.document?.body;

    React.useEffect(() => {
        const iframe = document.getElementById(`iframe-${props.id}`);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const tw = iframeDoc.createElement("script");
        tw.setAttribute("src", "https://cdn.tailwindcss.com");
        tw.onload = function () {
            iframeDoc.body.innerHTML = iframeDoc.body.innerHTML; // re render
            if (iframeDoc.body?.scrollHeight) setHeight(`${iframeDoc.body.scrollHeight}px`);
        };
        iframeDoc.head.appendChild(tw);
    }, []);

    return (
        <iframe {...props} id={`iframe-${props.id}`} ref={setContentRef} width="100%" height={height}>
            {mountNode && createPortal(children, mountNode)}
        </iframe>
    )
}

export default GeneratedCodePreviewer;
