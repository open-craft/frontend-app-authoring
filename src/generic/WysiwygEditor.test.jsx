import React from 'react';
import { render } from '@testing-library/react';

import { DEFAULT_EMPTY_WYSIWYG_VALUE } from '../constants';
import { replaceStaticWithAsset } from '../editors/sharedComponents/TinyMceWidget/hooks';
import { WysiwygEditor } from './WysiwygEditor';

const courseId = 'course-v1:edX+E+2024';

let mockOnEditorChange;

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ courseDetail: { courseId: 'course-v1:edX+E+2024' } }),
}));

jest.mock('../editors/sharedComponents/TinyMceWidget', () => ({
  __esModule: true,
  default: (props) => {
    mockOnEditorChange = props.onChange;
    return <div data-testid="tinymce-widget" />;
  },
  prepareEditorRef: () => ({
    editorRef: { current: null },
    refReady: true,
    setEditorRef: jest.fn(),
  }),
}));

// Mirrors the cosmetic rewrites TinyMCE applies while loading a value: it terminates
// `style` declarations with a semicolon and self-closes void elements. Neither survives
// the whitespace/quote-insensitive comparison the component used to rely on.
const normalizeLikeTinyMce = (html) => html
  .replace(/\s+/g, ' ')
  .replace(/style="([^"]*?);?"/g, (_match, css) => `style="${css.trim()};"`)
  .replace(/<img([^>]*?)\s*\/?>/g, '<img$1 />');

const buildEditor = ({ withSerializer = true } = {}) => {
  const editor = {
    selection: {
      getBookmark: jest.fn(() => ({ start: 0 })),
      moveToBookmark: jest.fn(),
    },
    getContent: jest.fn(() => '<p>raw</p>'),
    setContent: jest.fn(),
  };

  if (withSerializer) {
    editor.dom = {
      create: (tag, _attrs, html) => {
        const element = document.createElement(tag);
        element.innerHTML = html;
        return element;
      },
    };
    editor.serializer = {
      serialize: (element) => normalizeLikeTinyMce(element.innerHTML),
    };
  }

  return editor;
};

// The exact shape of the markup that used to mark Schedule & Details as modified on load.
const storedOverview = `<section class="course-staff">
   <h2>Course Staff</h2>
   <article class="teacher">
     <div class="teacher-image">
       <img src="/static/images/pl-faculty.png" align="left" style="margin:0 20 px 0">
     </div>

     <h3>Staff Member #1</h3>
   </article>
 </section>`;

// setupCustomBehavior rewrites `/static/...` to `/asset-v1:...` on the `mceFocus` command
// that TinyMCE issues while initialising, so the first value the editor reports back has
// already been through it. Use the production rewrite rather than a hand-rolled one, so
// the test cannot disagree with it about the URL format.
const withAssetPaths = (html) => replaceStaticWithAsset({
  initialContent: html,
  learningContextId: courseId,
}) || html;

describe('WysiwygEditor', () => {
  beforeEach(() => {
    mockOnEditorChange = undefined;
  });

  it('does not report a change when TinyMCE only reformats the initial value', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue={storedOverview} onChange={onChange} />);

    // On init the React wrapper emits the editor's normalized rendering of the value
    // it was handed, even though nothing has been edited.
    mockOnEditorChange(normalizeLikeTinyMce(storedOverview), buildEditor());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not report a change when static asset paths are rewritten on load', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue={storedOverview} onChange={onChange} />);

    // Both rewrites land together on the first emission: the asset-path substitution
    // from setupCustomBehavior, then TinyMCE's own reformatting.
    mockOnEditorChange(normalizeLikeTinyMce(withAssetPaths(storedOverview)), buildEditor());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a genuine edit', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue={storedOverview} onChange={onChange} />);

    const edited = storedOverview.replace('Staff Member #1', 'Staff Member #2');
    mockOnEditorChange(edited, buildEditor());

    expect(onChange).toHaveBeenCalledWith(edited);
  });

  it('reports a genuine edit made after the asset paths were rewritten', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue={storedOverview} onChange={onChange} />);

    const edited = withAssetPaths(storedOverview).replace('Staff Member #1', 'Staff Member #2');
    mockOnEditorChange(edited, buildEditor());

    expect(onChange).toHaveBeenCalledWith(edited);
  });

  it('still ignores whitespace-only and quote-style differences', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue="<p class='a'>Text</p>" onChange={onChange} />);

    mockOnEditorChange('<p class="a">  Text  </p>', buildEditor());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('treats an emptied editor as unchanged when the value was the default empty value', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue={DEFAULT_EMPTY_WYSIWYG_VALUE} onChange={onChange} />);

    mockOnEditorChange('', buildEditor());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('falls back to comparing raw values when the serializer is unavailable', () => {
    const onChange = jest.fn();
    render(<WysiwygEditor initialValue="<p>Before</p>" onChange={onChange} />);

    mockOnEditorChange('<p>After</p>', buildEditor({ withSerializer: false }));

    expect(onChange).toHaveBeenCalledWith('<p>After</p>');
  });

  it('restores the existing content and cursor position after handling a change', () => {
    render(<WysiwygEditor initialValue="<p>Before</p>" onChange={jest.fn()} />);

    const editor = buildEditor();
    mockOnEditorChange('<p>After</p>', editor);

    expect(editor.setContent).toHaveBeenCalledWith('<p>raw</p>');
    expect(editor.selection.moveToBookmark).toHaveBeenCalledWith({ start: 0 });
  });
});
