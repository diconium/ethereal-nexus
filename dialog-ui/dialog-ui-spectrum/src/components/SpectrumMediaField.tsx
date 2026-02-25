// @ts-nocheck
import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import {ClickEventDetails} from "storybook/highlight";

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



export const SpectrumMediaField: React.FC<SpectrumMediaFieldProps> = ({field, value = {}, onChange, error}) => {

    const {t} = useI18n();
    const fileUploadRef = useRef<any>(null);
    const fileRefInput = useRef<HTMLDivElement>(null);
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [loaded, setLoaded] = useState<boolean>(false);

    const { allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/tiff", "image/bmp", "image/gif"]  } = field || {};


    const [filledSrc, setFilledSrc] = React.useState<FileData>({
        type: value.type || 'image',
        fileName: value.fileName,
        fileReference: value.fileReference,
        altValueFromPageImage: value.altValueFromPageImage ?? false,
        alt: value.alt,
        size: value.size,
        path: value.path
    });

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


    const mimeTypes = Array.isArray(allowedMimeTypes) ? allowedMimeTypes.join(","): [allowedMimeTypes];

    useEffect(() => {
        const el = fileUploadRef.current;
        if (!el || !window?.Granite) return;

        const $ = window.Granite.$;

        const onChangeValue = () => {
            console.debug("[SpectrumMediaField]: Changing image to:", fileRefInput?.current?.value);
            setFilledSrc((prev) => ({
                ...prev,
                fileReference: fileRefInput?.current?.value
            }));
        };

        const clearImage = (e: Event) => {

            if (e.target.matches("[coral-fileupload-clear]") || e.target.parentElement?.matches("[coral-fileupload-clear]")) {
                console.log("[SpectrumMediaField] Resetting image field value due to clear action");
                onChangeValue();
            }
        }

        $(el).on("foundation-field-change", onChangeValue);
        $(el).on("click", clearImage);

        return () => {
            $(el).off("foundation-field-change", onChangeValue);
            $(el).off("click", clearImage);
        };
    }, []);

    useEffect(() => {
        if (loaded) {
            return;
        }

        const el = fileUploadRef.current;

        if (!el || !window.Granite) return;

        Coral.commons.ready(el, () => {
            const dialog = el.closest("form.cq-dialog");
            if (dialog) {
                window.Granite.$(dialog).trigger("foundation-contentloaded");

                fileRefInput.current.setAttribute("accept", mimeTypes);
            }
        });
    }, [loaded, mimeTypes]);


    useEffect(() => {

        if (!fileUploadRef || !thumbnailRef || loaded) {
            return
        }

        const fileReference = value.fileReference;

        console.debug("[SpectrumMediaField] Updating thumbnail with fileReference:", fileReference);

        if (fileReference) {
            const img = thumbnailRef.current;

            img.innerHTML = `<img loading="lazy" class="cq-dd-image" src=${fileReference} alt=${value.alt} tabindex="-1">`;
            fileUploadRef.current.classList.add("is-filled");

            const btn = buttonRef.current;
            btn.setAttribute("data-cq-fileupload-filereference", fileReference);
        }

        setLoaded(true);

    }, [value.fileReference, thumbnailRef.current, fileUploadRef.current, loaded]);

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
                <coral-fileupload
                  ref={fileUploadRef}
                  className="coral-Form-field cmp-image__editor-file-upload cq-FileUpload cq-droptarget coral3-FileUpload"
                  name={`./${field.name}`}
                  accept={mimeTypes}
                  data-foundation-field
                  async
                  autoStart
                >
                    <input
                      type="hidden"
                      ref={fileRefInput}
                      accept={mimeTypes}
                      name={`./${field.name}/fileReference`}
                      value={filledSrc?.fileReference || ''}
                      data-cq-fileupload-parameter="filereference"
                    />
                    <input
                      type="hidden"
                      name={`./${field.name}/fileName`}
                      data-cq-fileupload-parameter="filename"
                    />
                    <div class="cq-FileUpload-thumbnail">
                        <div ref={thumbnailRef} class="cq-FileUpload-thumbnail-img" data-cq-fileupload-thumbnail-img />
                        <button class="cq-FileUpload-edit coral3-Button coral3-Button--quiet"
                                ref={buttonRef}
                                data-cq-fileupload-viewinadminuri="/assetdetails.html{+item}"
                                type="button"
                                autocomplete="off" variant="quiet" trackingfeature=""
                                trackingelement="edit" tracking="ON" size="M">
                            <coral-button-label>{t("Edit")}</coral-button-label>
                        </button>
                        <button type="button" class="cq-FileUpload-clear coral3-Button coral3-Button--quiet"
                                variant="quiet" coral-fileupload-clear="" size="M">
                            <coral-button-label>{t("Clear")}</coral-button-label>
                        </button>
                        <button type="button" class="cq-FileUpload-picker coral3-Button coral3-Button--quiet"
                                variant="quiet" aria-haspopup="dialog" size="M">
                            <coral-button-label>{t("Pick")}</coral-button-label>
                        </button>
                        <div>
                            <button type="button" variant="quiet" aria-label="Pick an asset"
                                    aria-haspopup="dialog" icon="image"
                                    class="cq-FileUpload-icon cq-FileUpload-picker coral3-Button coral3-Button--quiet"
                                    size="M" iconautoarialabel="off">
                                <coral-icon className="coral3-Icon coral3-Icon--sizeS coral3-Icon--image" icon="image"
                                            size="S" autoarialabel="off" role="img" aria-label="Image"></coral-icon>
                                <coral-button-label></coral-button-label>
                            </button>
                            <span class="cq-FileUpload-label">{t("Drop an asset here.")}</span></div>
                    </div>
                </coral-fileupload>
                <Flex direction={"column"}>
                    {!filledSrc?.altValueFromPageImage ?
                      <TextField label={t("Alternative text for accessibility")} onChange={onAltChange}
                                 value={filledSrc?.alt}></TextField> : null}
                    <Checkbox isSelected={filledSrc?.altValueFromPageImage} value={"true"}
                              onChange={onClickAlt}>{t('Inherit alternative text from page')}</Checkbox>
                </Flex>
            </Flex>
        </View>
    );
};
