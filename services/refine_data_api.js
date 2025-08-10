// services/refine_data_api.js
// Builds a refine fn that behaves like: async (rootUrl, product, page) => product
// NOTE: uses eval now; we can swap to vm2 sandbox later.

export function buildApiRefine(refineFunctionString) {
  if (!refineFunctionString || typeof refineFunctionString !== 'string') return null;

  let injected;
  try {
    injected = eval(`(${refineFunctionString})`);
  } catch (e) {
    console.error('Failed to parse refineFunction from API:', e.message);
    return null;
  }
  if (typeof injected !== 'function') return null;

  return async function refineFromApi(rootUrl, product, page) {
    // mirror your console piping
    page.on('console', (msg) => {
      for (let i = 0; i < msg.args().length; ++i) {
        msg.args()[i].jsonValue().then((val) => {
          console.log(`PAGE LOG: ${val}`);
        }).catch(() => {});
      }
    });

    try {
      // API function signature must be: async (rootUrl, product, page) => product|partial
      const maybe = await injected(rootUrl, { ...product }, page);
      if (maybe && typeof maybe === 'object') {
        return { ...product, ...maybe };
      }
      return product;
    } catch (e) {
      console.error(`API refine error (${rootUrl}): ${e.message}`);
      return product;
    }
  };
}
