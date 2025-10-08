import React from 'react';
import {
    View,
    Text,
    DropZone,
    IllustratedMessage,
    Heading,
    Content,
    Flex,
    Button,
    FileTrigger
} from "@adobe/react-spectrum";
import ImageAdd from '@spectrum-icons/workflow/ImageAdd';

export interface SpectrumMediaFieldProps {
    field: any;
    value: any;
    onChange: (value: any) => void;
    error?: string | null | undefined
}

export const SpectrumMediaField: React.FC<SpectrumMediaFieldProps> = ({field, value, onChange, error}) => {
    interface FileData {
        type: string;
        name: string;
        src: string;
        size?: number;
        file?: File;
        path?: string;
    }

    const [filledSrc, setFilledSrc] = React.useState<FileData | null>(value ? {
        type: value.type || 'image/jpeg',
        name: value.name || value.fileName || 'Uploaded file',
        src: value.src || value.url || value,
        size: value.size,
        path: value.path
    } : null);

    React.useEffect(() => {
        if (value && value !== filledSrc?.src) {
            setFilledSrc({
                type: value.type || 'image/jpeg',
                name: value.name || value.fileName || 'Uploaded file',
                src: value.src || value.url || value,
                size: value.size,
                path: value.path
            });
        } else if (!value && filledSrc) {
            setFilledSrc(null);
        }
    }, [value, filledSrc?.src]);

    const acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    const handleDrop = async (e: any) => {
        e.items.find(async (item: any) => {
            if (item.kind === 'file') {
                const acceptedType = acceptedFileTypes.find(type => type === item.type);
                if (acceptedType) {
                    const file = await item.getFile();
                    const fileData = {
                        type: file.type,
                        name: file.name,
                        size: file.size,
                        src: URL.createObjectURL(file),
                        file: file
                    };
                    setFilledSrc(fileData);
                    onChange(fileData);
                }
            } else if (item.kind === 'text') {
                const acceptedType = acceptedFileTypes.find(type =>
                    item.types.includes(type)
                );
                if (acceptedType) {
                    const fileUrl = await item.getText(acceptedType);
                    const fileData = {
                        type: acceptedType,
                        name: fileUrl,
                        src: fileUrl
                    };
                    setFilledSrc(fileData);
                    onChange(fileData);
                }
            }
        });
    };

    const handleAEMAssetPicker = () => {
        const pickerUrl = "/mnt/overlay/dam/gui/content/assetselector.html";
        const dialog = new (window as any).Coral.Dialog();
        dialog.id = (window as any).Coral.commons.getUID();
        dialog.header.innerHTML = "Select an Asset";
        dialog.classList.add("coral3-Dialog");
        dialog.content.innerHTML = `
      <iframe style="width:100%;height:600px;border:none;" src="${pickerUrl}"></iframe>
    `;
        dialog.footer.innerHTML = `
      <button is="coral-button" class="coral3-Button coral3-Button--secondary" type="button" data-dismiss="modal">Cancel</button>
      <button is="coral-button" class="coral3-Button coral3-Button--primary" type="button" id="select-asset-btn">Select</button>
    `;
        document.body.appendChild(dialog);
        const selectButton = dialog.querySelector('#select-asset-btn');
        const iframe = dialog.querySelector('iframe');
        if (selectButton) {
            selectButton.addEventListener('click', () => {
                try {
                    const iframeWindow = iframe?.contentWindow;
                    if (iframeWindow && iframeWindow.location) {
                        const selectedItems = iframeWindow.document.querySelectorAll('.foundation-collection-item.is-selected');
                        if (selectedItems.length > 0) {
                            const selectedItem = selectedItems[0];
                            const selectedPath = selectedItem.getAttribute('data-foundation-collection-item-id') ||
                                selectedItem.getAttribute('data-path');
                            if (selectedPath) {
                                const fileName = selectedPath.split('/').pop() || 'Asset';
                                const assetData = {
                                    type: 'image/jpeg',
                                    name: fileName,
                                    src: selectedPath,
                                    path: selectedPath,
                                    size: undefined
                                };
                                setFilledSrc(assetData);
                                onChange(assetData);
                                dialog.hide();
                                setTimeout(() => {
                                    if (document.body.contains(dialog)) {
                                        document.body.removeChild(dialog);
                                    }
                                }, 100);
                            } else {
                                alert('Please select an asset first.');
                            }
                        } else {
                            alert('Please select an asset first.');
                        }
                    }
                } catch (error) {
                    console.error('Error getting selected asset:', error);
                    alert('Error getting selected asset. Please try again.');
                }
            });
        }
        dialog.addEventListener('coral-overlay:close', () => {
            setTimeout(() => {
                if (document.body.contains(dialog)) {
                    document.body.removeChild(dialog);
                }
            }, 100);
        });
        dialog.show();
    };

    const handleFileSelect = (e: FileList | null) => {
        if (e && e.length > 0) {
            const file = Array.from(e).find((file) =>
                acceptedFileTypes.includes(file.type)
            );
            if (file) {
                const fileData = {
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    src: URL.createObjectURL(file),
                    file: file
                };
                setFilledSrc(fileData);
                onChange(fileData);
            }
        }
    };

    const clearFile = () => {
        setFilledSrc(null);
        onChange(null);
    };

    return (
        <View>
            <Text UNSAFE_style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '8px'}}>
                {field.label}
            </Text>
            {field.tooltip && (
                <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                    {field.tooltip}
                </Text>
            )}
            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {error}
                </Text>
            )}
            <DropZone
                maxWidth="size-3000"
                isFilled={!!filledSrc}
                getDropOperation={(types) =>
                    acceptedFileTypes.some(type => types.has(type)) ? 'copy' : 'cancel'
                }
                onDrop={handleDrop}
            >
                <IllustratedMessage>
                    <ImageAdd/>
                    <Heading>
                        {filledSrc
                            ? `${filledSrc.name}`
                            : 'Drag and drop an image here'}
                    </Heading>
                    <Content>
                        {filledSrc ? (
                            <Flex direction="column" gap="size-100" alignItems="center">
                                <Text UNSAFE_style={{fontSize: '12px', color: '#666'}}>
                                    {filledSrc.type} {filledSrc.size ? `• ${Math.round(filledSrc.size / 1024)}KB` : ''}
                                    {filledSrc.path && <><br/>Path: {filledSrc.path}</>}
                                </Text>
                                <Flex gap="size-100">
                                    <Button variant="secondary" onPress={handleAEMAssetPicker}>
                                        Replace from Assets
                                    </Button>
                                    <FileTrigger
                                        acceptedFileTypes={acceptedFileTypes}
                                        onSelect={handleFileSelect}
                                    >
                                        <Button variant="secondary">Upload New</Button>
                                    </FileTrigger>
                                    <Button variant="secondary" onPress={clearFile}>
                                        Remove
                                    </Button>
                                </Flex>
                            </Flex>
                        ) : (
                            <Flex direction="column" gap="size-100" alignItems="center">
                                <Button variant="primary" onPress={handleAEMAssetPicker}>
                                    Browse Assets
                                </Button>
                                <Text UNSAFE_style={{fontSize: '12px', color: '#666'}}>
                                    or
                                </Text>
                                <FileTrigger
                                    acceptedFileTypes={acceptedFileTypes}
                                    onSelect={handleFileSelect}
                                >
                                    <Button variant="secondary">Upload New File</Button>
                                </FileTrigger>
                            </Flex>
                        )}
                    </Content>
                </IllustratedMessage>
            </DropZone>
            {filledSrc?.src && (
                <View marginTop="size-200">
                    <Text UNSAFE_style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>
                        Preview:
                    </Text>
                    <img
                        src={filledSrc.src}
                        alt={filledSrc.name}
                        style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            objectFit: 'cover',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    />
                </View>
            )}
        </View>
    );
};
