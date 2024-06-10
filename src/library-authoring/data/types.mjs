/**
  * @typedef {Object} ContentLibrary
  * @property {string} id
  * @property {string} type
  * @property {string} org
  * @property {string} slug
  * @property {string} title
  * @property {string} description
  * @property {number} numBlocks
  * @property {number} version
  * @property {Date | null} lastPublished
  * @property {boolean} allowLti
  * @property {boolean} allowPublicLearning
  * @property {boolean} allowPublicRead
  * @property {boolean} hasUnpublishedChanges
  * @property {boolean} hasUnpublishedDeletes
  * @property {boolean} canEditLibrary
  * @property {string} license
  */
 
/**
 * @typedef {Object} CreateBlockDataRequest
 * @property {string} libraryId
 * @property {string} blockType
 * @property {string} definitionId
 */

/**
 * @typedef {Object} CreateBlockDataResponse
 * @property {string} id
 * @property {string} blockType
 * @property {string | null} defKey
 * @property {string} displayName
 * @property {boolean} hasUnpublishedChanges
 * @property {number} tagsCount
 */
