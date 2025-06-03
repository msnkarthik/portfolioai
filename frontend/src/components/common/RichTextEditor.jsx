import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Button
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Undo,
  Redo,
  Save
} from '@mui/icons-material';

function RichTextEditor({
  content = '',
  onChange,
  onSave,
  readOnly = false,
  loading = false
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    }
  });

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();
  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  return (
    <Paper sx={{ p: 2 }}>
      {!readOnly && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Tooltip title="Bold">
              <IconButton
                size="small"
                onClick={toggleBold}
                color={editor.isActive('bold') ? 'primary' : 'default'}
              >
                <FormatBold />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton
                size="small"
                onClick={toggleItalic}
                color={editor.isActive('italic') ? 'primary' : 'default'}
              >
                <FormatItalic />
              </IconButton>
            </Tooltip>
            <Tooltip title="Underline">
              <IconButton
                size="small"
                onClick={toggleUnderline}
                color={editor.isActive('underline') ? 'primary' : 'default'}
              >
                <FormatUnderlined />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Bullet List">
              <IconButton
                size="small"
                onClick={toggleBulletList}
                color={editor.isActive('bulletList') ? 'primary' : 'default'}
              >
                <FormatListBulleted />
              </IconButton>
            </Tooltip>
            <Tooltip title="Numbered List">
              <IconButton
                size="small"
                onClick={toggleOrderedList}
                color={editor.isActive('orderedList') ? 'primary' : 'default'}
              >
                <FormatListNumbered />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Quote">
              <IconButton
                size="small"
                onClick={toggleBlockquote}
                color={editor.isActive('blockquote') ? 'primary' : 'default'}
              >
                <FormatQuote />
              </IconButton>
            </Tooltip>
            <Tooltip title="Code">
              <IconButton
                size="small"
                onClick={toggleCode}
                color={editor.isActive('code') ? 'primary' : 'default'}
              >
                <Code />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Undo">
              <IconButton
                size="small"
                onClick={undo}
                disabled={!editor.can().undo()}
              >
                <Undo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton
                size="small"
                onClick={redo}
                disabled={!editor.can().redo()}
              >
                <Redo />
              </IconButton>
            </Tooltip>
            {onSave && (
              <>
                <Divider orientation="vertical" flexItem />
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={onSave}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />
        </>
      )}
      <Box
        sx={{
          '& .ProseMirror': {
            minHeight: '200px',
            p: 2,
            outline: 'none',
            '& p': { my: 1 },
            '& ul, & ol': { pl: 4 },
            '& blockquote': {
              borderLeft: '3px solid #ccc',
              pl: 2,
              py: 1,
              my: 1
            },
            '& code': {
              bgcolor: 'grey.100',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5
            }
          }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}

export default RichTextEditor; 