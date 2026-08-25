import React, { useEffect, useRef } from 'react';
import { CKEditor } from 'ckeditor4-react';
import { useTheme } from '../../contexts/ThemeContext';
import './RichTextEditor.css';

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Start typing...',
  className = "",
  minHeight = 250
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const editorInstanceRef = useRef(null);

  // Sync editor content iframe styling on theme change
  const applyThemeToIframe = (editor) => {
    if (!editor) return;
    try {
      const doc = editor.document?.$;
      if (doc) {
        // 1. Inject or update dynamic style tag in iframe head
        let styleTag = doc.getElementById('ck-theme-custom-style');
        if (!styleTag) {
          styleTag = doc.createElement('style');
          styleTag.id = 'ck-theme-custom-style';
          if (doc.head) {
            doc.head.appendChild(styleTag);
          }
        }
        if (styleTag) {
          styleTag.textContent = `
            html, body {
              background-color: ${isDark ? '#14151A' : '#ffffff'} !important;
              color: ${isDark ? '#F3F4F6' : '#111827'} !important;
              caret-color: ${isDark ? '#F3F4F6' : '#111827'} !important;
            }
            body.cke_editable {
              background-color: ${isDark ? '#14151A' : '#ffffff'} !important;
              color: ${isDark ? '#F3F4F6' : '#111827'} !important;
            }
            body.cke_editable p, body.cke_editable div, body.cke_editable span, body.cke_editable li, body.cke_editable td, body.cke_editable th {
              color: ${isDark ? '#F3F4F6' : '#111827'};
            }
            body.cke_editable a {
              color: #E55C41;
            }
            body.cke_editable blockquote {
              border-left-color: ${isDark ? '#262833' : '#E5E7EB'} !important;
              color: ${isDark ? '#9CA3AF' : '#6B7280'} !important;
            }
          `;
        }

        // 2. Set inline styles on html and body using setProperty with !important
        if (doc.documentElement) {
          doc.documentElement.style.setProperty('background-color', isDark ? '#14151A' : '#ffffff', 'important');
        }
        if (doc.body) {
          doc.body.style.setProperty('background-color', isDark ? '#14151A' : '#ffffff', 'important');
          doc.body.style.setProperty('color', isDark ? '#F3F4F6' : '#111827', 'important');
          doc.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }
      }
    } catch (e) {
      console.warn('Could not apply theme to CKEditor iframe', e);
    }
  };

  useEffect(() => {
    if (editorInstanceRef.current) {
      applyThemeToIframe(editorInstanceRef.current);
    }
  }, [isDark, theme]);

  return (
    <div className={`rich-text-editor-wrapper w-full overflow-hidden rounded-lg border border-theme-border shadow-sm transition-colors ${className}`}>
      <CKEditor
        initData={value}
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
            { name: 'document', items: ['Source', 'Save', 'NewPage', 'Preview', 'Print', 'Templates'] },
            { name: 'clipboard', items: ['Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', 'Undo', 'Redo'] },
            { name: 'editing', items: ['Find', 'Replace', 'SelectAll', 'Scayt'] },
            { name: 'forms', items: ['Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField'] },
            '/',
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', 'RemoveFormat'] },
            { name: 'paragraph', items: ['NumberedList', 'BulletedList', 'Outdent', 'Indent', 'Blockquote', 'CreateDiv', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', 'BidiLtr', 'BidiRtl', 'Language'] },
            { name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
            { name: 'insert', items: ['Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe'] },
            '/',
            { name: 'styles', items: ['Styles', 'Format', 'Font', 'FontSize'] },
            { name: 'colors', items: ['TextColor', 'BGColor'] },
            { name: 'tools', items: ['Maximize', 'ShowBlocks'] },
            { name: 'about', items: ['About'] }
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


