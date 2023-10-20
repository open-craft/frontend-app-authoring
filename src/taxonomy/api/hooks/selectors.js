// @ts-check
import {
  useTaxonomyDetailData,
  useTaxonomyListData,
  useExportTaxonomy,
} from './api';

/**
 * @returns {import("../types.mjs").TaxonomyListData | undefined}
 */
export const useTaxonomyListDataResponse = () => {
  const response = useTaxonomyListData();
  if (response.status === 'success') {
    return response.data;
  }
  return undefined;
};

/**
 * @returns {boolean}
 */
export const useIsTaxonomyListDataLoaded = () => (
  useTaxonomyListData().status === 'success'
);

export const useExportTaxonomyMutation = () => (
  useExportTaxonomy()
);
/**
 * @params {number} taxonomyId
 * @returns {Pick<import('@tanstack/react-query').UseQueryResult, "error" | "isError" | "isFetched" | "isSuccess">}
 */
export const useTaxonomyDetailDataStatus = (taxonomyId) => {
  const {
    isError,
    error,
    isFetched,
    isSuccess,
  } = useTaxonomyDetailData(taxonomyId);
  return {
    isError,
    error,
    isFetched,
    isSuccess,
  };
};

/**
 * @params {number} taxonomyId
 * @returns {import("../types.mjs").TaxonomyData | undefined}
 */
export const useTaxonomyDetailDataResponse = (taxonomyId) => {
  const { isSuccess, data } = useTaxonomyDetailData(taxonomyId);
  if (isSuccess) {
    return data;
  }

  return undefined;
};
