import React, { useState, useEffect, useRef, useId } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Link2, Code, 
  Heading1, Heading2, Table, Undo, Redo, Sparkles
} from 'lucide-react';
import './RichTextEditor.css';

// Fallback high-fidelity WYSIWYG toolbar when CKEditor is loading or unavailable
const FallbackRichEditor = ({ value, onChange, placeholder, minHeight, isDark }) => {
  const editorRef = useRef(null);
  const [htmlMode, setHtmlMode] = useState(false);

  useEffect(() => {
    if (editorRef.current && !htmlMode && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, htmlMode]);

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex flex-col w-full border border-theme-border rounded-lg overflow-hidden bg-white dark:bg-theme-surface">
      {/* CKEditor-like Multi-row Toolbar */}
      <div className="p-1.5 bg-gray-100 dark:bg-theme-surface-alt/70 border-b border-theme-border flex flex-wrap items-center gap-1 text-xs select-none">
        <button
          type="button"
          onClick={() => setHtmlMode(!htmlMode)}
          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${htmlMode ? 'bg-brand-orange text-white' : 'hover:bg-gray-200 dark:hover:bg-theme-surface-hover text-theme-main'}`}
          title="Source HTML"
        >
          Source
        </button>
        <span className="w-px h-4 bg-gray-300 dark:bg-theme-border mx-0.5" />

        <button type="button" onClick={() => exec('undo')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Undo">
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('redo')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Redo">
          <Redo className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-gray-300 dark:bg-theme-border mx-0.5" />

        <button type="button" onClick={() => exec('bold')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main font-bold" title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('italic')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main italic" title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('underline')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main underline" title="Underline">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('strikeThrough')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main line-through" title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-gray-300 dark:bg-theme-border mx-0.5" />

        <button type="button" onClick={() => exec('justifyLeft')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('justifyCenter')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('justifyRight')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('justifyFull')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Justify">
          <AlignJustify className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-gray-300 dark:bg-theme-border mx-0.5" />

        <button type="button" onClick={() => exec('insertUnorderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded text-theme-main" title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-gray-300 dark:bg-theme-border mx-0.5" />

        <select
          onChange={(e) => {
            if (e.target.value) exec('formatBlock', `<${e.target.value}>`);
          }}
          defaultValue=""
          className="text-[11px] px-1.5 py-0.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none"
        >
          <option value="" disabled>Format</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="pre">Formatted</option>
        </select>

        <select
          onChange={(e) => {
            if (e.target.value) exec('fontSize', e.target.value);
          }}
          defaultValue=""
          className="text-[11px] px-1.5 py-0.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none"
        >
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Huge</option>
        </select>
      </div>

      {/* Editor Body */}
      {htmlMode ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ minHeight: `${minHeight}px` }}
          placeholder={placeholder}
          className="w-full p-3 font-mono text-xs bg-white dark:bg-theme-surface text-theme-main focus:outline-none resize-y"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight: `${minHeight}px` }}
          data-placeholder={placeholder}
          className="w-full p-3 text-xs text-theme-main focus:outline-none overflow-y-auto leading-relaxed"
        />
      )}
    </div>
  );
};

const RichTextEditor = ({ 
  name,
  value, 
  onChange, 
  placeholder = 'Start typing...',
  className = "",
  minHeight = 200
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const autoId = useId();
  const editorId = (name || autoId).replace(/[^a-zA-Z0-9_]/g, '_');
  const [ckError, setCkError] = useState(false);
  const [CKEditorComponent, setCKEditorComponent] = useState(null);
  const editorInstanceRef = useRef(null);

  // Dynamically load CKEditor to prevent SSR / React 19 crashes
  useEffect(() => {
    let mounted = true;
    import('ckeditor4-react')
      .then((mod) => {
        if (mounted) {
          setCKEditorComponent(() => mod.CKEditor);
        }
      })
      .catch((err) => {
        console.warn('[CKEditor load warning, using native rich editor]:', err);
        if (mounted) setCkError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const applyThemeToIframe = (editor) => {
    if (!editor) return;
    try {
      const doc = editor.document?.$;
      if (doc) {
        let styleTag = doc.getElementById('ck-theme-custom-style');
        if (!styleTag) {
          styleTag = doc.createElement('style');
          styleTag.id = 'ck-theme-custom-style';
          if (doc.head) doc.head.appendChild(styleTag);
        }
        if (styleTag) {
          styleTag.textContent = `
            html, body {
              background-color: ${isDark ? '#14151A' : '#ffffff'} !important;
              color: ${isDark ? '#F3F4F6' : '#111827'} !important;
              caret-color: ${isDark ? '#F3F4F6' : '#111827'} !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            }
            body.cke_editable {
              background-color: ${isDark ? '#14151A' : '#ffffff'} !important;
              color: ${isDark ? '#F3F4F6' : '#111827'} !important;
            }
          `;
        }
        if (doc.documentElement) {
          doc.documentElement.style.setProperty('background-color', isDark ? '#14151A' : '#ffffff', 'important');
        }
        if (doc.body) {
          doc.body.style.setProperty('background-color', isDark ? '#14151A' : '#ffffff', 'important');
          doc.body.style.setProperty('color', isDark ? '#F3F4F6' : '#111827', 'important');
        }
      }
    } catch {
      // safe ignore
    }
  };

  useEffect(() => {
    if (editorInstanceRef.current) {
      applyThemeToIframe(editorInstanceRef.current);
    }
  }, [isDark, theme]);

  if (ckError || !CKEditorComponent) {
    return (
      <FallbackRichEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        isDark={isDark}
      />
    );
  }

  const CKEditor = CKEditorComponent;

  return (
    <div className={`rich-text-editor-wrapper w-full overflow-hidden rounded-lg border border-theme-border shadow-sm transition-colors ${className}`}>
      <CKEditor
        name={editorId}
        initData={value || ''}
        editorUrl="https://cdn.ckeditor.com/4.22.1/full-all/ckeditor.js"
        onInstanceReady={(evt) => {
          editorInstanceRef.current = evt.editor;
          evt.editor.on('contentDom', () => {
            applyThemeToIframe(evt.editor);
          });
          applyThemeToIframe(evt.editor);
        }}
        onChange={(evt) => {
          if (onChange) {
            onChange(evt.editor.getData());
          }
        }}
        config={{
          height: minHeight,
          width: '100%',
          placeholder: placeholder,
          toolbar: [
            { name: 'document', items: ['Source', 'Save', 'NewPage', 'Preview', 'Print'] },
            { name: 'clipboard', items: ['Cut', 'Copy', 'Paste', 'Undo', 'Redo'] },
            { name: 'editing', items: ['Find', 'Replace', 'SelectAll'] },
            '/',
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', 'RemoveFormat'] },
            { name: 'paragraph', items: ['NumberedList', 'BulletedList', 'Outdent', 'Indent', 'Blockquote', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
            { name: 'links', items: ['Link', 'Unlink'] },
            { name: 'insert', items: ['Table', 'HorizontalRule', 'SpecialChar'] },
            '/',
            { name: 'styles', items: ['Styles', 'Format', 'Font', 'FontSize'] },
            { name: 'colors', items: ['TextColor', 'BGColor'] },
            { name: 'tools', items: ['Maximize'] }
          ],
          removePlugins: 'resize',
          uiColor: isDark ? '#14151A' : '#ffffff',
          versionCheck: false,
        }}
      />
    </div>
  );
};

export default RichTextEditor;
