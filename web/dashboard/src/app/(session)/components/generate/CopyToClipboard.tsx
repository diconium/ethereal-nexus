"use client";

import React  from 'react';
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

const GeneratedUISwitch = ({ copyCodeToClipboard }) => {
    const [copied, setCopied] = React.useState<boolean>(false);

    const copy = () => {
        copyCodeToClipboard();
        setCopied(true);
    }

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (copied) setCopied(false);
        }, 1000);

        return () => clearTimeout(timeout);
    }, [copied]);

    return (
        <Button onClick={copy} variant="outline" disabled={copied}>
            {
                copied ?
                    <CheckIcon />
                    :
                    <CopyIcon />
            }
        </Button>
    );
};

export default GeneratedUISwitch;
