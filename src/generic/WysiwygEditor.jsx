import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import TinyMceWidget, { prepareEditorRef } from '../editors/sharedComponents/TinyMceWidget';
import { replaceStaticWithAsset } from '../editors/sharedComponents/TinyMceWidget/hooks';

import { DEFAULT_EMPTY_WYSIWYG_VALUE } from '../constants';

export const SUPPORTED_TEXT_EDITORS = {
  text: 'text',
  expandable: 'expandable',
};

export const WysiwygEditor = ({
  initialValue, editorType, onChange, minHeight,
}) => {
  const { editorRef, refReady, setEditorRef } = prepareEditorRef();
  const { courseId } = useSelector((state) => state.courseDetail);

  // The content that comes back from the editor is never the string we handed it. Two
  // rewrites happen before anyone has typed a character, and both used to be reported as
  // edits, leaving the page permanently "modified" on load:
  //  - TinyMCE reformats the markup as it loads (self-closing void elements, `style`
  //    attributes terminated with a semicolon, collapsed whitespace);
  //  - setupCustomBehavior rewrites `/static/...` asset paths to `/asset-v1:...` on the
  //    `mceFocus` command, which TinyMCE issues while initialising.
  // Putting both sides through the same two rewrites (and ignoring whitespace and quote
  // style, as before) leaves only genuine edits. replaceStaticWithAsset is idempotent for
  // already-rewritten URLs and returns false when it changes nothing.
  const canonical = (value, editor) => {
    const html = value || '';
    const withAssets = replaceStaticWithAsset({
      initialContent: html,
      learningContextId: courseId,
    }) || html;
    // Falls back to the raw string when the serializer is unavailable, so an edit is never silently dropped.
    const serialized = editor?.serializer && editor?.dom
      ? editor.serializer.serialize(
        editor.dom.create('div', {}, withAssets),
        { getInner: true, no_events: true },
      )
      : withAssets;
    return serialized.replace(/\s/g, '').replace(/'/g, '"');
  };

  // default initial string returned onEditorChange if empty input
  const needToChange = (value, editor) => canonical(initialValue, editor) !== canonical(value, editor)
    && (initialValue !== DEFAULT_EMPTY_WYSIWYG_VALUE || value !== '');

  const handleUpdate = (value, editor) => {
    // With bookmarks keep the current cursor position at the end of the line
    // and it inserts new content only at the end of the line.
    const bm = editor.selection.getBookmark();
    const existingContent = editor.getContent({ format: 'raw' });
    if (needToChange(value, editor)) { onChange(value); }
    editor.setContent(existingContent);
    editor.selection.moveToBookmark(bm);
  };

  if (!refReady) {
    return null;
  }

  return (
    <TinyMceWidget
      textValue={initialValue}
      editorRef={editorRef}
      editorType={editorType}
      initialValue={initialValue}
      minHeight={minHeight}
      editorContentHtml={initialValue}
      setEditorRef={setEditorRef}
      onChange={handleUpdate}
      initializeEditor={() => ({})}
      learningContextId={courseId}
      images={{}}
      enableImageUpload={false}
      onEditorChange={() => ({})}
    />
  );
};

WysiwygEditor.defaultProps = {
  initialValue: '',
  editorType: SUPPORTED_TEXT_EDITORS.text,
  minHeight: 200,
};

WysiwygEditor.propTypes = {
  initialValue: PropTypes.string,
  editorType: PropTypes.oneOf(Object.values(SUPPORTED_TEXT_EDITORS)),
  onChange: PropTypes.func.isRequired,
  minHeight: PropTypes.number,
};
