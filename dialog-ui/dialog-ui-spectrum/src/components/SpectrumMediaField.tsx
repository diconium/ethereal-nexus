// @ts-nocheck
import React, {useEffect, useMemo, useRef} from 'react';
import {
    View,
    Text,
    Heading,
    Content,
    Flex,
    Button,
    Link, Checkbox, TextField,
    IllustratedMessage
} from "@adobe/react-spectrum";
import ImageAdd from '@spectrum-icons/workflow/ImageAdd';
import {useI18n} from "@/providers";
import { getMimeTypeFromPath } from "../utils/get-mimetype-from-file";

export interface SpectrumMediaFieldProps {
    field: any;
    value: any;
    onChange: (value: any) => void;
    error?: string | null | undefined
}

interface FileData {
    type?: string;
    fileName?: string;
    fileReference?: string;
    altValueFromPageImage?: boolean;
    alt?: string;
    size?: number;
    file?: File;
    path?: string;
}


const PICKER_SRC = "/mnt/overlay/granite/ui/content/coral/foundation/form/pathfield/picker.html"

export const SpectrumMediaField: React.FC<SpectrumMediaFieldProps> = ({field, value = {}, onChange, error}) => {

    const {t} = useI18n();
    const inputRef = useRef<any>(null);

    const { allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/tiff", "image/bmp", "image/gif"]  } = field || {};

    useEffect(() => {

        const coralIsReady = () => {
            window?.Coral.commons.ready(inputRef.current);
        }

        if (inputRef.current && window?.Coral) {
            const Coral = window.Coral;
            const tagList = new Coral.TagList();

            if (tagList) {
                tagList.setAttribute('foundation-autocomplete-value', '');
                tagList.removeAttribute('name');
            }

            if (value?.fileReference) {
                const tag = new Coral.Tag().set({
                    value: value.fileReference,
                    label: {
                        innerHTML: value.fileReference,
                    }
                })

                tagList.items.add(tag)
            }

            inputRef.current.appendChild(tagList);

            coralIsReady()

        } else {
            setTimeout(coralIsReady, 50);
        }
    }, []);


    const [filledSrc, setFilledSrc] = React.useState<FileData>({
        type: value.type || 'image',
        fileName: value.fileName || 'Uploaded file',
        fileReference: value.fileReference,
        altValueFromPageImage: value.altValueFromPageImage ?? false,
        alt: value.alt,
        size: value.size,
        path: value.path
    });

    const hasFileReference = useMemo(() => filledSrc?.fileReference, [filledSrc]);

    const clearFile = () => {
        setFilledSrc({ altValueFromPageImage: false});
    };

    const onClickAlt = () => {
        setFilledSrc((prev: FileData) => ({
                ...prev,
                altValueFromPageImage: !prev.altValueFromPageImage
        }))
    }

    const onAltChange = (value: string) => {
        setFilledSrc((prev: FileData) => ({
            ...prev,
            alt: value
        }))
    }

    useEffect(() => {
        onChange(filledSrc)
    }, [filledSrc]);


    const openPicker = () =>{
        if (!inputRef.current) return;

        const trigger =
          inputRef.current.querySelector('button[is="coral-button"]') ||
          inputRef.current.querySelector('coral-button');

        trigger?.click();
    }

    const mimeTypes = Array.isArray(allowedMimeTypes) ? allowedMimeTypes.join(","): [allowedMimeTypes];

    return (
        <View>
            <Flex direction="column" gap="size-200" >
                <Flex direction={"column"}>
                    <Text UNSAFE_style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '8px'}}>
                        {t(field.label)}
                    </Text>
                    {field.tooltip && (
                        <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                            {t(field.tooltip)}
                        </Text>
                    )}
                    {error && (
                        <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                            {t(error)}
                        </Text>
                    )}
                </Flex>

                <foundation-autocomplete
                    ref={inputRef}
                    pickersrc={PICKER_SRC+ "?path=%2fcontent%2fdam&root=%2fcontent%2fdam&filter=hierarchyNotFile&selectionCount=single"}
                    foundation-autocomplete={"block"}
                    onChange={(e) => {
                        const value = e?.target?.value || '';
                        console.log('User selected:', value);

                        const fileName = value?.split("/")?.pop();

                        const type = getMimeTypeFromPath(fileName);

                        if (mimeTypes && mimeTypes.includes(type)) {
                            setFilledSrc((prev) => ({
                                ...prev,
                                fileReference: value,
                                fileName: value.split('/').pop(),
                            }));
                        }
                    }}
                    style={{ visibility: 'hidden', position: 'absolute', display: 'none' }}
                  >
                  </foundation-autocomplete>
                {!hasFileReference ?
                  <IllustratedMessage alignSelf={"start"}>
                    <ImageAdd size={"XXL"}/>
                    <Content>
                        <Heading level={5}>
                            {t('Drop an asset here.')}
                        </Heading>
                        <Flex direction="column" gap="size-100" alignItems="center">
                            <Button variant={"primary"} onPress={openPicker} height={"size-10"}>
                                {t("Browse Assets")}
                            </Button>
                    </Flex>
                    </Content>
                  </IllustratedMessage> :
                  <Flex direction={"column"} gap="size-200" alignItems={"start"}>
                    <img
                      src={filledSrc?.fileReference}
                      alt={filledSrc?.fileName}
                      style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                      }}
                    />
                    <Flex direction={"row"} gap="size-100" alignContent={"center"}>
                        <Link variant="primary" onPress={clearFile}>
                            {t("Clear")}
                        </Link>
                        <Link variant="primary" onPress={openPicker}>
                            {t("Pick")}
                        </Link>
                    </Flex>
                </Flex>}
                <Flex direction={"column"}>
                    {!filledSrc?.altValueFromPageImage ? <TextField label={t("Alternative text for accessibility")} onChange={onAltChange} value={filledSrc?.alt}></TextField> : null }
                    <Checkbox isSelected={filledSrc?.altValueFromPageImage} value={"true"} onChange={onClickAlt}>{t('Inherit alternative text from page')}</Checkbox>
                </Flex>
            </Flex>
        </View>
    );
};
