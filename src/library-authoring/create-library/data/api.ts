// @ts-check
import type { CreateContentLibraryDto } from './types';

import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

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

  const { data: newLibrary } = await client.post(url, data);

  return camelCaseObject(newLibrary);
}
