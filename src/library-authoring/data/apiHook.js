// @ts-check
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MeiliSearch } from 'meilisearch';

import { useContentSearchConnection, useContentSearchResults } from '../../search-modal';
import { createLibraryBlock, getContentLibrary } from './api';

/** @typedef {import("./types.mjs").CreateBlockData} CreateBlockData */

export const libraryQueryKeys = {
  /**
   * Used in all query keys.
   * You can use these key to invalidate all queries.
   */
  all: ['contentLibrary'],
  contentLibrary: (libraryId) => [
    libraryQueryKeys.all, libraryId
  ],
};

/**
 * Hook to fetch a content library by its ID.
 * @param {string} [libraryId] - The ID of the library to fetch.
 */
export const useContentLibrary = (libraryId) => (
  useQuery({
    queryKey: ['contentLibrary', libraryId],
    queryFn: () => getContentLibrary(libraryId),
  })
);

/**
 * Use this mutation to create a block in a library
 * @param {string} libraryId
 */
export const useCreateLibraryBlock = (libraryId) => {
 if (libraryId === undefined) {
   return undefined;
 }
 const queryClient = useQueryClient();
 return useMutation({
   /** @type {import("@tanstack/react-query").MutateFunction<any, any, {data: CreateBlockData}>} */
   mutationFn: async (data) => createLibraryBlock(data),
   onSettled: () => {
     queryClient.invalidateQueries({ queryKey: libraryQueryKeys.contentLibrary(libraryId) });
     queryClient.invalidateQueries({ queryKey: ['content_search']});
   },
 });
};

/**
 * Hook to fetch the count of components and collections in a library.
 * @param {string} libraryId - The ID of the library to fetch.
 * @param {string} searchKeywords - Keywords to search for.
 */
export const useLibraryComponentCount = (libraryId, searchKeywords) => {
  // Meilisearch code to get Collection and Component counts
  const { data: connectionDetails } = useContentSearchConnection();

  const indexName = connectionDetails?.indexName;
  const client = React.useMemo(() => {
    if (connectionDetails?.apiKey === undefined || connectionDetails?.url === undefined) {
      return undefined;
    }
    return new MeiliSearch({ host: connectionDetails.url, apiKey: connectionDetails.apiKey });
  }, [connectionDetails?.apiKey, connectionDetails?.url]);

  const libFilter = `context_key = "${libraryId}"`;

  const { totalHits: componentCount } = useContentSearchResults({
    client,
    indexName,
    searchKeywords,
    extraFilter: [libFilter], // ToDo: Add filter for components when collection is implemented
  });

  const collectionCount = 0; // ToDo: Implement collections count

  return {
    componentCount,
    collectionCount,
  };
};
