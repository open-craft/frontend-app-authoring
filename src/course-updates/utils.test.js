import { getConfig } from '@edx/frontend-platform';

import { withStudioAssetUrls } from './utils';

describe('withStudioAssetUrls', () => {
  const courseId = 'course-v1:test+test+test';
  const studioBaseUrl = getConfig().STUDIO_BASE_URL;

  it('points stored `/static/` paths at the course asset in Studio', () => {
    const content = '<p><a href="/static/sample.pdf">Test file</a></p>';

    expect(withStudioAssetUrls({ content, courseId }))
      .toEqual(`<p><a href="${studioBaseUrl}/asset-v1:test+test+test+type@asset+block/sample.pdf">Test file</a></p>`);
  });

  it('points the digested urls Studio returns for handouts at the same asset url', () => {
    const content = '<p><a href="/assets/courseware/v1/55f924af410dd775524d069ffe80dbdc/asset-v1:test+test+test+type@asset+block/sample.pdf">Test file</a></p>';

    expect(withStudioAssetUrls({ content, courseId }))
      .toEqual(`<p><a href="${studioBaseUrl}/asset-v1:test+test+test+type@asset+block/sample.pdf">Test file</a></p>`);
  });

  it('points relative asset urls at Studio', () => {
    const content = '<img src=\'/asset-v1:test+test+test+type@asset+block@logo.png\' />';

    expect(withStudioAssetUrls({ content, courseId }))
      .toEqual(`<img src='${studioBaseUrl}/asset-v1:test+test+test+type@asset+block@logo.png' />`);
  });

  it('rewrites every occurrence', () => {
    const content = '<img src="/static/a.png" /><img src=&quot;/static/b.png&quot; />';

    expect(withStudioAssetUrls({ content, courseId })).toEqual(
      `<img src="${studioBaseUrl}/asset-v1:test+test+test+type@asset+block/a.png" />`
      + `<img src=&quot;${studioBaseUrl}/asset-v1:test+test+test+type@asset+block/b.png&quot; />`,
    );
  });

  it('leaves absolute urls and plain text alone', () => {
    const content = '<p>See /static/sample.pdf</p><a href="https://example.com/static/sample.pdf">Elsewhere</a>';

    expect(withStudioAssetUrls({ content, courseId })).toEqual(content);
  });

  it('returns an empty string for missing content', () => {
    expect(withStudioAssetUrls({ content: undefined, courseId })).toEqual('');
  });
});
