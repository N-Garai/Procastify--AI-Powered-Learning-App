import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, Highlighter } from 'lucide-react';

const lowlight = createLowlight(common);

interface DocumentEditorProps {
    content: any; // JSON content
    onUpdate: (content: any) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const buttons = [
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: 'bold', title: 'Bold' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: 'italic', title: 'Italic' },
        { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: 'heading', levels: { level: 1 }, title: 'H1' },
        { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: 'heading', levels: { level: 2 }, title: 'H2' },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList', title: 'Bullet List' },
        { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList', title: 'Ordered List' },
        { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote', title: 'Quote' },
        { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: 'codeBlock', title: 'Code Block' },
        { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), active: 'highlight', title: 'Highlight' },
    ];

    return (
        <div className="flex items-center gap-1 p-2 bg-black/20 border-b border-white/5 overflow-x-auto rounded-t-lg">
            {buttons.map((btn, i) => (
                <button
                    key={i}
                    onClick={btn.action}
                    title={btn.title}
                    className={`p-1.5 rounded-lg transition-colors ${editor.isActive(btn.active, btn.levels) ? 'bg-[#5865F2] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                    <btn.icon size={16} />
                </button>
            ))}
        </div>
    );
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, onUpdate, editable = true }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // logic handled by extension-code-block-lowlight
            }),
            Highlight,
            CodeBlockLowlight.configure({
                lowlight,
            }),
        ],
        content: content || { type: 'doc', content: [] },
        editable: editable,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none p-6 min-h-[500px]',
            },
        },
    });

    return (
        <div className="flex flex-col h-full bg-[#1e1f22] rounded-lg border border-white/5 overflow-hidden">
            {editable && <MenuBar editor={editor} />}
            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default DocumentEditor;
