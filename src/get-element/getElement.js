/**
    Returns a promise that resolves with an object containing all elements that match a given CSS selector. If no elements are found, it will wait for mutations on the document body and retry until elements matching the selector are found or a timeout is reached.
    @param {string} cssSelector - The CSS selector used to select elements to be found.
    @param {number} [outTimer=10000] - The maximum time in milliseconds to wait for elements to be found. Defaults to 100000ms.
    @returns {Promise} - A promise that resolves with an object containing the CSS selector and an array of found elements.
    @throws {Error} - If a timeout is reached before elements matching the selector are found.
    */
const getElement = (cssSelector, outTimer = 10000) => {
  const els = document.querySelectorAll(cssSelector);
  if (els.length > 0) {
    return Promise.resolve({
      selector: cssSelector,
      elements: els,
    });
  }
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const elems = document.querySelectorAll(cssSelector);
        if (elems.length > 0) {
          observer.disconnect();
          resolve({
            selector: cssSelector,
            elements: elems,
          });
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout while waiting for ${cssSelector}`));
    }, outTimer);
  });
};

export default getElement;
