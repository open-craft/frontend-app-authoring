// @ts-check
import { getTaxonomyExportFile, getTaxonomyTemplateFile } from './api';

/**
 * Downloads the file of the exported taxonomy
 * @param {number} pk
 * @param {string} format
 * @returns {void}
 */
export const exportTaxonomy = (pk, format) => (
  getTaxonomyExportFile(pk, format)
);

/**
 * Downloads the template file for import taxonomies
 * @param {('json'|'csv')} format
 * @returns {void}
 */
export const downloadTaxonomyTemplate = (format) => (
  getTaxonomyTemplateFile(format)
);
