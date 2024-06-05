// @ts-check
import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/** @typedef {import("./types.mjs").CreateBlockData} CreateBlockData */

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;
/**
 * Get the URL for the content library API.
 * @param {string} libraryId - The ID of the library to fetch.
 */
export const getContentLibraryApiUrl = (libraryId) => `${getApiBaseUrl()}/api/libraries/v2/${libraryId}/`;
/**
 * Get the URL for create content in library.
 * @param {string} libraryId
 */
export const getCreateLibraryBlockUrl = (libraryId) => `${getApiBaseUrl()}/api/libraries/v2/${libraryId}/blocks/`;

/**
 * Fetch a content library by its ID.
 * @param {string} [libraryId] - The ID of the library to fetch.
 * @returns {Promise<import("./types.mjs").ContentLibrary>}
 */
export async function getContentLibrary(libraryId) {
  if (!libraryId) {
    throw new Error('libraryId is required');
  }

  const { data } = await getAuthenticatedHttpClient().get(getContentLibraryApiUrl(libraryId));
  return camelCaseObject(data);
}

/**
 * Creates a block in a library
 * @param {CreateBlockData} data
 * @returns {Promise<Object>}
 */
export async function createLibraryBlock({
  libraryId,
  blockType,
  definitionId
}){
  const client = getAuthenticatedHttpClient();
  const response = await client.post(
    getCreateLibraryBlockUrl(libraryId),
    {
      block_type: blockType,
      definition_id: definitionId,
    },
  );

  return response.data;
}
