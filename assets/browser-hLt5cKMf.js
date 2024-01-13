import { g as getDefaultExportFromCjs, __tla as __tla_0 } from "./index-doIH7Pqc.js";
let browser$2;
let __tla = Promise.all([
  (() => {
    try {
      return __tla_0;
    } catch {
    }
  })()
]).then(async () => {
  function _mergeNamespaces(n, m) {
    for (var i = 0; i < m.length; i++) {
      const e = m[i];
      if (typeof e !== "string" && !Array.isArray(e)) {
        for (const k in e) {
          if (k !== "default" && !(k in n)) {
            const d = Object.getOwnPropertyDescriptor(e, k);
            if (d) {
              Object.defineProperty(n, k, d.get ? d : {
                enumerable: true,
                get: () => e[k]
              });
            }
          }
        }
      }
    }
    return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, {
      value: "Module"
    }));
  }
  var browser = function() {
    throw new Error("ws does not work in the browser. Browser clients must use the native WebSocket object");
  };
  const browser$1 = getDefaultExportFromCjs(browser);
  browser$2 = _mergeNamespaces({
    __proto__: null,
    default: browser$1
  }, [
    browser
  ]);
});
export {
  __tla,
  browser$2 as b
};
