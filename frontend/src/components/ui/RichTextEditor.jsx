import React from 'react';
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

  return (
    <div className={`rich-text-editor-wrapper w-full overflow-hidden rounded-lg border border-theme-border shadow-sm transition-colors ${className}`}>
      <CKEditor
        initData={value}
        editorUrl="https://cdn.ckeditor.com/4.22.1/full-all/ckeditor.js"
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
          contentsCss: isDark 
            ? 'body { background-color: #1A1C23 !important; color: #F3F4F6 !important; }'
            : 'body { background-color: #ffffff !important; color: #111827 !important; }',
          versionCheck: false,
        }}
      />
    </div>
  );
};

export default RichTextEditor;
