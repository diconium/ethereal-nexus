"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const GeneratedCodePreviewer = ({ children, ...props }) => {
    const [contentRef, setContentRef] = useState(null);

    const mountNode = contentRef?.contentWindow?.document?.body;

    React.useEffect(() => {
        const iframe = document.getElementById("iframe");
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const tw = iframeDoc.createElement("script");
        tw.setAttribute("src", "https://cdn.tailwindcss.com");
        tw.onload = function () {
            iframeDoc.body.innerHTML = iframeDoc.body.innerHTML; // re render
        };
        iframeDoc.head.appendChild(tw);
    }, []);

    return (
        <div key="asdasd">
            <iframe {...props} id="iframe" ref={setContentRef} width="100%" height="500px">
                {mountNode && createPortal(children, mountNode)}
            </iframe>
        </div>
    )
}

export default GeneratedCodePreviewer;
