#!/usr/bin/env node
/**
 * Index-parity verification for the native MDX/MDD index builder.
 *
 * Ports the Kotlin buildIndexInternal (MainActivity.kt) to JS and compares its
 * output against js-mdict (the bundled mdict-lib.js) on a real dictionary file:
 *   - key count
 *   - full sorted key set equality
 *   - recordStartOffset spot checks
 *
 * Usage:
 *   node tools/verify-index.mjs <path-to.mdx-or-.mdd>
 *   node tools/verify-index.mjs <path> --words bat,we,apple   # extra spot checks
 *
 * Exit code 0 = parity OK, 1 = mismatch/error.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPath = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'mdict-lib.js');

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('usage: node tools/verify-index.mjs <dictionary.mdx|.mdd> [--words a,b,c]');
  process.exit(2);
}
const wordsArg = process.argv.find((a) => a.startsWith('--words='));
const spotWords = (wordsArg ? wordsArg.split('=')[1] : 'bat,we,apple,hello,make').split(',').filter(Boolean);

const isMdd = filePath.toLowerCase().endsWith('.mdd');
global.Buffer = Buffer;
const require = createRequire(import.meta.url);
const lib = require(libPath);

const buf = fs.readFileSync(filePath);

// ---- Port of Kotlin ripemd128 / mdxDecrypt (MainActivity.kt) ----
function ripemd128(input) {
  const S = [
    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
    [7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12],
    [11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5],
    [11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12],
    [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6],
    [9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11],
    [9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5],
    [15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8],
  ];
  const X = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8],
    [3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12],
    [1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2],
    [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12],
    [6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2],
    [15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13],
    [8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14],
  ];
  const K = [0, 1518500249, 1859775393, 0x8f1bbcdc | 0, 1352829926, 1548603684, 1836072691, 0];
  const bytes = input.length;
  const padLen = bytes % 64 < 56 ? 56 - (bytes % 64) : 120 - (bytes % 64);
  const total = bytes + padLen + 8;
  const concat = new Uint8Array(total);
  concat.set(input, 0);
  concat[bytes] = 128;
  const bitLen = BigInt(bytes) * 8n;
  for (let i = 0; i < 8; i++) concat[total - 8 + i] = Number((bitLen >> BigInt(8 * i)) & 0xffn);
  const x = new Int32Array(total / 4);
  for (let i = 0; i < total; i += 4) {
    x[i / 4] = (concat[i] & 0xff) | ((concat[i + 1] & 0xff) << 8) | ((concat[i + 2] & 0xff) << 16) | ((concat[i + 3] & 0xff) << 24);
  }
  const f = (r, acc, b, c, d, w, k, s) => {
    let res;
    if (r === 0) res = b ^ c ^ d;
    else if (r === 1) res = (b & c) | (~b & d);
    else if (r === 2) res = (b | ~c) ^ d;
    else res = (b & d) | (c & ~d);
    const sum = (res + acc + w + k) | 0;
    return ((sum << s) | (sum >>> (32 - s))) | 0;
  };
  const hash = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476];
  for (let i = 0; i < total; i += 64) {
    let aa = hash[0], bb = hash[1], cc = hash[2], dd = hash[3];
    let aaa = aa, bbb = bb, ccc = cc, ddd = dd;
    let t = 0;
    while (t < 64) {
      const r = Math.floor(t / 16);
      aa = f(r, aa, bb, cc, dd, x[i / 4 + X[r][t % 16]], K[r], S[r][t % 16]);
      const tmp = dd; dd = cc; cc = bb; bb = aa; aa = tmp;
      t++;
    }
    while (t < 128) {
      const r = Math.floor(t / 16);
      const rr = Math.floor((63 - (t % 64)) / 16);
      aaa = f(rr, aaa, bbb, ccc, ddd, x[i / 4 + X[r][t % 16]], K[r], S[r][t % 16]);
      const tmp = ddd; ddd = ccc; ccc = bbb; bbb = aaa; aaa = tmp;
      t++;
    }
    ddd = (hash[1] + cc + ddd) | 0;
    hash[1] = (hash[2] + dd + aaa) | 0;
    hash[2] = (hash[3] + aa + bbb) | 0;
    hash[3] = (hash[0] + bb + ccc) | 0;
    hash[0] = ddd;
  }
  return new Uint8Array(16).map((_, i) => (hash[Math.floor(i / 4)] >>> (8 * (i % 4))) & 0xff);
}
function mdxDecrypt(compBlock) {
  const keyin = new Uint8Array(8);
  keyin.set(compBlock.slice(4, 8), 0);
  keyin[4] = 149;
  keyin[5] = 54;
  const key = ripemd128(keyin);
  const result = new Uint8Array(compBlock);
  let previous = 54;
  for (let j = 0; j < compBlock.length - 8; j++) {
    const orig = compBlock[8 + j] & 0xff;
    let t = ((orig >>> 4) | ((orig << 4) & 0xff)) & 0xff;
    t = t ^ previous ^ (j & 0xff) ^ (key[j % key.length] & 0xff);
    previous = orig;
    result[8 + j] = t;
  }
  return result;
}

// ---- Port of Kotlin buildIndexInternal (MainActivity.kt) ----
const b2n = (b, off, w) => {
  let v = 0n;
  for (let i = 0; i < w; i++) v = (v << 8n) | BigInt(b[off + i] & 0xff);
  return v;
};
const headerSize = Number(b2n(buf, 0, 4));
if (headerSize <= 0 || headerSize > 10_000_000) throw new Error('文件头异常');
const headerText = buf.slice(4, 4 + headerSize).toString('utf16le');
const headerMap = {};
for (const m of headerText.matchAll(/(\w+)="((.|\r|\n)*?)"/g)) headerMap[m[1].toLowerCase()] = m[2];
const version = parseFloat(headerMap.generatedbyengineversion) || 1;
const numWidth = version >= 2 ? 8 : 4;
const encRaw = (headerMap.encrypted || '').toLowerCase();
const encrypt = encRaw === 'yes' ? 1 : encRaw === '' || encRaw === 'no' || encRaw === undefined ? 0 : parseInt(encRaw, 10) || 0;
if (encrypt === 1) throw new Error('Encrypted=Yes 词典暂不支持');

const rawEnc = (headerMap.encoding || '').toLowerCase();
const utf16 = isMdd || rawEnc.startsWith('utf-16') || rawEnc === 'utf16';
const gbk = rawEnc === 'gbk' || rawEnc === 'gb2312' || rawEnc === 'gb18030';
const big5 = rawEnc === 'big5';
const width = utf16 ? 2 : 1;
const dec = utf16 ? 'utf16le' : gbk ? 'gbk' : big5 ? 'big5' : 'utf8';

const headerEnd = headerSize + 8;
const keyHeaderSize = version >= 2 ? 40 : 16;
const keyHeaderExtra = version >= 2 ? 4 : 0;
const khOff = headerEnd;
const keywordBlocksNum = Number(b2n(buf, khOff, numWidth));
const keywordNum = Number(b2n(buf, khOff + numWidth, numWidth));
const keyInfoUnpackSize = version >= 2 ? Number(b2n(buf, khOff + 2 * numWidth, numWidth)) : 0;
const keyInfoPackedSize = Number(b2n(buf, khOff + (version >= 2 ? 3 : 2) * numWidth, numWidth));
const keywordBlockPackedSize = Number(b2n(buf, khOff + (version >= 2 ? 4 : 3) * numWidth, numWidth));
if (keywordBlocksNum <= 0) throw new Error('关键块数量异常');
const keyHeaderEnd = khOff + keyHeaderSize + keyHeaderExtra;

const zlibInflate = (data, off, len) => zlib.inflateSync(data.slice(off, off + len));
let keyInfo = buf.slice(keyHeaderEnd, keyHeaderEnd + keyInfoPackedSize);
if (version >= 2) {
  const isZlib = keyInfo.length >= 8 && keyInfo[0] === 2 && keyInfo[1] === 0 && keyInfo[2] === 0 && keyInfo[3] === 0;
  if (isZlib) {
    let src = keyInfo;
    if (encrypt === 2) src = mdxDecrypt(keyInfo);
    keyInfo = zlibInflate(src, 8, src.length - 8);
    if (keyInfo.length !== keyInfoUnpackSize) throw new Error('关键块信息解压异常');
  }
}
const blockInfo = [];
let infoOff = 0;
for (let i = 0; i < keywordBlocksNum; i++) {
  infoOff += numWidth; // blockWordCount
  let firstWordSize = Number(b2n(keyInfo, infoOff, numWidth / 4));
  infoOff += numWidth / 4;
  firstWordSize = version >= 2 ? (utf16 ? (firstWordSize + 1) * 2 : firstWordSize + 1) : utf16 ? firstWordSize * 2 : firstWordSize;
  infoOff += firstWordSize;
  let lastWordSize = Number(b2n(keyInfo, infoOff, numWidth / 4));
  infoOff += numWidth / 4;
  lastWordSize = version >= 2 ? (utf16 ? (lastWordSize + 1) * 2 : lastWordSize + 1) : utf16 ? lastWordSize * 2 : lastWordSize;
  infoOff += lastWordSize;
  const packSize = Number(b2n(keyInfo, infoOff, numWidth));
  infoOff += numWidth;
  const unpackSize = Number(b2n(keyInfo, infoOff, numWidth));
  infoOff += numWidth;
  blockInfo.push([packSize, unpackSize]);
}

const keyList = [];
let keyBlockStart = keyHeaderEnd + keyInfoPackedSize;
let blockPackAccu = 0;
for (let bi = 0; bi < blockInfo.length; bi++) {
  const [packSize] = blockInfo[bi];
  const kbPacked = buf.slice(keyBlockStart + blockPackAccu, keyBlockStart + blockPackAccu + packSize);
  if (kbPacked.length < 4) throw new Error('关键块数据异常');
  const compHex = Buffer.from(kbPacked.slice(0, 4)).toString('hex');
  let keyBlock;
  if (compHex === '00000000') keyBlock = Buffer.from(kbPacked.slice(8));
  else if (compHex === '02000000') keyBlock = Buffer.from(zlibInflate(kbPacked, 8, kbPacked.length - 8));
  else if (compHex === '01000000') throw new Error('LZO key block (not covered by this script)');
  else throw new Error('不支持的关键块压缩: ' + compHex);
  let pos = 0;
  while (pos + numWidth <= keyBlock.length) {
    const meaningOffset = Number(b2n(keyBlock, pos, numWidth));
    pos += numWidth;
    let end = -1;
    let i = pos;
    if (width === 2) {
      while (i + 1 < keyBlock.length) {
        if (keyBlock[i] === 0 && keyBlock[i + 1] === 0) { end = i; break; }
        i += 2;
      }
    } else {
      while (i < keyBlock.length) {
        if (keyBlock[i] === 0) { end = i; break; }
        i += 1;
      }
    }
    if (end === -1) break;
    const keyText = keyBlock.slice(pos, end).toString(dec);
    if (keyList.length > 0 && keyList[keyList.length - 1].recordEndOffset === -1) {
      keyList[keyList.length - 1].recordEndOffset = meaningOffset;
    }
    keyList.push({ keyText, recordStartOffset: meaningOffset, recordEndOffset: -1, keyBlockIdx: bi });
    pos = end + width;
  }
  blockPackAccu += packSize;
}
if (keyList.length !== keywordNum) throw new Error(`关键词数量不匹配（${keyList.length} != ${keywordNum}）`);

// ---- Compare against js-mdict ----
const raw = new Uint8Array(buf);
MDictLib.setBuffer(raw.buffer);
const parser = isMdd ? new MDictLib.MDD('dummy.mdd') : new MDictLib.MDX('dummy');
const jk = parser.keywordList;

const jkSorted = jk.map((x) => x.keyText).sort();
const natSorted = keyList.map((x) => x.keyText).sort();
let ok = true;
if (jkSorted.length !== natSorted.length) {
  ok = false;
  console.error(`key count mismatch: js-mdict=${jkSorted.length} native=${natSorted.length}`);
} else {
  for (let i = 0; i < jkSorted.length; i++) {
    if (jkSorted[i] !== natSorted[i]) {
      ok = false;
      console.error(`first key diff at ${i}: js-mdict=${JSON.stringify(jkSorted[i])} native=${JSON.stringify(natSorted[i])}`);
      break;
    }
  }
}
const ks = new Set(jkSorted);
const missing = keyList.filter((k) => !ks.has(k.keyText)).length;
if (missing > 0) {
  ok = false;
  console.error(`${missing} native keys missing from js-mdict set`);
}
for (const w of spotWords) {
  const a = jk.find((x) => x.keyText === w);
  const b = keyList.find((x) => x.keyText === w);
  if (a && b && a.recordStartOffset !== b.recordStartOffset) {
    ok = false;
    console.error(`${w}: offset mismatch js-mdict=${a.recordStartOffset} native=${b.recordStartOffset}`);
  } else if ((a && !b) || (!a && b)) {
    ok = false;
    console.error(`${w}: present in one side only`);
  } else {
    console.log(`${w}: js=${a ? a.recordStartOffset : '-'} native=${b ? b.recordStartOffset : '-'} OK`);
  }
}

console.log(`\n${filePath}`);
console.log(`  title=${headerMap.title} enc=${dec} encrypt=${encrypt} version=${version}`);
console.log(`  js-mdict keys=${jkSorted.length}, native keys=${natSorted.length}, sorted sets equal=${jkSorted.length === natSorted.length && !missing}`);
console.log(ok ? 'PARITY OK' : 'PARITY FAILED');
process.exit(ok ? 0 : 1);
