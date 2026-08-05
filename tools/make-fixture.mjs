#!/usr/bin/env node
/**
 * Generates tiny synthetic MDX/MDD fixtures (a few KB) so the index-parity
 * check (tools/verify-index.mjs) can run in CI without committing a real
 * dictionary file.
 *
 * Usage:
 *   node tools/make-fixture.mjs <output-dir>
 * Writes <output-dir>/fixture.mdx and <output-dir>/fixture.mdd
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function u64be(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(n));
  return b;
}
function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}
function u16be(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
}

const ZERO8 = Buffer.alloc(8);

/**
 * Builds a minimal MDict v2 file.
 * @param {boolean} utf16Keys true for MDD-style UTF-16LE keys
 * @param {{key: string, def: string}[]} entries sorted by code-unit order
 */
function buildFile({ utf16Keys, title, entries }) {
  const keyBufs = entries.map((e) => Buffer.from(e.key, utf16Keys ? 'utf16le' : 'utf8'));
  const defBufs = entries.map((e) => Buffer.from(e.def, 'utf8'));
  const term = utf16Keys ? Buffer.from([0, 0]) : Buffer.from([0]);

  const headerXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<Dictionary Title="${title}" GeneratedByEngineVersion="2.0" ` +
    `Encoding="${utf16Keys ? 'UTF-16' : 'UTF-8'}" Encrypted="No"></Dictionary>\n`;
  const headerBuf = Buffer.from(headerXml, 'utf16le');

  // record block: [packType 00000000][4 zero bytes][payload]
  const recordPayload = Buffer.concat(defBufs);
  const recordBlock = Buffer.concat([u32be(0), Buffer.alloc(4), recordPayload]);

  // key block: [packType 00000000][4 zero bytes][per key: u64 meaningOffset + key + terminator]
  const keyParts = [];
  let off = 0;
  for (let i = 0; i < entries.length; i++) {
    keyParts.push(u64be(off), keyBufs[i], term);
    off += defBufs[i].length;
  }
  const keyBlock = Buffer.concat([u32be(0), Buffer.alloc(4), Buffer.concat(keyParts)]);

  // key info (uncompressed): [packType 00000000][4 zero bytes][block entries]
  // stored size counts the terminator: buffer length is size+1 (utf8) / (size+1)*2 (utf16)
  const wordSize = (b) => (utf16Keys ? b.length / 2 : b.length);
  const firstW = keyBufs[0];
  const lastW = keyBufs[keyBufs.length - 1];
  const firstWordBlock = utf16Keys ? Buffer.concat([firstW, Buffer.from([0, 0])]) : Buffer.concat([firstW, Buffer.from([0])]);
  const lastWordBlock = utf16Keys ? Buffer.concat([lastW, Buffer.from([0, 0])]) : Buffer.concat([lastW, Buffer.from([0])]);
  const keyInfoEntries = Buffer.concat([
    u64be(entries.length), // blockWordCount
    u16be(wordSize(firstW)), firstWordBlock,
    u16be(wordSize(lastW)), lastWordBlock,
    u64be(keyBlock.length), // packSize
    u64be(keyBlock.length), // unpackSize (raw, no compression)
  ]);
  // Real v2 files always zlib-compress the key info. The type marker is the
  // 4 bytes [2,0,0,0] (hex "02000000") followed by 4 reserved bytes.
  const keyInfoCompressed = zlib.deflateSync(keyInfoEntries);
  const keyInfo = Buffer.concat([Buffer.from([2, 0, 0, 0]), Buffer.alloc(4), keyInfoCompressed]);

  // key header (v2): 5 x u64 + 4-byte checksum
  const keyHeader = Buffer.concat([
    u64be(1), // keywordBlocksNum
    u64be(entries.length), // keywordNum
    u64be(keyInfoEntries.length), // keyInfoUnpackSize
    u64be(keyInfo.length), // keyInfoPackedSize
    u64be(keyBlock.length), // keywordBlockPackedSize
    Buffer.alloc(4),
  ]);

  // record header (v2): 4 x u64
  const recordInfo = Buffer.concat([u64be(recordBlock.length), u64be(recordPayload.length)]);
  const recordHeader = Buffer.concat([
    u64be(1), // recordBlocksNum
    u64be(entries.length), // entriesNum
    u64be(recordInfo.length), // recordInfoCompSize
    u64be(recordBlock.length), // recordBlockCompSize
  ]);

  return Buffer.concat([
    u32be(headerBuf.length),
    headerBuf,
    u32be(0), // adler32 (not verified by the parsers)
    keyHeader,
    keyInfo,
    keyBlock,
    recordHeader,
    recordInfo,
    recordBlock,
  ]);
}

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node tools/make-fixture.mjs <output-dir>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const mdxEntries = [
  { key: '1', def: '<p>def one</p>' },
  { key: 'A', def: '<p>def A</p>' },
  { key: 'a-b', def: '<p>def a-b</p>' },
  { key: 'a_b', def: '<p>def a_b</p>' },
  { key: 'apple', def: '<p>def apple</p>' },
  { key: 'bat', def: '<p>def bat</p>' },
  { key: 'hello', def: '<p>def hello</p>' },
  { key: 'we', def: '<p>def we</p>' },
];
fs.writeFileSync(
  path.join(outDir, 'fixture.mdx'),
  buildFile({ utf16Keys: false, title: 'fixture-mdx', entries: mdxEntries })
);

const mddEntries = [
  { key: '\\1.png', def: 'PNG-FIXTURE-1' },
  { key: '\\a_b.png', def: 'PNG-FIXTURE-2' },
  { key: '\\bat.mp3', def: 'MP3-FIXTURE' },
  { key: '\\hello.mp3', def: 'MP3-FIXTURE-2' },
  { key: '\\we.mp3', def: 'MP3-FIXTURE-3' },
];
fs.writeFileSync(
  path.join(outDir, 'fixture.mdd'),
  buildFile({ utf16Keys: true, title: 'fixture-mdd', entries: mddEntries })
);

console.log('fixtures written to', outDir);
