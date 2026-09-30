import { getConfig } from '@edx/frontend-platform';

export const matchesAnyStatus = (statuses, status) => Object.values(statuses).some(s => s === status);

/**
 * Makes the asset urls in course updates and handouts html resolvable from this MFE, the way
 * legacy Studio rendered them.
 *
 * Course updates come back with their stored `/static/<name>` paths, which legacy Studio
 * pointed at the course's asset url. Handouts come back already rewritten by Studio to
 * host-relative `/assets/courseware/v1/<digest>/asset-v1:...` urls. Both are relative to
 * Studio's host, so rendered here as-is they would resolve against this MFE's origin. Both
 * are turned into the same absolute `<studio>/asset-v1:...` url, dropping the digest.
 * Display only: the stored content is never touched.
 */
export const withStudioAssetUrls = ({ content, courseId }) => {
  if (!content || !courseId) { return content || ''; }
  const studioBaseUrl = getConfig().STUDIO_BASE_URL;
  const assetBaseUrl = `${studioBaseUrl}/${courseId.replace('course-v1:', 'asset-v1:')}+type@asset+block/`;
  const attribute = '((?:src|href)=(?:"|\'|&quot;))';
  return content
    .replace(new RegExp(`${attribute}/static/`, 'g'), `$1${assetBaseUrl}`)
    .replace(new RegExp(`${attribute}/(?:assets/courseware/v1/[0-9a-f]+/)?asset-v1:`, 'g'), `$1${studioBaseUrl}/asset-v1:`);
};
