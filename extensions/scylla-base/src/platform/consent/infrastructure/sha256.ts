/** The constants of SHA-256: the first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** The first hash: the first 32 bits of the fractional parts of the square roots of the first 8 primes. */
const START = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const rotate = (word: number, bits: number) => (word >>> bits) | (word << (32 - bits));

/** The 64 words of the block of 16 words at `start`. */
const schedule = (words: Uint32Array, start: number): Uint32Array => {
  const w = new Uint32Array(64);
  w.set(words.subarray(start, start + 16));
  for (let i = 16; i < 64; i++) {
    const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
    const s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
    w[i] = w[i - 16] + s0 + w[i - 7] + s1;
  }
  return w;
};

/**
 * The SHA-256 of a text in UTF-8, in lower case hexadecimal. In plain code: `crypto.subtle` exists
 * only in a secure context, and a server on a private network can serve the app with HTTP.
 */
export const sha256 = (text: string): string => {
  // The message, a 1 bit, zeros, and its length in bits on 64 bits: a multiple of 512 bits.
  const bytes = new TextEncoder().encode(text);
  const words = new Uint32Array(Math.ceil((bytes.length + 9) / 64) * 16);
  bytes.forEach((byte, index) => (words[index >> 2] |= byte << (24 - (index % 4) * 8)));
  words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8);
  words[words.length - 2] = Math.floor((bytes.length * 8) / 2 ** 32);
  words[words.length - 1] = (bytes.length * 8) >>> 0;

  // Each block changes the hash.
  const hash = new Uint32Array(START);
  for (let start = 0; start < words.length; start += 16) {
    const w = schedule(words, start);
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 =
        h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i];
      const t2 = (rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c));
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((word, index) => (hash[index] += word));
  }
  return [...hash].map(word => word.toString(16).padStart(8, '0')).join('');
};
