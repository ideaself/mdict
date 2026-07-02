/**
 * Browser MDX Parser v5 — with encryption support (mdxDecrypt + ripemd128)
 * Handles Encrypted="2" dictionaries like Oxford 10th
 */

// ═══════ RIPEMD-128 ═══════
const _R128_S = [
  [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8],
  [7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12],
  [11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5],
  [11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12],
  [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6],
  [9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11],
  [9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5],
  [15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8],
];
const _R128_X = [
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
  [7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8],
  [3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12],
  [1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2],
  [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12],
  [6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2],
  [15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13],
  [8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14],
];
const _R128_K = [0x00000000,0x5a827999,0x6ed9eba1,0x8f1bbcdc,0x50a28be6,0x5c4dd124,0x6d703ef3,0x00000000];
const _R128_F = [
  (x,y,z) => x^y^z,
  (x,y,z) => (x&y)|(~x&z),
  (x,y,z) => (x|~y)^z,
  (x,y,z) => (x&z)|(y&~z),
];

function _rotl(x,n){return(x>>>(32-n))|(x<<n);}

function ripemd128(buf){
  const hash=new Uint32Array([0x67452301,0xefcdab89,0x98badcfe,0x10325476]);
  let bytes=buf.byteLength;
  const src=new Uint8Array(buf);
  const padLen=(bytes%64<56?56:120)-(bytes%64);
  const padded=new Uint8Array(src.length+padLen+8);
  padded.set(src);
  padded[src.length]=0x80;
  const dv=new DataView(padded.buffer);
  dv.setUint32(padded.length-8,bytes*8,true);
  dv.setUint32(padded.length-4,0,true);
  const x=new Uint32Array(padded.buffer);

  for(let i=0;i<x.length;i+=16){
    let aa=hash[0],bb=hash[1],cc=hash[2],dd=hash[3];
    let aaa=aa,bbb=bb,ccc=cc,ddd=dd;
    for(let t=0;t<64;t++){
      const r=t>>4;
      aa=_rotl(aa+_R128_F[r](bb,cc,dd)+x[i+_R128_X[r][t%16]]+_R128_K[r],_R128_S[r][t%16]);
      const tmp=dd;dd=cc;cc=bb;bb=aa;aa=tmp;
    }
    for(let t=64;t<128;t++){
      const r=t>>4,rr=(63-(t%64))>>4;
      aaa=_rotl(aaa+_R128_F[rr](bbb,ccc,ddd)+x[i+_R128_X[r][t%16]]+_R128_K[r],_R128_S[r][t%16]);
      const tmp=ddd;ddd=ccc;ccc=bbb;bbb=aaa;aaa=tmp;
    }
    hash[1]=hash[2]+cc+ddd;hash[2]=hash[3]+dd+aaa;hash[3]=hash[0]+aa+bbb;hash[0]=hash[1]+bb+ccc;
    hash[1]=(hash[1]+ddd)>>>0;hash[2]=(hash[2]+aaa)>>>0;hash[3]=(hash[3]+bbb)>>>0;hash[0]=(hash[0]+ccc)>>>0;
  }
  return new Uint8Array(hash.buffer);
}

// ═══════ MDX DECRYPT ═══════

function fast_decrypt(b, key) {
  let prev = 0x36;
  for (let i = 0; i < b.length; ++i) {
    let t = ((b[i] >> 4) | (b[i] << 4)) & 0xff;
    t = t ^ prev ^ (i & 0xff) ^ key[i % key.length];
    prev = b[i];
    b[i] = t;
  }
  return b;
}

function mdxDecrypt(comp_block) {
  const keyin = new Uint8Array(8);
  keyin.set(comp_block.slice(4, 8));
  keyin[4] ^= 0x95;
  keyin[5] ^= 0x36;
  keyin[6] ^= 0x00;
  keyin[7] ^= 0x00;
  const key = ripemd128(keyin.buffer);
  const result = new Uint8Array(comp_block.length);
  result.set(comp_block.slice(0, 8));
  const decrypted = fast_decrypt(new Uint8Array(comp_block.slice(8)), key);
  result.set(decrypted, 8);
  return result;
}

// ═══════ MDX PARSER ═══════

class MDXParser {
  constructor() {
    this.buffer = null;
    this.header = {};
    this.version = 0;
    this.numWidth = 8;
    this.encoding = 'UTF-8';
    this.decoder = new TextDecoder('utf-8');
    this.encrypt = 0;
    this.keyHeader = {};
    this.keyInfoList = [];
    this.recordHeader = {};
    this.recordInfoList = [];
    this._offsets = {};
    this._blockCache = {};
    this._recordCache = {};
  }

  parse(arrayBuffer) {
    this.buffer = arrayBuffer;
    this._readHeader();
    this._readKeyHeader();
    this._readKeyInfos();
    this._readRecordHeader();
    this._readRecordInfos();
    console.log('MDX parsed: blocks=' + this.keyHeader.keywordBlocksNum +
      ' keywords=' + this.keyHeader.keywordNum +
      ' encrypt=' + this.encrypt);
    return {
      title: this.header.Title || 'Unknown',
      version: this.version,
      encoding: this.encoding,
      keywordCount: this.keyHeader.keywordNum
    };
  }

  _rb(o, n) { return new Uint8Array(this.buffer, o, n); }

  _u32(b) { return ((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0; }

  _u64(b) {
    const hi = ((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0;
    const lo = ((b[4]<<24)|(b[5]<<16)|(b[6]<<8)|b[7])>>>0;
    return hi * 4294967296 + lo;
  }

  _n(b) {
    if (b.length === 8) return this._u64(b);
    if (b.length === 4) return this._u32(b);
    if (b.length === 2) return (b[0]<<8)|b[1];
    return b[0];
  }

  _decomp(raw) {
    const t = this._u32(raw);
    if (t === 0x00000000) return raw.slice(8);
    let data = raw.slice(8);
    if (this.encrypt === 1) {
      data = mdxDecrypt(raw).slice(8);
    }
    if (t === 0x02000000) {
      try { return pako.inflate(data); } catch(e) {}
    }
    if (t === 0x01000000) {
      try { return pako.inflate(data); } catch(e) {}
    }
    return data;
  }

  // ── Header ──

  _readHeader() {
    const hLen = this._u32(this._rb(0, 4));
    const hText = new TextDecoder('utf-16le').decode(this._rb(4, hLen));
    const re = /(\w+)="((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(hText)) !== null) {
      this.header[m[1]] = m[2].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
    }
    this._offsets.headerEnd = 4 + hLen + 4;

    const enc = (this.header.Encoding || '').toLowerCase();
    if (enc === 'gbk' || enc === 'gb2312') { this.encoding = 'GB18030'; this.decoder = new TextDecoder('gb18030'); }
    else if (enc === 'big5') { this.encoding = 'BIG5'; this.decoder = new TextDecoder('big5'); }
    else if (enc === 'utf16' || enc === 'utf-16') { this.encoding = 'UTF-16'; this.decoder = new TextDecoder('utf-16le'); }

    this.version = parseFloat(this.header.GeneratedByEngineVersion) || 0;
    this.numWidth = this.version >= 2.0 ? 8 : 4;

    const e = this.header.Encrypted || 'No';
    if (e === 'Yes') this.encrypt = 1;
    else if (e !== 'No' && e !== '') this.encrypt = parseInt(e, 10);
    else this.encrypt = 0;
  }

  // ── Key Header ──

  _readKeyHeader() {
    const nw = this.numWidth;
    const sz = this.version >= 2.0 ? nw * 5 : nw * 4;
    const b = this._rb(this._offsets.headerEnd, sz);
    let o = 0;
    this.keyHeader.keywordBlocksNum = this._n(b.slice(o,o+nw)); o+=nw;
    this.keyHeader.keywordNum = this._n(b.slice(o,o+nw)); o+=nw;
    if (this.version >= 2.0) { this.keyHeader.keyInfoUnpackSize = this._n(b.slice(o,o+nw)); o+=nw; }
    this.keyHeader.keyInfoPackedSize = this._n(b.slice(o,o+nw)); o+=nw;
    this.keyHeader.keywordBlockPackedSize = this._n(b.slice(o,o+nw)); o+=nw;
    this._offsets.keyInfoStart = this._offsets.headerEnd + sz + (this.version >= 2.0 ? 4 : 0);
  }

  // ── Key Block Info (with encryption + decompression) ──

  _readKeyInfos() {
    const raw = this._rb(this._offsets.keyInfoStart, this.keyHeader.keyInfoPackedSize);
    let buff = raw;

    if (this.version >= 2.0) {
      // Step 1: decrypt if needed
      if (this.encrypt === 2) {
        buff = mdxDecrypt(new Uint8Array(raw));
        console.log('Key block info decrypted');
      }

      // Step 2: check compression type (first 4 bytes)
      const compType = this._u32(buff);
      console.log('Key info comp type: 0x' + compType.toString(16));

      if (compType === 0x02000000) {
        // zlib compressed — decompress from offset 8
        try {
          buff = pako.inflate(buff.slice(8));
          console.log('Key info decompressed to', buff.length, 'bytes');
        } catch(e) {
          console.error('Key info zlib failed:', e.message);
          // fallback: try without the 8-byte header
          try { buff = pako.inflate(buff); } catch(e2) {}
        }
      }
      // If compType is 0 or unknown, buff stays as-is (decrypted but not compressed)
    }

    // Parse key block info entries
    this.keyInfoList = [];
    let o = 0, packAcc = 0, unpackAcc = 0, entAcc = 0;
    const nw = this.numWidth, nw4 = nw / 4;

    for (let i = 0; i < this.keyHeader.keywordBlocksNum; i++) {
      const cnt = this._n(buff.slice(o,o+nw)); o+=nw;
      let fws = this._n(buff.slice(o,o+nw4)); o+=nw4;
      if (this.version >= 2.0) fws = this.encoding === 'UTF-16' ? (fws+1)*2 : fws+1;
      else if (this.encoding === 'UTF-16') fws *= 2;
      const fw = this.decoder.decode(buff.slice(o,o+fws)); o+=fws;

      let lws = this._n(buff.slice(o,o+nw4)); o+=nw4;
      if (this.version >= 2.0) lws = this.encoding === 'UTF-16' ? (lws+1)*2 : lws+1;
      else if (this.encoding === 'UTF-16') lws *= 2;
      const lw = this.decoder.decode(buff.slice(o,o+lws)); o+=lws;

      const ps = this._n(buff.slice(o,o+nw)); o+=nw;
      const us = this._n(buff.slice(o,o+nw)); o+=nw;

      this.keyInfoList.push({
        firstKey: fw, lastKey: lw,
        keyBlockPackSize: ps, keyBlockPackAccumulator: packAcc,
        keyBlockUnpackSize: us, keyBlockUnpackAccumulator: unpackAcc,
        keyBlockEntriesNum: cnt, keyBlockEntriesNumAccumulator: entAcc
      });
      packAcc += ps; unpackAcc += us; entAcc += cnt;
    }

    this._offsets.keyBlockStart = this._offsets.keyInfoStart + this.keyHeader.keyInfoPackedSize;
    this._offsets.keyBlockEnd = this._offsets.keyBlockStart + this.keyHeader.keywordBlockPackedSize;
  }

  // ── Key Block (lazy load) ──

  _loadBlock(idx) {
    if (this._blockCache[idx]) return this._blockCache[idx];
    const info = this.keyInfoList[idx];
    const raw = this._rb(this._offsets.keyBlockStart + info.keyBlockPackAccumulator, info.keyBlockPackSize);
    const kb = this._decomp(raw);
    const keys = this._splitKeyBlock(kb, idx);
    this._blockCache[idx] = keys;
    return keys;
  }

  _splitKeyBlock(kb, blockIdx) {
    const w = this.encoding === 'UTF-16' ? 2 : 1;
    const list = [];
    let i = 0;
    while (i < kb.length) {
      const ro = this._n(kb.slice(i, i+this.numWidth));
      i += this.numWidth;
      let end = -1;
      for (let j = i; j < kb.length-(w-1); j+=w) {
        if (w===1 && kb[j]===0) { end=j; break; }
        if (w===2 && kb[j]===0 && kb[j+1]===0) { end=j; break; }
      }
      if (end === -1) break;
      const kt = this.decoder.decode(kb.slice(i, end));
      if (list.length > 0) list[list.length-1].recordEndOffset = ro;
      list.push({ recordStartOffset: ro, keyText: kt, keyBlockIdx: blockIdx, recordEndOffset: -1 });
      i = end + w;
    }
    return list;
  }

  // ── Record Header & Info ──

  _readRecordHeader() {
    const start = this._offsets.keyBlockEnd;
    const nw = this.numWidth;
    const b = this._rb(start, nw*4);
    let o = 0;
    this.recordHeader.recordBlocksNum = this._n(b.slice(o,o+nw)); o+=nw;
    this.recordHeader.entriesNum = this._n(b.slice(o,o+nw)); o+=nw;
    this.recordHeader.recordInfoCompSize = this._n(b.slice(o,o+nw)); o+=nw;
    this.recordHeader.recordBlockCompSize = this._n(b.slice(o,o+nw)); o+=nw;
    this._offsets.recordInfoStart = start + nw*4;
  }

  _readRecordInfos() {
    const b = this._rb(this._offsets.recordInfoStart, this.recordHeader.recordInfoCompSize);
    this.recordInfoList = [];
    let o = 0, ca = 0, da = 0;
    for (let i = 0; i < this.recordHeader.recordBlocksNum; i++) {
      const ps = this._n(b.slice(o,o+this.numWidth)); o+=this.numWidth;
      const us = this._n(b.slice(o,o+this.numWidth)); o+=this.numWidth;
      this.recordInfoList.push({ packSize:ps, packAccumulateOffset:ca, unpackSize:us, unpackAccumulatorOffset:da });
      ca += ps; da += us;
    }
    this._offsets.recordBlockStart = this._offsets.recordInfoStart + this.recordHeader.recordInfoCompSize;
  }

  _reduceRecordBlock(s) {
    let l=0,r=this.recordInfoList.length-1,m=0;
    while(l<=r){m=l+((r-l)>>1);if(s>=this.recordInfoList[m].unpackAccumulatorOffset)l=m+1;else r=m-1;}
    return l-1;
  }

  _getRecordBlock(idx) {
    if (this._recordCache[idx]) return this._recordCache[idx];
    const info = this.recordInfoList[idx];
    const raw = this._rb(this._offsets.recordBlockStart+info.packAccumulateOffset, info.packSize);
    const buf = this._decomp(raw);
    if (Object.keys(this._recordCache).length > 20) this._recordCache = {};
    this._recordCache[idx] = buf;
    return buf;
  }

  _getDef(item) {
    let eOff = item.recordEndOffset;
    if (eOff === -1 || eOff === undefined) {
      const keys = this._blockCache[item.keyBlockIdx];
      if (keys) {
        const pos = keys.indexOf(item);
        if (pos >= 0 && pos < keys.length-1) eOff = keys[pos+1].recordStartOffset;
      }
      if (eOff === -1 || eOff === undefined) {
        const nb = item.keyBlockIdx+1;
        if (nb < this.keyInfoList.length) {
          const nk = this._loadBlock(nb);
          if (nk.length > 0) eOff = nk[0].recordStartOffset;
        }
        if (eOff === -1 || eOff === undefined) {
          const lr = this.recordInfoList[this.recordInfoList.length-1];
          eOff = lr.unpackAccumulatorOffset + lr.unpackSize;
        }
      }
    }
    const bi = this._reduceRecordBlock(item.recordStartOffset);
    if (bi < 0) return null;
    const ri = this.recordInfoList[bi];
    const buf = this._getRecordBlock(bi);
    const s = item.recordStartOffset - ri.unpackAccumulatorOffset;
    const e = eOff - ri.unpackAccumulatorOffset;
    if (s < 0 || e > buf.length || s >= e) return null;
    return { keyText: item.keyText, definition: this.decoder.decode(buf.slice(s, e)) };
  }

  // ── Public API ──

  lookup(word) {
    const bi = this._findBlock(word);
    if (bi < 0) return null;
    const keys = this._loadBlock(bi);
    for (const k of keys) {
      if (k.keyText === word || k.keyText.toLowerCase() === word.toLowerCase()) {
        return this._getDef(k);
      }
    }
    return null;
  }

  _findBlock(word) {
    let lo=0,hi=this.keyInfoList.length-1;
    while(lo<=hi){
      const m=(lo+hi)>>1;
      const info=this.keyInfoList[m];
      if(word<info.firstKey)hi=m-1;
      else if(word>info.lastKey)lo=m+1;
      else return m;
    }
    return Math.max(0,Math.min(lo,this.keyInfoList.length-1));
  }

  prefixSearch(prefix) {
    const lp = prefix.toLowerCase(), res = [];
    for (let i = 0; i < this.keyInfoList.length && res.length < 50; i++) {
      const info = this.keyInfoList[i];
      if (info.lastKey.toLowerCase() < lp) continue;
      if (info.firstKey.toLowerCase() > lp + '\uffff') break;
      const keys = this._loadBlock(i);
      for (const k of keys) {
        if (k.keyText.toLowerCase().startsWith(lp)) { res.push(k); if (res.length >= 50) break; }
      }
    }
    return res;
  }

  containsSearch(sub) {
    const ls = sub.toLowerCase(), res = [];
    for (let i = 0; i < this.keyInfoList.length && res.length < 50; i++) {
      const keys = this._loadBlock(i);
      for (const k of keys) {
        if (k.keyText.toLowerCase().includes(ls)) { res.push(k); if (res.length >= 50) break; }
      }
    }
    return res;
  }

  getAllKeywords() {
    const all = [];
    for (let i = 0; i < this.keyInfoList.length; i++) all.push(...this._loadBlock(i));
    return all;
  }
}

window.MDXParser = MDXParser;
