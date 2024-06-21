// @ts-check

import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

/**
 * Get the URL for creating a new library.
 */
export const getContentLibraryV2CreateApiUrl = () => `${getApiBaseUrl()}/api/libraries/v2/`;

/**
  * Create a new library.
  * @param {import("./types.mjs").CreateContentLibraryDto} data - The library data.
  * @returns {Promise<import("../../data/types.mjs").ContentLibrary>} The created library.
  */
export async function createLibraryV2(data) {
  const client = getAuthenticatedHttpClient();
  const url = getContentLibraryV2CreateApiUrl();

  const { data: newLibrary } = await client.post(url, data);

  return camelCaseObject(newLibrary);
}
