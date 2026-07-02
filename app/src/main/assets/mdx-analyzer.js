/**
 * Diagnostic MDX analyzer - dumps raw bytes at each section boundary
 */
class MDXAnalyzer {
    parse(arrayBuffer) {
        const buf = new Uint8Array(arrayBuffer);
        const log = (msg) => { console.log('[ANALYZER] ' + msg); };

        log('Total file size: ' + buf.length);

        // Dump first 32 bytes
        log('First 32 bytes: ' + Array.from(buf.slice(0, 32)).map(b => b.toString(16).padStart(2,'0')).join(' '));

        // Header length (4 bytes big-endian at offset 0)
        const hLen = (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
        log('Header length: ' + hLen);

        // Header text (UTF-16LE)
        const hText = new TextDecoder('utf-16le').decode(buf.slice(4, 4 + Math.min(hLen, 2000)));
        log('Header text (first 500 chars): ' + hText.substring(0, 500));

        const headerEnd = 4 + hLen + 4; // +4 for adler32
        log('Header end offset: ' + headerEnd);

        // Bytes at header end
        log('Bytes at headerEnd (' + headerEnd + '): ' + Array.from(buf.slice(headerEnd, headerEnd + 40)).map(b => b.toString(16).padStart(2,'0')).join(' '));

        // Detect version from header
        const versionMatch = hText.match(/GeneratedByEngineVersion="([^"]+)"/);
        const version = versionMatch ? parseFloat(versionMatch[1]) : 0;
        log('Version: ' + version);

        const nw = version >= 2.0 ? 8 : 4;
        const keyHeaderSize = version >= 2.0 ? nw * 5 : nw * 4;
        log('Key header size: ' + keyHeaderSize);

        // Parse key header
        let o = headerEnd;
        const keyBlocksNum = readN(buf, o, nw); o += nw;
        const keywordNum = readN(buf, o, nw); o += nw;
        log('Key blocks: ' + keyBlocksNum + ', keywords: ' + keywordNum);

        let keyInfoUnpackSize = 0;
        if (version >= 2.0) {
            keyInfoUnpackSize = readN(buf, o, nw); o += nw;
            log('Key info unpack size: ' + keyInfoUnpackSize);
        }

        const keyInfoPackedSize = readN(buf, o, nw); o += nw;
        log('Key info packed size: ' + keyInfoPackedSize);

        const keyBlockPackedSize = readN(buf, o, nw); o += nw;
        log('Key block packed size: ' + keyBlockPackedSize);

        if (version >= 2.0) {
            o += 4; // adler32
            log('Skipped adler32, now at: ' + o);
        }

        // Key block info starts here
        log('Key block info start: ' + o);
        log('Key block info first 32 bytes: ' + Array.from(buf.slice(o, o + 32)).map(b => b.toString(16).padStart(2,'0')).join(' '));

        // Try to decompress key block info
        const infoRaw = buf.slice(o, o + keyInfoPackedSize);
        const infoCompType = (infoRaw[0] << 24 | infoRaw[1] << 16 | infoRaw[2] << 8 | infoRaw[3]) >>> 0;
        log('Key block info comp type: 0x' + infoCompType.toString(16) + ' (' + infoCompType + ')');
        log('Key block info first 16 bytes: ' + Array.from(infoRaw.slice(0, 16)).map(b => b.toString(16).padStart(2,'0')).join(' '));

        if (infoCompType === 0x02000000) {
            try {
                const decompressed = pako.inflate(infoRaw.slice(8));
                log('Decompressed key block info size: ' + decompressed.length);
                log('Decompressed first 32 bytes: ' + Array.from(decompressed.slice(0, 32)).map(b => b.toString(16).padStart(2,'0')).join(' '));

                // Parse first entry
                if (decompressed.length >= nw * 3) {
                    let po = 0;
                    const blockWordCount = readN(decompressed, po, nw); po += nw;
                    log('First block word count: ' + blockWordCount);
                    const firstWordSizeRaw = readN(decompressed, po, nw / 4); po += nw / 4;
                    log('First word size raw: ' + firstWordSizeRaw);
                    const adjustedSize = version >= 2.0 ? firstWordSizeRaw + 1 : firstWordSizeRaw;
                    log('Adjusted first word size: ' + adjustedSize);
                    if (adjustedSize > 0 && adjustedSize < 1000) {
                        const firstWord = new TextDecoder('utf-8').decode(decompressed.slice(po, po + adjustedSize));
                        log('First word: "' + firstWord + '"');
                    }
                }
            } catch(e) {
                log('DECOMPRESS FAILED: ' + e.message);

                // Check if first 8 bytes look like they might not be a compression header
                log('Raw info first 8 bytes as numbers: ' + Array.from(infoRaw.slice(0, 8)).join(', '));

                // Maybe the key block info is NOT compressed? Try parsing directly
                log('Trying to parse key block info as raw data...');
                let po = 0;
                const testCount = readN(infoRaw, po, nw);
                log('If raw: first value (as keyBlockCount?): ' + testCount);
                po = 0;
                const testWordCount = readN(infoRaw, po, nw);
                log('If raw: first value as wordCount: ' + testWordCount);
            }
        } else {
            log('Key block info is NOT zlib compressed (comp type: 0x' + infoCompType.toString(16) + ')');
        }

        // Also check what's at the key block start
        const keyBlockStart = o + keyInfoPackedSize;
        log('Key block data start: ' + keyBlockStart);
        log('Key block first 32 bytes: ' + Array.from(buf.slice(keyBlockStart, keyBlockStart + 32)).map(b => b.toString(16).padStart(2,'0')).join(' '));

        // Check record header location
        const recordHeaderStart = keyBlockStart + keyBlockPackedSize;
        log('Record header start: ' + recordHeaderStart);
        if (recordHeaderStart < buf.length) {
            log('Record header bytes: ' + Array.from(buf.slice(recordHeaderStart, recordHeaderStart + 40)).map(b => b.toString(16).padStart(2,'0')).join(' '));
        }

        return { title: 'Analyzer Output', version, keywordCount: 0 };
    }
}

function readN(arr, offset, n) {
    let val = 0;
    for (let i = 0; i < n; i++) {
        val = (val << 8) | (arr[offset + i] & 0xff);
    }
    return val >>> 0;
}

window.MDXAnalyzer = MDXAnalyzer;
