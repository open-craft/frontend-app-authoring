// eslint-disable-next-line import/prefer-default-export
export const extractOrgFromContentId = (contentId) => contentId.split('+')[0].split(':')[1];
export const debounce = (func, delay) => {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};
