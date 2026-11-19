import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  Form,
  Spinner,
  Toast,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import { getConfig } from '@edx/frontend-platform';
import { actions, selectors } from '../../data/redux';
import { RequestKeys } from '../../data/constants/requests';

import EditorContainer from '../EditorContainer';
import RawEditor from '../../sharedComponents/RawEditor';
import * as hooks from './hooks';
import messages from './messages';
import TinyMceWidget from '../../sharedComponents/TinyMceWidget';
import { prepareEditorRef, replaceStaticWithAsset } from '../../sharedComponents/TinyMceWidget/hooks';

const TextEditor = ({
  onClose,
  returnFunction,
  // redux
  showRawEditor,
  blockValue,
  blockId,
  blockFailed,
  initializeEditor,
  blockFinished,
  isCreateWorkflow,
  learningContextId,
  images,
  isLibrary,
}) => {
  const intl = useIntl();
  const { editorRef, refReady, setEditorRef } = prepareEditorRef();

  // The value the block was loaded with, before the user touched the toggle.
  // Kept separately from `useMfeTheming` so isDirty can tell a toggle-only
  // change from an untouched editor. A library block is created by the editor
  // itself, so it keeps the create-workflow default; course blocks are created
  // with the setting already on.
  const storedUseMfeTheming = blockValue?.data?.metadata?.use_mfe_theming;
  const initialUseMfeTheming = typeof storedUseMfeTheming === 'boolean'
    ? storedUseMfeTheming
    : (isLibrary && isCreateWorkflow);
  const [useMfeThemingOverride, setUseMfeThemingOverride] = useState(null);
  const useMfeTheming = useMfeThemingOverride ?? initialUseMfeTheming;

  // `content_style` is only read when the editor initializes, so toggling the
  // theme has to rebuild the editor for the preview to follow. The unsaved
  // content is snapshotted first so it is not lost with the old instance.
  const [contentSnapshot, setContentSnapshot] = useState(null);

  const initialContent = blockValue ? blockValue.data.data : '';
  const newContent = replaceStaticWithAsset({
    initialContent,
    learningContextId,
  });
  const editorContent = newContent || initialContent;
  let staticRootUrl;
  if (isLibrary) {
    staticRootUrl = `${getConfig().STUDIO_BASE_URL }/library_assets/blocks/${ blockId }/`;
  }

  if (!refReady) { return null; }

  const handleUseMfeThemingChange = (e) => {
    if (editorRef.current && !showRawEditor) {
      setContentSnapshot({ blockId, content: editorRef.current.getContent() });
    }
    setUseMfeThemingOverride(e.target.checked);
  };

  const selectEditor = () => {
    if (showRawEditor) {
      return (
        <RawEditor
          editorRef={editorRef}
          content={blockValue}
        />
      );
    }
    return (
      <TinyMceWidget
        key={String(useMfeTheming)}
        editorType="text"
        editorRef={editorRef}
        editorContentHtml={
          contentSnapshot && contentSnapshot.blockId === blockId ? contentSnapshot.content : editorContent
        }
        setEditorRef={setEditorRef}
        minHeight={500}
        maxHeight={500}
        initializeEditor={initializeEditor}
        useMfeTheming={useMfeTheming}
        {...{
          images,
          isLibrary,
          learningContextId,
          staticRootUrl,
        }}
      />
    );
  };

  return (
    <EditorContainer
      getContent={hooks.getContent({ editorRef, showRawEditor, useMfeTheming })}
      isDirty={hooks.isDirty({
        editorRef,
        showRawEditor,
        useMfeTheming,
        initialUseMfeTheming,
      })}
      onClose={onClose}
      returnFunction={returnFunction}
    >
      <div className="editor-body h-75 overflow-auto">
        <Toast show={blockFailed} onClose={hooks.nullMethod}>
          { intl.formatMessage(messages.couldNotLoadTextContext) }
        </Toast>

        {(!blockFinished)
          ? (
            <div className="text-center p-6">
              <Spinner
                animation="border"
                className="m-3"
                screenreadertext={intl.formatMessage(messages.spinnerScreenReaderText)}
              />
            </div>
          ) : (
            <>
              <div className="py-3 px-1">
                <Form.Switch
                  name="use_mfe_theming"
                  checked={useMfeTheming}
                  onChange={handleUseMfeThemingChange}
                  floatLabelLeft
                  className="mb-0"
                  helperText={<span>{intl.formatMessage(messages.useMfeThemingHelp)}</span>}
                >
                  {intl.formatMessage(messages.useMfeThemingLabel)}
                </Form.Switch>
              </div>
              {selectEditor()}
            </>
          )}
      </div>
    </EditorContainer>
  );
};
TextEditor.defaultProps = {
  blockValue: null,
  blockFinished: null,
  isCreateWorkflow: false,
  returnFunction: null,
};
TextEditor.propTypes = {
  onClose: PropTypes.func.isRequired,
  returnFunction: PropTypes.func,
  // redux
  blockValue: PropTypes.shape({
    data: PropTypes.shape({
      data: PropTypes.string,
      metadata: PropTypes.shape({ use_mfe_theming: PropTypes.bool }),
    }),
  }),
  blockId: PropTypes.string,
  blockFailed: PropTypes.bool.isRequired,
  initializeEditor: PropTypes.func.isRequired,
  showRawEditor: PropTypes.bool.isRequired,
  blockFinished: PropTypes.bool,
  isCreateWorkflow: PropTypes.bool,
  learningContextId: PropTypes.string, // This should be required but is NULL when the store is in initial state :/
  images: PropTypes.shape({}).isRequired,
  isLibrary: PropTypes.bool.isRequired,
};

export const mapStateToProps = (state) => ({
  blockValue: selectors.app.blockValue(state),
  blockFailed: selectors.requests.isFailed(state, { requestKey: RequestKeys.fetchBlock }),
  blockId: selectors.app.blockId(state),
  showRawEditor: selectors.app.showRawEditor(state),
  blockFinished: selectors.app.shouldCreateBlock(state)
  || selectors.requests.isFinished(state, { requestKey: RequestKeys.fetchBlock }),
  isCreateWorkflow: selectors.app.shouldCreateBlock(state),
  learningContextId: selectors.app.learningContextId(state),
  images: selectors.app.images(state),
  isLibrary: selectors.app.isLibrary(state),
});

export const mapDispatchToProps = {
  initializeEditor: actions.app.initializeEditor,
};

export const TextEditorInternal = TextEditor; // For testing only
export default connect(mapStateToProps, mapDispatchToProps)(TextEditor);
