// Add structuredClone polyfill
if (typeof structuredClone !== 'function') {
  (global as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Add TextEncoder polyfill if needed
if (typeof TextEncoder === 'undefined') {
  (global as any).TextEncoder = require('util').TextEncoder;
}

// Add TextDecoder polyfill if needed
if (typeof TextDecoder === 'undefined') {
  (global as any).TextDecoder = require('util').TextDecoder;
}

// Add crypto polyfill if needed
if (!global.crypto) {
  const nodeCrypto = require('crypto');
  (global as any).crypto = {
    getRandomValues: (buffer: Uint8Array) => nodeCrypto.randomFillSync(buffer),
    subtle: nodeCrypto.webcrypto?.subtle,
  };
}
