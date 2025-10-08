import React, {useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    Flex,
    Button,
    ButtonGroup,
    Divider,
    ContextualHelp, Heading, Content
} from "@adobe/react-spectrum";
import {useI18n} from '../providers';

interface SpectrumRichTextEditorFieldProps {
    field: any;
    value: string;
    onChange: (value: string) => void;
    error?: string | null;
}

export const SpectrumRichTextEditorField: React.FC<SpectrumRichTextEditorFieldProps> = ({
                                                                                            field,
                                                                                            value,
                                                                                            onChange,
                                                                                            error
                                                                                        }) => {
    const {t} = useI18n();
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState<string>(value || '');
    const [isEditorFocused, setIsEditorFocused] = useState<boolean>(false);
    const [isSourceMode, setIsSourceMode] = useState<boolean>(false);
    const [sourceContent, setSourceContent] = useState<string>(value || '');

    useEffect(() => {
        setContent(value || '');
        setSourceContent(value || '');
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    // Add useEffect to handle content restoration when switching modes
    useEffect(() => {
        if (!isSourceMode && editorRef.current && sourceContent) {
            // When switching to visual mode, restore content from sourceContent
            editorRef.current.innerHTML = sourceContent;
        }
    }, [isSourceMode]);

    const handleContentChange = () => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            setContent(newContent);
            setSourceContent(newContent);
            onChange(newContent);
        }
    };

    const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setSourceContent(newContent);
        setContent(newContent);
        onChange(newContent);
    };

    const toggleSourceMode = () => {
        if (isSourceMode) {
            // Switching from source to visual mode
            setIsSourceMode(false);
            // Content will be restored by useEffect
        } else {
            // Switching from visual to source mode
            if (editorRef.current) {
                const currentContent = editorRef.current.innerHTML;
                setSourceContent(currentContent);
                setContent(currentContent);
            }
            setIsSourceMode(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Handle common keyboard shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    applyFormatting('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    applyFormatting('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    applyFormatting('underline');
                    break;
            }
        }
    };

    // Modern implementation using Selection API instead of deprecated execCommand
    const applyFormatting = (command: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

        const range = selection.getRangeAt(0);

        // Ensure we're working within the editor
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
            editorRef.current.focus();
            return;
        }

        switch (command) {
            case 'bold':
                toggleInlineStyle(range, 'bold');
                break;
            case 'italic':
                toggleInlineStyle(range, 'italic');
                break;
            case 'underline':
                toggleInlineStyle(range, 'underline');
                break;
            case 'insertUnorderedList':
                insertList('ul');
                break;
            case 'insertOrderedList':
                insertList('ol');
                break;
            default:
                break;
        }

        editorRef.current.focus();
        handleContentChange();
    };

    const toggleInlineStyle = (range: Range, command: string) => {
        if (range.collapsed) {
            // If no text is selected, just focus the editor
            return;
        }

        const selectedText = range.toString();
        if (!selectedText) return;

        // Create the appropriate HTML element based on command
        let targetTagName: string;
        switch (command) {
            case 'bold':
                targetTagName = 'strong';
                break;
            case 'italic':
                targetTagName = 'em';
                break;
            case 'underline':
                targetTagName = 'u';
                break;
            default:
                return;
        }

        // Simple approach: Check if the current selection's start node has the formatting
        const startContainer = range.startContainer;
        const parentElement = startContainer.nodeType === Node.TEXT_NODE
            ? startContainer.parentElement
            : startContainer as Element;

        // Check if any parent element matches our target tag
        let isFormatted = false;
        let formattedElement: Element | null = null;
        let currentElement = parentElement;

        while (currentElement && currentElement !== editorRef.current) {
            if (currentElement.tagName && currentElement.tagName.toLowerCase() === targetTagName.toLowerCase()) {
                isFormatted = true;
                formattedElement = currentElement;
                break;
            }
            currentElement = currentElement.parentElement;
        }

        if (isFormatted && formattedElement) {
            // Remove formatting by unwrapping the element
            const parent = formattedElement.parentNode;
            if (parent) {
                while (formattedElement.firstChild) {
                    parent.insertBefore(formattedElement.firstChild, formattedElement);
                }
                parent.removeChild(formattedElement);
            }
        } else {
            // Apply formatting
            const element = document.createElement(targetTagName);
            try {
                range.surroundContents(element);
            } catch (e) {
                // Fallback: extract contents, wrap in element, and insert back
                const contents = range.extractContents();
                element.appendChild(contents);
                range.insertNode(element);
            }
        }

        // Clear and restore selection to maintain cursor position
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            // Create a new range at the end of the modified content
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current!);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    };

    const insertList = (listType: 'ul' | 'ol') => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) return;

        const range = selection.getRangeAt(0);
        const list = document.createElement(listType);
        const listItem = document.createElement('li');

        if (range.collapsed) {
            // No selection, just insert an empty list item
            listItem.innerHTML = '<br>';
        } else {
            // Move selected content into the list item
            const contents = range.extractContents();
            listItem.appendChild(contents);
        }

        list.appendChild(listItem);
        range.insertNode(list);

        // Position cursor at the end of the list item
        const newRange = document.createRange();
        newRange.setStartAfter(listItem);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    };

    const handleToolbarAction = (command: string) => {
        applyFormatting(command);
    };

    return (
        <View>
            <Flex alignItems="center" justifyContent="space-between" marginBottom="size-100">
                <Text UNSAFE_style={{fontSize: '12px'}}>
                    {t(field.label ?? '')}
                    {field.required && <span style={{color: 'red'}}> *</span>}
                </Text>

                {field.tooltip && (
                    <ContextualHelp variant="info">
                        <Heading>{t('spectrum.richtext.help') || 'Help'}</Heading>
                        <Content>
                            <Text>{t(field.tooltip ?? '')}</Text>
                        </Content>
                    </ContextualHelp>
                )}
            </Flex>
            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {error}
                </Text>
            )}

            <View
                borderWidth="thin"
                borderColor="gray-400"
                borderRadius="medium"
                UNSAFE_style={{
                    backgroundColor: 'var(--spectrum-global-color-gray-50)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    ...(isEditorFocused && {
                        borderColor: 'var(--spectrum-global-color-blue-400)',
                        boxShadow: '0 0 0 2px var(--spectrum-global-color-blue-200)'
                    })
                }}
            >
                {/* Toolbar */}
                <View padding="size-100" backgroundColor="gray-75">
                    <Flex gap="size-50" alignItems="center" justifyContent="space-between">
                        <Flex gap="size-50" alignItems="center">
                            <ButtonGroup>
                                <Button
                                    variant="secondary"
                                    onPress={() => handleToolbarAction('bold')}
                                    isDisabled={isSourceMode}
                                    UNSAFE_style={{
                                        minWidth: '32px',
                                        padding: '4px 8px',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >
                                    {t('spectrum.richtext.bold') || 'B'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onPress={() => handleToolbarAction('italic')}
                                    isDisabled={isSourceMode}
                                    UNSAFE_style={{
                                        minWidth: '32px',
                                        padding: '4px 8px',
                                        fontStyle: 'italic',
                                        fontSize: '14px'
                                    }}
                                >
                                    {t('spectrum.richtext.italic') || 'I'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onPress={() => handleToolbarAction('underline')}
                                    isDisabled={isSourceMode}
                                    UNSAFE_style={{
                                        minWidth: '32px',
                                        padding: '4px 8px',
                                        textDecoration: 'underline',
                                        fontSize: '14px'
                                    }}
                                >
                                    {t('spectrum.richtext.underline') || 'U'}
                                </Button>
                            </ButtonGroup>

                            <Divider orientation="vertical" size="S"/>

                            <ButtonGroup>
                                <Button
                                    variant="secondary"
                                    onPress={() => handleToolbarAction('insertUnorderedList')}
                                    isDisabled={isSourceMode}
                                    UNSAFE_style={{fontSize: '12px', padding: '4px 8px'}}
                                >
                                    {t('spectrum.richtext.bulletList') || '• List'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onPress={() => handleToolbarAction('insertOrderedList')}
                                    isDisabled={isSourceMode}
                                    UNSAFE_style={{fontSize: '12px', padding: '4px 8px'}}
                                >
                                    {t('spectrum.richtext.numberedList') || '1. List'}
                                </Button>
                            </ButtonGroup>
                        </Flex>

                        <Button
                            variant={isSourceMode ? "accent" : "secondary"}
                            onPress={toggleSourceMode}
                            UNSAFE_style={{fontSize: '12px', padding: '4px 8px'}}
                        >
                            {isSourceMode ? t('spectrum.richtext.visualMode') || 'Visual' : t('spectrum.richtext.sourceMode') || 'Source'}
                        </Button>
                    </Flex>
                </View>

                <Divider size="S"/>

                {/* Editor - Visual or Source Mode */}
                {isSourceMode ? (
                    <textarea
                        value={sourceContent}
                        onChange={handleSourceChange}
                        onFocus={() => setIsEditorFocused(true)}
                        onBlur={() => setIsEditorFocused(false)}
                        style={{
                            minHeight: '120px',
                            width: '100%',
                            padding: '12px',
                            border: 'none',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: '12px',
                            lineHeight: '1.4',
                            color: 'var(--spectrum-global-color-gray-900)',
                            backgroundColor: 'white'
                        }}
                        placeholder={t('spectrum.richtext.sourcePlaceholder') || 'Enter HTML source code...'}
                    />
                ) : (
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleContentChange}
                        onFocus={() => setIsEditorFocused(true)}
                        onBlur={() => setIsEditorFocused(false)}
                        onKeyDown={handleKeyDown}
                        style={{
                            minHeight: '120px',
                            padding: '12px',
                            outline: 'none',
                            lineHeight: '1.5',
                            fontFamily: 'var(--spectrum-font-family-base)',
                            fontSize: '14px',
                            color: 'var(--spectrum-global-color-gray-900)',
                            backgroundColor: 'white'
                        }}
                        data-placeholder={t(field.placeholder ?? '') || t('spectrum.richtext.placeholder') || 'Enter your text here...'}
                    />
                )}
            </View>

            {/* Hidden input for form submission */}
            <input
                type="hidden"
                name={field.name || field.id}
                value={content}
                readOnly
            />
        </View>
    );
};
