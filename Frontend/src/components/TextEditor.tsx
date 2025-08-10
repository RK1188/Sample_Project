import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TextElement } from '../types';

type TextAlign = 'left' | 'center' | 'right';

interface TextEditorProps {
  element: TextElement;
  slideId: string;
  onClose: () => void;
  position: { x: number; y: number };
}

const TextEditor: React.FC<TextEditorProps> = ({ 
  element, 
  slideId, 
  onClose, 
  position 
}) => {
  const { dispatch } = useApp();
  const [text, setText] = useState(element.content || '');
  const [fontSize, setFontSize] = useState(element.fontSize || 16);
  const [fontFamily, setFontFamily] = useState(element.fontFamily || 'Arial');
  const [fontWeight, setFontWeight] = useState(element.fontWeight || 'normal');
  const [fontStyle, setFontStyle] = useState(element.fontStyle || 'normal');
  const [textAlign, setTextAlign] = useState<TextAlign>((element.textAlign || 'left') as TextAlign);
  const [color, setColor] = useState(element.color || '#000000');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-focus and select text when editor opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Handle text change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  // Apply changes to the element
  const applyChanges = useCallback(() => {
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId,
        elementId: element.id,
        updates: {
          text: text,
          content: text,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          textAlign,
          color,
          fill: color
        }
      }
    });
  }, [dispatch, slideId, element.id, text, fontSize, fontFamily, fontWeight, fontStyle, textAlign, color]);

  // Handle save and close
  const handleSave = useCallback(() => {
    applyChanges();
    onClose();
  }, [applyChanges, onClose]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Insert tab character or move to next field
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = (text || '').substring(0, start) + '\t' + (text || '').substring(end);
        setText(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }
  }, [onClose, handleSave, text]);

  // Handle font size change
  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value);
    if (!isNaN(newSize) && newSize > 0) {
      setFontSize(newSize);
    }
  }, []);

  // Handle text formatting
  const toggleBold = useCallback(() => {
    setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold');
  }, [fontWeight]);

  const toggleItalic = useCallback(() => {
    setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic');
  }, [fontStyle]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleSave]);

  return (
    <div 
      ref={editorRef}
      className="text-editor"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      <div className="text-editor-toolbar">
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="font-family-select"
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Courier New">Courier New</option>
          <option value="Verdana">Verdana</option>
        </select>

        <input
          type="number"
          min="8"
          max="72"
          value={fontSize}
          onChange={handleFontSizeChange}
          className="font-size-input"
          title="Font Size"
        />

        <button
          onClick={toggleBold}
          className={`format-button ${fontWeight === 'bold' ? 'active' : ''}`}
          title="Bold"
        >
          B
        </button>

        <button
          onClick={toggleItalic}
          className={`format-button ${fontStyle === 'italic' ? 'active' : ''}`}
          title="Italic"
        >
          I
        </button>

        <select
          value={textAlign}
          onChange={(e) => setTextAlign(e.target.value as 'left' | 'center' | 'right')}
          className="text-align-select"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-picker"
          title="Text Color"
        />
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        className="text-input"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          textAlign,
          color,
          width: `${element.size?.width || element.width || 200}px`,
          minHeight: `${element.size?.height || element.height || 100}px`
        }}
        placeholder="Enter your text..."
        spellCheck={false}
      />

      <div className="text-editor-actions">
        <button onClick={onClose} className="cancel-button">
          Cancel
        </button>
        <button onClick={handleSave} className="save-button">
          Save
        </button>
      </div>

      <div className="text-editor-hint">
        Press Ctrl+Enter to save, Escape to cancel
      </div>
    </div>
  );
};

export default TextEditor;