import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Flex,
  Divider, Text,
  ContextualHelp, Heading, Content, ActionButton, ActionGroup, Item, TextField, Key, Checkbox,
} from "@adobe/react-spectrum";
import {useI18n} from '../providers';
import {getFieldName} from "@/components/getFieldName.ts";
import TextSvg from "@spectrum-icons/workflow/TextBold";
import TextAlignLeft from "@spectrum-icons/workflow/TextAlignLeft";
import ViewListSvg from "@spectrum-icons/workflow/ViewList";
import FileHTML from "@spectrum-icons/workflow/FileHTML";
import TextEdit from "@spectrum-icons/workflow/TextEdit";
import TagBold from "@spectrum-icons/workflow/TagBold";
import Underline from "@spectrum-icons/workflow/Underline";
import TagItalic from "@spectrum-icons/workflow/TagItalic";
import TextNumbered from "@spectrum-icons/workflow/TextNumbered";
import TextBulleted from "@spectrum-icons/workflow/TextBulleted";
import TextAlignCenter from "@spectrum-icons/workflow/TextAlignCenter";
import TextAlignRight from "@spectrum-icons/workflow/TextAlignRight";
import TextAlignJustify from "@spectrum-icons/workflow/TextAlignJustify";
import LinkSvg from "@spectrum-icons/workflow/Link";
import Unlink from "@spectrum-icons/workflow/Unlink";
import {SpectrumPathbrowserField} from "@/components/SpectrumPathbrowserField.tsx";
import CheckmarkCircle from "@spectrum-icons/workflow/CheckmarkCircle";
import {alignSelection} from "@/components/utils/align-selection.ts";
import {insertList} from "@/components/utils/insert-list.ts";
import {toggleInlineStyle} from "@/components/utils/align-format.ts";
import {useLinkEditor} from "@/components/utils/useLinkEditor.ts";
import TextIndentIncrease from "@spectrum-icons/workflow/TextIndentIncrease";
import TextIndentDecrease from "@spectrum-icons/workflow/TextIndentDecrease";
import { indentIncrease, indentDecrease } from '@/components/utils/list-indent.ts';

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
    const [showToolbar, setShowToolbar] = useState<string>("format");


  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      setSourceContent(newContent);
      onChange(newContent);
    }
  };

    const { link, setLink, removeLink, clearLinkHighlight, highlightSelectionForLink, createLink, linkHighlightEl } = useLinkEditor(editorRef, handleContentChange, showToolbar === "link");


    useEffect(() => {
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
                toggleInlineStyle('bold', editorRef);
                break;
            case 'italic':
                toggleInlineStyle('italic', editorRef);
                break;
            case 'underline':
                toggleInlineStyle('underline', editorRef);
                break;
            case 'insertUnorderedList':
                insertList('ul');
                break;
            case 'insertOrderedList':
                insertList('ol');
                break;
            case 'insertIndentIncrease':
                indentIncrease(editorRef);
                break;
            case 'insertIndentDecrease':
                indentDecrease(editorRef);
                break;
            case 'alignLeft':
                alignSelection('left');
                break;
            case 'alignCenter':
                alignSelection('center');
                break;
            case 'alignRight':
                alignSelection('right');
                break;
            case 'justify':
                alignSelection('justify');
                break;
            default:
                break;
        }
        editorRef.current.focus();
        handleContentChange();
    };


  const handleToolbarAction = (command: string) => {
        applyFormatting(command);
    };


    const onShowToolbar = (action: string) => {
      switch (action) {
        case 'sourceToggle':
          toggleSourceMode();
          break;
        case 'link':
          setShowToolbar(action);
          highlightSelectionForLink();
          break;
        default:
          if (showToolbar === 'link') {
            setLink({target: '_self'});
            clearLinkHighlight();
          }
          setShowToolbar(action);
      }
    }



    return (
        <View>
            <Flex alignItems="center" justifyContent="space-between" marginBottom="size-100">
                <Text UNSAFE_style={{fontSize: '12px'}}>
                    {t(field.label ?? '')}
                    {field.required && <span style={{color: 'red'}}> *</span>}
                </Text>

                {field.tooltip && (
                    <ContextualHelp variant="info">
                        <Heading>{t('spectrum.richtext.help', undefined, undefined, 'Help')}</Heading>
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

                <Flex gap="size-100" alignItems="center" >
                  <ActionGroup isDisabled={isSourceMode} selectionMode={"single"} isQuiet defaultSelectedKeys={['format']} disallowEmptySelection onAction={(action: Key) => onShowToolbar(action?.toString())}>
                    <Item key={"format"} >
                      <TextSvg />
                    </Item>
                    <Item key={"justify"}>
                      <TextAlignLeft />
                    </Item>
                    <Item key={"list"}>
                      <ViewListSvg />
                    </Item>
                    <Item key={"link"} >
                      <LinkSvg/>
                    </Item>
                  </ActionGroup>
                  <ActionButton onPress={removeLink} isDisabled={isSourceMode}>
                    <Unlink />
                  </ActionButton>
                  <ActionButton onPress={() => setIsSourceMode((prev) => !prev)} >
                    {isSourceMode ? <TextEdit/> : <FileHTML />}
                  </ActionButton>
                </Flex>

                  {showToolbar === "justify" && (
                    <Flex minHeight={"size-500"} alignItems="center" justifyContent="left" gap={"size-100"}>
                      {/* Justify Left */}
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('alignLeft')}
                        isDisabled={isSourceMode}
                      >
                        <TextAlignLeft />
                      </ActionButton>
                      {/* Justify Center */}
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('alignCenter')}
                        isDisabled={isSourceMode}
                      >
                        <TextAlignCenter />
                      </ActionButton>
                      {/* Justify Right */}
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('alignRight')}
                        isDisabled={isSourceMode}
                      >
                        <TextAlignRight />
                      </ActionButton>
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('justify')}
                        isDisabled={isSourceMode}
                      >
                        <TextAlignJustify />
                      </ActionButton>

                    </Flex>
                  )}
                  {showToolbar === "list" && (
                    <Flex minHeight={"size-500"} alignItems="center" justifyContent="left" gap={"size-100"}>
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('insertUnorderedList')}
                        isDisabled={isSourceMode}
                      >
                        <TextBulleted />
                      </ActionButton>
                      <ActionButton isQuiet
                        onPress={() => handleToolbarAction('insertOrderedList')}
                        isDisabled={isSourceMode}
                      >
                        <TextNumbered />
                      </ActionButton>
                      <ActionButton isQuiet
                                    onPress={() => handleToolbarAction('insertIndentIncrease')}
                                    isDisabled={isSourceMode}
                      >
                        <TextIndentIncrease />
                      </ActionButton>
                      <ActionButton isQuiet
                                    onPress={() => handleToolbarAction('insertIndentDecrease')}
                                    isDisabled={isSourceMode}
                      >
                        <TextIndentDecrease />
                      </ActionButton>
                    </Flex>
                  )}
                  {showToolbar === "unlink" && (<Flex minHeight={"size-500"} children={undefined} /> )}
                  {showToolbar === "link" && (
                    <Flex minHeight={"size-500"} alignItems="end" justifyContent="left" gap={"size-100"}>
                      <SpectrumPathbrowserField
                        value={link?.href || ''}
                        key={"navigationRoot"}
                        field={{ label: t("spectrum.richtext.linkPathLabel", undefined, undefined, "Link Path"), required: false}}
                        error={error}
                        onChange={(value) => setLink((prev) => ({...prev, href: value}))}
                      />
                      <TextField
                        label={t("spectrum.richtext.alternativeText", undefined, undefined, "Alternative Text")}
                        value={link?.alt}
                        onChange={(value) => setLink((prev) => ({...prev, alt: value}))}
                      />
                      <Checkbox
                        isSelected={link?.target === '_blank'}
                        onChange={(isSelected) => setLink((prev) => ({...prev, target: isSelected ? '_blank' : '_self'}))}
                      >
                        {t("spectrum.richtext.openInNewTab", undefined, undefined, "Open in new tab")}
                      </Checkbox>
                      <ActionButton
                        isDisabled={!link?.target || (!linkHighlightEl && !window.getSelection()?.toString())}
                        onPress={createLink}
                      >
                        <CheckmarkCircle color={"positive"} />
                      </ActionButton>
                    </Flex>
                  )}
                  {showToolbar === "format" && (
                    <Flex minHeight={"size-500"} alignItems="center" justifyContent="left" gap={"size-100"}>
                        <ActionButton isQuiet
                          onPress={() => handleToolbarAction('bold')}
                          isDisabled={isSourceMode}
                        >
                          <TagBold />
                        </ActionButton>
                        <ActionButton isQuiet
                          onPress={() => handleToolbarAction('italic')}
                          isDisabled={isSourceMode}
                        >
                          <TagItalic />
                        </ActionButton>
                        <ActionButton isQuiet
                          onPress={() => handleToolbarAction('underline')}
                          isDisabled={isSourceMode}
                        >
                          <Underline />
                        </ActionButton>
                    </Flex> )}
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
                        placeholder={t('spectrum.richtext.sourcePlaceholder', undefined, undefined, 'Enter HTML source code...') }
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
                        data-placeholder={t(field.placeholder) || t('spectrum.richtext.placeholder', undefined, undefined, 'Enter your text here...')}
                    />
                )}
            </View>

            {/* Hidden input for form submission */}
            <input
                type="hidden"
                name={getFieldName(field)}
                value={content}
                readOnly
            />
        </View>
    );
};
