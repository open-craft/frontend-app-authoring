// @ts-check
import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type { CreateContentLibraryDto } from './types';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

/**
 * Get the URL for creating a new library.
 */
export const getContentLibraryV2CreateApiUrl = () => `${getApiBaseUrl()}/api/libraries/v2/`;

/**
 * Create a new library
 */
export async function createLibraryV2(data: CreateContentLibraryDto) {
  const client = getAuthenticatedHttpClient();
  const url = getContentLibraryV2CreateApiUrl();

  // Description field cannot be null, but we don't have a input in the form for it
  const { data: newLibrary } = await client.post(url, { description: '', ...data });

  return camelCaseObject(newLibrary);
}
