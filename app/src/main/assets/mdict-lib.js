(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer2;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer2.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length);
      }
      Buffer2.poolSize = 8192;
      function from(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer2.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer2.from = function(value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length);
      };
      Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer2, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer2.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer2.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer2.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = byteLength(string, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array);
        } else if (length === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length);
        }
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer2.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer2.alloc(+length);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer2.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer2.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list.length; ++i) {
            length += list[i].length;
          }
        }
        const buffer = Buffer2.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer2.isBuffer(buf)) buf = Buffer2.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer2.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer2.isBuffer(string)) {
          return string.length;
        }
        if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
          return string.byteLength;
        }
        if (typeof string !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
          );
        }
        const len = string.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer2.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer2.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer2.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer2.prototype.toString = function toString() {
        const length = this.length;
        if (length === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals(b) {
        if (!Buffer2.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
      }
      Buffer2.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer2.from(target, target.offset, target.byteLength);
        }
        if (!Buffer2.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer2.from(val, encoding);
        }
        if (Buffer2.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer2.prototype.write = function write(string, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining) length = remaining;
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string, offset, length);
            case "base64":
              return base64Write(this, string, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string, offset, length);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer2.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer2.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer2.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length}`,
          value
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        let codePoint;
        const length = string.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = (function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      })();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // shims/lzo1x.js
  var require_lzo1x = __commonJS({
    "shims/lzo1x.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var lzo1x = function lzo1x2() {
        function _lzo1x() {
        }
        _lzo1x.prototype = {
          blockSize: 4096,
          OK: 0,
          INPUT_OVERRUN: -4,
          OUTPUT_OVERRUN: -5,
          LOOKBEHIND_OVERRUN: -6,
          EOF_FOUND: -999,
          buf: null,
          buf32: null,
          out: null,
          out32: null,
          cbl: 0,
          ip_end: 0,
          op_end: 0,
          t: 0,
          ip: 0,
          op: 0,
          m_pos: 0,
          skipToFirstLiteralFun: false,
          ctzl(v) {
            let c;
            if (v & 1) {
              c = 0;
            } else {
              c = 1;
              if ((v & 65535) === 0) {
                v >>= 16;
                c += 16;
              }
              if ((v & 255) === 0) {
                v >>= 8;
                c += 8;
              }
              if ((v & 15) === 0) {
                v >>= 4;
                c += 4;
              }
              if ((v & 3) === 0) {
                v >>= 2;
                c += 2;
              }
              c -= v & 1;
            }
            return c;
          },
          extendBuffer() {
            const newBuffer = new Uint8Array(this.cbl + this.blockSize);
            newBuffer.set(this.out);
            this.out = newBuffer;
            this.out32 = new Uint32Array(this.out.buffer);
            this.state.outputBuffer = this.out;
            this.cbl = this.out.length;
          },
          eof_found() {
            return this.ip === this.ip_end ? 0 : this.ip < this.ip_end ? -8 : -4;
          },
          match_next() {
            while (this.op + 3 > this.cbl) {
              this.extendBuffer();
            }
            this.out[this.op++] = this.buf[this.ip++];
            if (this.t > 1) {
              this.out[this.op++] = this.buf[this.ip++];
              if (this.t > 2) {
                this.out[this.op++] = this.buf[this.ip++];
              }
            }
            this.t = this.buf[this.ip++];
          },
          match_done() {
            this.t = this.buf[this.ip - 2] & 3;
            return this.t;
          },
          copy_match() {
            this.t += 2;
            while (this.op + this.t > this.cbl) {
              this.extendBuffer();
            }
            if (this.t > 4 && this.op % 4 === this.m_pos % 4) {
              while (this.op % 4 > 0) {
                this.out[this.op++] = this.out[this.m_pos++];
                this.t--;
              }
              while (this.t > 4) {
                this.out32[0 | this.op / 4] = this.out32[0 | this.m_pos / 4];
                this.op += 4;
                this.m_pos += 4;
                this.t -= 4;
              }
            }
            do {
              this.out[this.op++] = this.out[this.m_pos++];
            } while (--this.t > 0);
          },
          copy_from_buf() {
            while (this.op + this.t > this.cbl) {
              this.extendBuffer();
            }
            if (this.t > 4 && this.op % 4 === this.ip % 4) {
              while (this.op % 4 > 0) {
                this.out[this.op++] = this.buf[this.ip++];
                this.t--;
              }
              while (this.t > 4) {
                this.out32[0 | this.op / 4] = this.buf32[0 | this.ip / 4];
                this.op += 4;
                this.ip += 4;
                this.t -= 4;
              }
            }
            do {
              this.out[this.op++] = this.buf[this.ip++];
            } while (--this.t > 0);
          },
          match() {
            for (; ; ) {
              if (this.t >= 64) {
                this.m_pos = this.op - 1;
                this.m_pos -= this.t >> 2 & 7;
                this.m_pos -= this.buf[this.ip++] << 3;
                this.t = (this.t >> 5) - 1;
                this.copy_match();
                if (this.match_done() === 0) {
                  break;
                } else {
                  this.match_next();
                  continue;
                }
              } else if (this.t >= 32) {
                this.t &= 31;
                if (this.t === 0) {
                  while (this.buf[this.ip] === 0) {
                    this.t += 255;
                    this.ip++;
                  }
                  this.t += 31 + this.buf[this.ip++];
                }
                this.m_pos = this.op - 1;
                this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6);
                this.ip += 2;
              } else if (this.t >= 16) {
                this.m_pos = this.op;
                this.m_pos -= (this.t & 8) << 11;
                this.t &= 7;
                if (this.t === 0) {
                  while (this.buf[this.ip] === 0) {
                    this.t += 255;
                    this.ip++;
                  }
                  this.t += 7 + this.buf[this.ip++];
                }
                this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6);
                this.ip += 2;
                if (this.m_pos === this.op) {
                  this.state.outputBuffer = this.state.outputBuffer.subarray(0, this.op);
                  return this.EOF_FOUND;
                }
                this.m_pos -= 16384;
              } else {
                this.m_pos = this.op - 1;
                this.m_pos -= this.t >> 2;
                this.m_pos -= this.buf[this.ip++] << 2;
                while (this.op + 2 > this.cbl) {
                  this.extendBuffer();
                }
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos];
                if (this.match_done() === 0) {
                  break;
                } else {
                  this.match_next();
                  continue;
                }
              }
              this.copy_match();
              if (this.match_done() === 0) {
                break;
              }
              this.match_next();
            }
            return this.OK;
          },
          decompress(state) {
            this.state = state;
            this.buf = this.state.inputBuffer;
            const buf_4b = new Uint8Array(this.buf.length + (4 - this.buf.length % 4));
            buf_4b.set(this.buf);
            this.buf32 = new Uint32Array(buf_4b.buffer);
            this.out = new Uint8Array(this.buf.length + (this.blockSize - this.buf.length % this.blockSize));
            this.out32 = new Uint32Array(this.out.buffer);
            this.cbl = this.out.length;
            this.state.outputBuffer = this.out;
            this.ip_end = this.buf.length;
            this.op_end = this.out.length;
            this.t = 0;
            this.ip = 0;
            this.op = 0;
            this.m_pos = 0;
            this.skipToFirstLiteralFun = false;
            if (this.buf[this.ip] > 17) {
              this.t = this.buf[this.ip++] - 17;
              if (this.t < 4) {
                this.match_next();
                const ret = this.match();
                if (ret !== this.OK) {
                  return ret === this.EOF_FOUND ? this.OK : ret;
                }
              } else {
                this.copy_from_buf();
                this.skipToFirstLiteralFun = true;
              }
            }
            for (; ; ) {
              if (!this.skipToFirstLiteralFun) {
                this.t = this.buf[this.ip++];
                if (this.t >= 16) {
                  const ret2 = this.match();
                  if (ret2 !== this.OK) {
                    return ret2 === this.EOF_FOUND ? this.OK : ret2;
                  }
                  continue;
                }
                if (this.t === 0) {
                  while (this.buf[this.ip] === 0) {
                    this.t += 255;
                    this.ip++;
                  }
                  this.t += 15 + this.buf[this.ip++];
                }
                this.t += 3;
                this.copy_from_buf();
              } else {
                this.skipToFirstLiteralFun = false;
              }
              this.t = this.buf[this.ip++];
              if (this.t < 16) {
                this.m_pos = this.op - (1 + 2048);
                this.m_pos -= this.t >> 2;
                this.m_pos -= this.buf[this.ip++] << 2;
                while (this.op + 3 > this.cbl) {
                  this.extendBuffer();
                }
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos];
                if (this.match_done() === 0) {
                  continue;
                } else {
                  this.match_next();
                }
              }
              const ret = this.match();
              if (ret !== this.OK) {
                return ret === this.EOF_FOUND ? this.OK : ret;
              }
            }
            return this.OK;
          },
          _compressCore(in_len, ti) {
            const ip_start = this.ip;
            const ip_end = this.ip + in_len - 20;
            let ii = this.ip;
            this.ip += ti < 4 ? 4 - ti : 0;
            let m_pos = 0;
            let m_off = 0;
            let m_len = 0;
            let dv_hi = 0;
            let dv_lo = 0;
            let dindex = 0;
            this.ip += 1 + (this.ip - ii >> 5);
            for (; ; ) {
              if (this.ip >= ip_end) {
                break;
              }
              dv_lo = this.buf[this.ip] | this.buf[this.ip + 1] << 8;
              dv_hi = this.buf[this.ip + 2] | this.buf[this.ip + 3] << 8;
              dindex = ((dv_lo * 17053 >>> 16) + dv_hi * 17053 + dv_lo * 6180 & 65535) >>> 2;
              m_pos = ip_start + this.dict[dindex];
              this.dict[dindex] = this.ip - ip_start;
              if ((dv_hi << 16) + dv_lo != (this.buf[m_pos] | this.buf[m_pos + 1] << 8 | this.buf[m_pos + 2] << 16 | this.buf[m_pos + 3] << 24)) {
                this.ip += 1 + (this.ip - ii >> 5);
                continue;
              }
              ii -= ti;
              ti = 0;
              let t = this.ip - ii;
              if (t !== 0) {
                if (t <= 3) {
                  this.out[this.op - 2] |= t;
                  do {
                    this.out[this.op++] = this.buf[ii++];
                  } while (--t > 0);
                } else {
                  if (t <= 18) {
                    this.out[this.op++] = t - 3;
                  } else {
                    let tt = t - 18;
                    this.out[this.op++] = 0;
                    while (tt > 255) {
                      tt -= 255;
                      this.out[this.op++] = 0;
                    }
                    this.out[this.op++] = tt;
                  }
                  do {
                    this.out[this.op++] = this.buf[ii++];
                  } while (--t > 0);
                }
              }
              m_len = 4;
              if (this.buf[this.ip + m_len] === this.buf[m_pos + m_len]) {
                do {
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  m_len += 1;
                  if (this.buf[this.ip + m_len] !== this.buf[m_pos + m_len]) {
                    break;
                  }
                  if (this.ip + m_len >= ip_end) {
                    break;
                  }
                } while (this.buf[this.ip + m_len] === this.buf[m_pos + m_len]);
              }
              m_off = this.ip - m_pos;
              this.ip += m_len;
              ii = this.ip;
              if (m_len <= 8 && m_off <= 2048) {
                m_off -= 1;
                this.out[this.op++] = m_len - 1 << 5 | (m_off & 7) << 2;
                this.out[this.op++] = m_off >> 3;
              } else if (m_off <= 16384) {
                m_off -= 1;
                if (m_len <= 33) {
                  this.out[this.op++] = 32 | m_len - 2;
                } else {
                  m_len -= 33;
                  this.out[this.op++] = 32;
                  while (m_len > 255) {
                    m_len -= 255;
                    this.out[this.op++] = 0;
                  }
                  this.out[this.op++] = m_len;
                }
                this.out[this.op++] = m_off << 2;
                this.out[this.op++] = m_off >> 6;
              } else {
                m_off -= 16384;
                if (m_len <= 9) {
                  this.out[this.op++] = 16 | m_off >> 11 & 8 | m_len - 2;
                } else {
                  m_len -= 9;
                  this.out[this.op++] = 16 | m_off >> 11 & 8;
                  while (m_len > 255) {
                    m_len -= 255;
                    this.out[this.op++] = 0;
                  }
                  this.out[this.op++] = m_len;
                }
                this.out[this.op++] = m_off << 2;
                this.out[this.op++] = m_off >> 6;
              }
            }
            return in_len - (ii - ip_start - ti);
          },
          compress(state) {
            this.state = state;
            this.ip = 0;
            this.buf = this.state.inputBuffer;
            const in_len = this.buf.length;
            const max_len = in_len + Math.ceil(in_len / 16) + 64 + 3;
            this.state.outputBuffer = new Uint8Array(max_len);
            this.out = this.state.outputBuffer;
            this.op = 0;
            this.dict = new Uint32Array(16384);
            let l = in_len;
            let t = 0;
            while (l > 20) {
              const ll = l <= 49152 ? l : 49152;
              if (t + ll >> 5 <= 0) {
                break;
              }
              this.dict = new Uint32Array(16384);
              const prev_ip = this.ip;
              t = this._compressCore(ll, t);
              this.ip = prev_ip + ll;
              l -= ll;
            }
            t += l;
            if (t > 0) {
              let ii = in_len - t;
              if (this.op === 0 && t <= 238) {
                this.out[this.op++] = 17 + t;
              } else if (t <= 3) {
                this.out[this.op - 2] |= t;
              } else if (t <= 18) {
                this.out[this.op++] = t - 3;
              } else {
                let tt = t - 18;
                this.out[this.op++] = 0;
                while (tt > 255) {
                  tt -= 255;
                  this.out[this.op++] = 0;
                }
                this.out[this.op++] = tt;
              }
              do {
                this.out[this.op++] = this.buf[ii++];
              } while (--t > 0);
            }
            this.out[this.op++] = 17;
            this.out[this.op++] = 0;
            this.out[this.op++] = 0;
            this.state.outputBuffer = this.out.subarray(0, this.op);
            return this.OK;
          }
        };
        const instance = new _lzo1x();
        return {
          compress(state) {
            const result = instance.compress(state);
            if (result == 0) {
              return instance.state.outputBuffer;
            }
            return result;
          },
          decompress(state) {
            const result = instance.decompress(state);
            if (result == 0) {
              return instance.state.outputBuffer;
            }
            return result;
          }
        };
      };
      exports.default = lzo1x();
    }
  });

  // shims/lzo1x-wrapper.js
  var require_lzo1x_wrapper = __commonJS({
    "shims/lzo1x-wrapper.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.decompress = decompress;
      exports.compress = compress;
      var lzo1x_js_1 = __importDefault(require_lzo1x());
      function decompress(buf, initSize, blockSize) {
        const result = lzo1x_js_1.default.decompress({
          inputBuffer: buf,
          initSize: 16e3,
          blockSize: 8192
        });
        return result;
      }
      function compress(state) {
        return lzo1x_js_1.default.compress(state);
      }
      exports.default = { decompress, compress };
    }
  });

  // shims/ripemd128.js
  var require_ripemd128 = __commonJS({
    "shims/ripemd128.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ripemd128 = ripemd128;
      function asUint32Array(arr) {
        return new Uint32Array(arr);
      }
      function concat(a, b) {
        if (!a && !b)
          throw new Error("invalid Buffer a and b");
        if (!b || b.length === 0)
          return a;
        if (!a || a.length === 0)
          return b;
        const c = new a.constructor(a.length + b.length);
        c.set(a);
        c.set(b, a.length);
        return c;
      }
      function rotl(x, n) {
        return x >>> 32 - n | x << n;
      }
      var S = [
        [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
        // round 1
        [7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12],
        // round 2
        [11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5],
        // round 3
        [11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12],
        // round 4
        [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6],
        // parallel round 1
        [9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11],
        // parallel round 2
        [9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5],
        // parallel round 3
        [15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8]
        // parallel round 4
      ].map(asUint32Array);
      var X = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        // round 1
        [7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8],
        // round 2
        [3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12],
        // round 3
        [1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2],
        // round 4
        [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12],
        // parallel round 1
        [6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2],
        // parallel round 2
        [15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13],
        // parallel round 3
        [8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14]
        // parallel round 4
      ].map(asUint32Array);
      var K = asUint32Array([
        0,
        // FF
        1518500249,
        // GG
        1859775393,
        // HH
        2400959708,
        // II
        1352829926,
        // III
        1548603684,
        // HHH
        1836072691,
        // GGG
        0
        // FFF
      ]);
      var F = [
        function F1(x, y, z) {
          return x ^ y ^ z;
        },
        function F2(x, y, z) {
          return x & y | ~x & z;
        },
        function F3(x, y, z) {
          return (x | ~y) ^ z;
        },
        function F4(x, y, z) {
          return x & z | y & ~z;
        }
      ];
      function ripemd128(dataBuffer) {
        let aa;
        let bb;
        let cc;
        let dd;
        let aaa;
        let bbb;
        let ccc;
        let ddd;
        let i;
        let l;
        let r;
        let rr;
        let t;
        let tmp;
        let x = new Uint32Array();
        const hash = new Uint32Array([
          1732584193,
          4023233417,
          2562383102,
          271733878
        ]);
        let bytes = dataBuffer.byteLength;
        const dataUint8Array = new Uint8Array(dataBuffer);
        const padding = new Uint8Array((bytes % 64 < 56 ? 56 : 120) - bytes % 64);
        padding[0] = 128;
        const data = new Uint32Array(concat(dataUint8Array, padding).buffer);
        bytes <<= 3;
        const checkBits = new Uint8Array(8);
        new DataView(checkBits.buffer).setUint32(0, bytes, true);
        new DataView(checkBits.buffer).setUint32(4, bytes >>> 31, true);
        x = new Uint32Array(concat(new Uint8Array(data.buffer), checkBits).buffer);
        for (i = 0, t = 0, l = x.length; i < l; i += 16, t = 0) {
          aa = aaa = hash[0];
          bb = bbb = hash[1];
          cc = ccc = hash[2];
          dd = ddd = hash[3];
          for (; t < 64; ++t) {
            r = ~~(t / 16);
            aa = rotl(aa + F[r](bb, cc, dd) + x[i + X[r][t % 16]] + K[r], S[r][t % 16]);
            tmp = dd;
            dd = cc;
            cc = bb;
            bb = aa;
            aa = tmp;
          }
          for (; t < 128; ++t) {
            r = ~~(t / 16);
            rr = ~~((63 - t % 64) / 16);
            aaa = rotl(aaa + F[rr](bbb, ccc, ddd) + x[i + X[r][t % 16]] + K[r], S[r][t % 16]);
            tmp = ddd;
            ddd = ccc;
            ccc = bbb;
            bbb = aaa;
            aaa = tmp;
          }
          ddd = hash[1] + cc + ddd;
          hash[1] = hash[2] + dd + aaa;
          hash[2] = hash[3] + aa + bbb;
          hash[3] = hash[0] + bb + ccc;
          hash[0] = ddd;
        }
        return new Uint8Array(hash.buffer);
      }
    }
  });

  // shims/utils.js
  var require_utils = __commonJS({
    "shims/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var ripemd128_js_1 = require_ripemd128();
      var REGEXP_STRIPKEY = {
        mdx: /[().,\-&、 '/\\@_$\\!]()/g,
        // mdd:/[!”#$%&'()\\*\\+,-.\\/:;<=>\\?@\\[\\]\^_`{|}~]()/g,
        mdd: /([.][^.]*$)|[()., '/@]/g
      };
      var UTF_16LE_DECODER = new TextDecoder("utf-16le");
      var UTF16 = "UTF-16";
      function newUint8Array(buf, offset, len) {
        return new Uint8Array(buf.buffer, buf.byteOffset + offset, len);
      }
      function readUTF16(buf, offset, length) {
        return UTF_16LE_DECODER.decode(newUint8Array(buf, offset, length));
      }
      function getExtension(filename, defaultExt) {
        var _a;
        return ((_a = /(?:\.([^.]+))?$/.exec(filename)) === null || _a === void 0 ? void 0 : _a[1]) || defaultExt;
      }
      function triple_min(a, b, c) {
        const temp = a < b ? a : b;
        return temp < c ? temp : c;
      }
      function levenshteinDistance(a, b) {
        if (!a || a == void 0) {
          return 9999;
        }
        if (!b || b == void 0) {
          return 9999;
        }
        const m = a.length;
        const n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) {
          dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
          dp[0][j] = j;
        }
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            if (a[i - 1] !== b[j - 1]) {
              dp[i][j] = triple_min(1 + dp[i - 1][j], 1 + dp[i][j - 1], 1 + dp[i - 1][j - 1]);
            } else {
              dp[i][j] = dp[i - 1][j - 1];
            }
          }
        }
        return dp[m][n];
      }
      function parseHeader(header_text) {
        const headerAttr = {};
        Array.from(header_text.matchAll(/(\w+)="((.|\r|\n)*?)"/g)).forEach((tag) => {
          headerAttr[tag[1]] = unescapeEntities(tag[2]);
        });
        if (headerAttr["StyleSheet"] && typeof headerAttr["StyleSheet"] == "string") {
          const styleSheet = {};
          const lines = headerAttr["StyleSheet"].split(/[\r\n]+/g);
          for (let i = 0; i < lines.length; i += 3) {
            styleSheet[lines[i]] = [lines[i + 1], lines[i + 2]];
          }
          headerAttr["StyleSheet"] = styleSheet;
        }
        return headerAttr;
      }
      function uint8BEtoNumber(bytes) {
        return bytes[0] & 255;
      }
      function uint16BEtoNumber(bytes) {
        let n = 0;
        for (let i = 0; i < 1; i++) {
          n |= bytes[i];
          n <<= 8;
        }
        n |= bytes[1];
        return n;
      }
      function uint32BEtoNumber(bytes) {
        let n = 0;
        for (let i = 0; i < 3; i++) {
          n |= bytes[i];
          n <<= 8;
        }
        n |= bytes[3];
        return n;
      }
      function uint64BEtoNumber(bytes) {
        if (bytes[1] >= 32 || bytes[0] > 0) {
          throw new Error("Error: uint64 larger than 2^53, JS may lost accuracy");
        }
        let high = 0;
        for (let i = 0; i < 3; i++) {
          high |= bytes[i] & 255;
          high <<= 8;
        }
        high |= bytes[3] & 255;
        high = (high & 2097151) * 4294967296;
        high += bytes[4] * 16777216;
        high += bytes[5] * 65536;
        high += bytes[6] * 256;
        high += bytes[7] & 255;
        return high;
      }
      var NUMFMT_UINT8 = /* @__PURE__ */ Symbol("NUM_FMT_UINT8");
      var NUMFMT_UINT16 = /* @__PURE__ */ Symbol("NUM_FMT_UINT16");
      var NUMFMT_UINT32 = /* @__PURE__ */ Symbol("NUM_FMT_UINT32");
      var NUMFMT_UINT64 = /* @__PURE__ */ Symbol("NUM_FMT_UINT64");
      function readNumber(bf, numfmt) {
        const value = new Uint8Array(bf);
        if (numfmt === NUMFMT_UINT32) {
          return uint32BEtoNumber(value);
        } else if (numfmt === NUMFMT_UINT64) {
          return uint64BEtoNumber(value);
        } else if (numfmt === NUMFMT_UINT16) {
          return uint16BEtoNumber(value);
        } else if (numfmt === NUMFMT_UINT8) {
          return uint8BEtoNumber(value);
        }
        return 0;
      }
      function b2n(data) {
        switch (data.length) {
          case 1:
            return uint8BEtoNumber(data);
          case 2:
            return uint16BEtoNumber(data);
          case 4:
            return uint32BEtoNumber(data);
          case 8:
            return uint64BEtoNumber(data);
        }
        return 0;
      }
      function fast_decrypt(b, key) {
        let previous = 54;
        for (let i = 0; i < b.length; ++i) {
          let t = (b[i] >> 4 | b[i] << 4) & 255;
          t = t ^ previous ^ i & 255 ^ key[i % key.length];
          previous = b[i];
          b[i] = t;
        }
        return b;
      }
      function salsa_decrypt(data, k) {
        return data;
      }
      function mdxDecrypt(comp_block) {
        const keyinBuffer = new Uint8Array(8);
        keyinBuffer.set(comp_block.slice(4, 8), 0);
        keyinBuffer[4] ^= 149;
        keyinBuffer[5] ^= 54;
        keyinBuffer[6] ^= 0;
        keyinBuffer[7] ^= 0;
        const key = (0, ripemd128_js_1.ripemd128)(keyinBuffer.buffer.slice(keyinBuffer.byteOffset, keyinBuffer.byteOffset + keyinBuffer.length));
        const resultBuff = Buffer.concat([
          Buffer.from(comp_block.subarray(0, 8)),
          Buffer.from(fast_decrypt(Uint8Array.from(comp_block.slice(8)), key))
        ]);
        return resultBuff;
      }
      function appendBuffer(buffer1, buffer2) {
        const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return Buffer.from(tmp.buffer);
      }
      function isTrue(v) {
        if (!v)
          return false;
        v = v.toLowerCase();
        return v === "yes" || v === "true";
      }
      function wordCompare(word1, word2) {
        if (!word1 || !word2) {
          throw new Error(`invalid word comparation ${word1} and ${word2}`);
        }
        if (word1 === word2) {
          return 0;
        }
        const len = word1.length > word2.length ? word2.length : word1.length;
        for (let i = 0; i < len; i++) {
          const w1 = word1[i];
          const w2 = word2[i];
          if (w1 == w2) {
            continue;
          } else if (w1.toLowerCase() == w2.toLowerCase()) {
            continue;
          } else if (w1.toLowerCase() < w2.toLowerCase()) {
            return -1;
          } else if (w1.toLowerCase() > w2.toLowerCase()) {
            return 1;
          }
        }
        return word1.length < word2.length ? -1 : 1;
      }
      function unescapeEntities(text) {
        text = text.replace(/&lt;/g, "<");
        text = text.replace(/&gt;/g, ">");
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&amp;/g, "&");
        return text;
      }
      function substituteStylesheet(styleSheet, txt) {
        const txtTag = Array.from(txt.matchAll(/`(\d+)`/g));
        const txtList = Array.from(txt.split(/`\d+`/g)).slice(1);
        let styledTxt = "";
        for (let i = 0; i < txtList.length; i++) {
          const style = styleSheet[txtTag[i][1]];
          styledTxt += style[0] + txtList[i] + style[1];
        }
        return styledTxt;
      }
      exports.default = {
        getExtension,
        readUTF16,
        newUint8Array,
        levenshteinDistance,
        parseHeader,
        readNumber,
        b2n,
        mdxDecrypt,
        ripemd128: ripemd128_js_1.ripemd128,
        fast_decrypt,
        salsa_decrypt,
        appendBuffer,
        isTrue,
        wordCompare,
        substituteStylesheet,
        UTF16,
        REGEXP_STRIPKEY,
        NUMFMT_UINT8,
        NUMFMT_UINT16,
        NUMFMT_UINT32,
        NUMFMT_UINT64
      };
    }
  });

  // shims/scanner.js
  var require_scanner = __commonJS({
    "shims/scanner.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FileScanner = void 0;
      var FileScanner = class {
        constructor(filepath) {
          this.filepath = filepath;
          this.offset = 0;
          this.fd = 1;
        }
        close() {
        }
        readBuffer(offset, length) {
          if (!globalThis.__mdict_buffer) return new Uint8Array(0);
          return new Uint8Array(globalThis.__mdict_buffer, offset, length);
        }
        readNumber(offset, length) {
          if (!globalThis.__mdict_buffer) return new DataView(new ArrayBuffer(length));
          const buffer = new ArrayBuffer(length);
          const dataView = new DataView(buffer);
          const src = new Uint8Array(globalThis.__mdict_buffer, offset, length);
          const tgt = new Uint8Array(buffer);
          tgt.set(src);
          return dataView;
        }
      };
      exports.FileScanner = FileScanner;
    }
  });

  // node_modules/pako/dist/pako.cjs.js
  var require_pako_cjs = __commonJS({
    "node_modules/pako/dist/pako.cjs.js"(exports) {
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      var Z_FIXED = 4;
      var Z_BINARY = 0;
      var Z_TEXT = 1;
      var Z_UNKNOWN = 2;
      function zero$1(buf) {
        let len = buf.length;
        while (--len >= 0) buf[len] = 0;
      }
      var STORED_BLOCK = 0;
      var STATIC_TREES = 1;
      var DYN_TREES = 2;
      var LENGTH_CODES = 29;
      var LITERALS = 256;
      var L_CODES = 286;
      var D_CODES = 30;
      var BL_CODES = 19;
      var HEAP_SIZE$1 = 573;
      var MAX_BITS = 15;
      var Buf_size = 16;
      var MAX_BL_BITS = 7;
      var END_BLOCK = 256;
      var REP_3_6 = 16;
      var REPZ_3_10 = 17;
      var REPZ_11_138 = 18;
      var extra_lbits = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        0
      ]);
      var extra_dbits = new Uint8Array([
        0,
        0,
        0,
        0,
        1,
        1,
        2,
        2,
        3,
        3,
        4,
        4,
        5,
        5,
        6,
        6,
        7,
        7,
        8,
        8,
        9,
        9,
        10,
        10,
        11,
        11,
        12,
        12,
        13,
        13
      ]);
      var extra_blbits = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        2,
        3,
        7
      ]);
      var bl_order = new Uint8Array([
        16,
        17,
        18,
        0,
        8,
        7,
        9,
        6,
        10,
        5,
        11,
        4,
        12,
        3,
        13,
        2,
        14,
        1,
        15
      ]);
      var DIST_CODE_LEN = 512;
      var static_ltree = new Array(288 * 2);
      zero$1(static_ltree);
      var static_dtree = new Array(D_CODES * 2);
      zero$1(static_dtree);
      var _dist_code = new Array(DIST_CODE_LEN);
      zero$1(_dist_code);
      var _length_code = new Array(256);
      zero$1(_length_code);
      var base_length = new Array(LENGTH_CODES);
      zero$1(base_length);
      var base_dist = new Array(D_CODES);
      zero$1(base_dist);
      var StaticTreeDesc = class {
        constructor(static_tree, extra_bits, extra_base, elems, max_length) {
          this.static_tree = static_tree;
          this.extra_bits = extra_bits;
          this.extra_base = extra_base;
          this.elems = elems;
          this.max_length = max_length;
          this.has_stree = static_tree && static_tree.length;
        }
      };
      var static_l_desc;
      var static_d_desc;
      var static_bl_desc;
      var TreeDesc = class {
        constructor(dyn_tree, stat_desc) {
          this.dyn_tree = dyn_tree;
          this.max_code = 0;
          this.stat_desc = stat_desc;
        }
      };
      var d_code = (dist) => {
        return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
      };
      var put_short = (s, w) => {
        s.pending_buf[s.pending++] = w & 255;
        s.pending_buf[s.pending++] = w >>> 8 & 255;
      };
      var send_bits = (s, value, length) => {
        if (s.bi_valid > Buf_size - length) {
          s.bi_buf |= value << s.bi_valid & 65535;
          put_short(s, s.bi_buf);
          s.bi_buf = value >> Buf_size - s.bi_valid;
          s.bi_valid += length - Buf_size;
        } else {
          s.bi_buf |= value << s.bi_valid & 65535;
          s.bi_valid += length;
        }
      };
      var send_code = (s, c, tree) => {
        send_bits(s, tree[c * 2], tree[c * 2 + 1]);
      };
      var bi_reverse = (code, len) => {
        let res = 0;
        do {
          res |= code & 1;
          code >>>= 1;
          res <<= 1;
        } while (--len > 0);
        return res >>> 1;
      };
      var bi_flush = (s) => {
        if (s.bi_valid === 16) {
          put_short(s, s.bi_buf);
          s.bi_buf = 0;
          s.bi_valid = 0;
        } else if (s.bi_valid >= 8) {
          s.pending_buf[s.pending++] = s.bi_buf & 255;
          s.bi_buf >>= 8;
          s.bi_valid -= 8;
        }
      };
      var gen_bitlen = (s, desc) => {
        const tree = desc.dyn_tree;
        const max_code = desc.max_code;
        const stree = desc.stat_desc.static_tree;
        const has_stree = desc.stat_desc.has_stree;
        const extra = desc.stat_desc.extra_bits;
        const base = desc.stat_desc.extra_base;
        const max_length = desc.stat_desc.max_length;
        let h;
        let n, m;
        let bits;
        let xbits;
        let f;
        let overflow = 0;
        for (bits = 0; bits <= MAX_BITS; bits++) s.bl_count[bits] = 0;
        tree[s.heap[s.heap_max] * 2 + 1] = 0;
        for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
          n = s.heap[h];
          bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
          if (bits > max_length) {
            bits = max_length;
            overflow++;
          }
          tree[n * 2 + 1] = bits;
          if (n > max_code) continue;
          s.bl_count[bits]++;
          xbits = 0;
          if (n >= base) xbits = extra[n - base];
          f = tree[n * 2];
          s.opt_len += f * (bits + xbits);
          if (has_stree) s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
        if (overflow === 0) return;
        do {
          bits = max_length - 1;
          while (s.bl_count[bits] === 0) bits--;
          s.bl_count[bits]--;
          s.bl_count[bits + 1] += 2;
          s.bl_count[max_length]--;
          overflow -= 2;
        } while (overflow > 0);
        for (bits = max_length; bits !== 0; bits--) {
          n = s.bl_count[bits];
          while (n !== 0) {
            m = s.heap[--h];
            if (m > max_code) continue;
            if (tree[m * 2 + 1] !== bits) {
              s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
              tree[m * 2 + 1] = bits;
            }
            n--;
          }
        }
      };
      var gen_codes = (tree, max_code, bl_count) => {
        const next_code = new Array(16);
        let code = 0;
        let bits;
        let n;
        for (bits = 1; bits <= MAX_BITS; bits++) {
          code = code + bl_count[bits - 1] << 1;
          next_code[bits] = code;
        }
        for (n = 0; n <= max_code; n++) {
          let len = tree[n * 2 + 1];
          if (len === 0) continue;
          tree[n * 2] = bi_reverse(next_code[len]++, len);
        }
      };
      var tr_static_init = () => {
        let n;
        let bits;
        let length;
        let code;
        let dist;
        const bl_count = new Array(16);
        length = 0;
        for (code = 0; code < LENGTH_CODES - 1; code++) {
          base_length[code] = length;
          for (n = 0; n < 1 << extra_lbits[code]; n++) _length_code[length++] = code;
        }
        _length_code[length - 1] = code;
        dist = 0;
        for (code = 0; code < 16; code++) {
          base_dist[code] = dist;
          for (n = 0; n < 1 << extra_dbits[code]; n++) _dist_code[dist++] = code;
        }
        dist >>= 7;
        for (; code < D_CODES; code++) {
          base_dist[code] = dist << 7;
          for (n = 0; n < 1 << extra_dbits[code] - 7; n++) _dist_code[256 + dist++] = code;
        }
        for (bits = 0; bits <= MAX_BITS; bits++) bl_count[bits] = 0;
        n = 0;
        while (n <= 143) {
          static_ltree[n * 2 + 1] = 8;
          n++;
          bl_count[8]++;
        }
        while (n <= 255) {
          static_ltree[n * 2 + 1] = 9;
          n++;
          bl_count[9]++;
        }
        while (n <= 279) {
          static_ltree[n * 2 + 1] = 7;
          n++;
          bl_count[7]++;
        }
        while (n <= 287) {
          static_ltree[n * 2 + 1] = 8;
          n++;
          bl_count[8]++;
        }
        gen_codes(static_ltree, 287, bl_count);
        for (n = 0; n < D_CODES; n++) {
          static_dtree[n * 2 + 1] = 5;
          static_dtree[n * 2] = bi_reverse(n, 5);
        }
        static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, 257, L_CODES, MAX_BITS);
        static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
        static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
      };
      var init_block = (s) => {
        let n;
        for (n = 0; n < L_CODES; n++) s.dyn_ltree[n * 2] = 0;
        for (n = 0; n < D_CODES; n++) s.dyn_dtree[n * 2] = 0;
        for (n = 0; n < BL_CODES; n++) s.bl_tree[n * 2] = 0;
        s.dyn_ltree[END_BLOCK * 2] = 1;
        s.opt_len = s.static_len = 0;
        s.sym_next = s.matches = 0;
      };
      var bi_windup = (s) => {
        if (s.bi_valid > 8) put_short(s, s.bi_buf);
        else if (s.bi_valid > 0) s.pending_buf[s.pending++] = s.bi_buf;
        s.bi_buf = 0;
        s.bi_valid = 0;
      };
      var smaller = (tree, n, m, depth) => {
        const _n2 = n * 2;
        const _m2 = m * 2;
        return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
      };
      var pqdownheap = (s, tree, k) => {
        const v = s.heap[k];
        let j = k << 1;
        while (j <= s.heap_len) {
          if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) j++;
          if (smaller(tree, v, s.heap[j], s.depth)) break;
          s.heap[k] = s.heap[j];
          k = j;
          j <<= 1;
        }
        s.heap[k] = v;
      };
      var compress_block = (s, ltree, dtree) => {
        let dist;
        let lc;
        let sx = 0;
        let code;
        let extra;
        if (s.sym_next !== 0) do {
          dist = s.pending_buf[s.sym_buf + sx++] & 255;
          dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
          lc = s.pending_buf[s.sym_buf + sx++];
          if (dist === 0) send_code(s, lc, ltree);
          else {
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (sx < s.sym_next);
        send_code(s, END_BLOCK, ltree);
      };
      var build_tree = (s, desc) => {
        const tree = desc.dyn_tree;
        const stree = desc.stat_desc.static_tree;
        const has_stree = desc.stat_desc.has_stree;
        const elems = desc.stat_desc.elems;
        let n, m;
        let max_code = -1;
        let node;
        s.heap_len = 0;
        s.heap_max = HEAP_SIZE$1;
        for (n = 0; n < elems; n++) if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else tree[n * 2 + 1] = 0;
        while (s.heap_len < 2) {
          node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
          tree[node * 2] = 1;
          s.depth[node] = 0;
          s.opt_len--;
          if (has_stree) s.static_len -= stree[node * 2 + 1];
        }
        desc.max_code = max_code;
        for (n = s.heap_len >> 1; n >= 1; n--) pqdownheap(s, tree, n);
        node = elems;
        do {
          n = s.heap[1];
          s.heap[1] = s.heap[s.heap_len--];
          pqdownheap(s, tree, 1);
          m = s.heap[1];
          s.heap[--s.heap_max] = n;
          s.heap[--s.heap_max] = m;
          tree[node * 2] = tree[n * 2] + tree[m * 2];
          s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
          tree[n * 2 + 1] = tree[m * 2 + 1] = node;
          s.heap[1] = node++;
          pqdownheap(s, tree, 1);
        } while (s.heap_len >= 2);
        s.heap[--s.heap_max] = s.heap[1];
        gen_bitlen(s, desc);
        gen_codes(tree, max_code, s.bl_count);
      };
      var scan_tree = (s, tree, max_code) => {
        let n;
        let prevlen = -1;
        let curlen;
        let nextlen = tree[1];
        let count = 0;
        let max_count = 7;
        let min_count = 4;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        }
        tree[(max_code + 1) * 2 + 1] = 65535;
        for (n = 0; n <= max_code; n++) {
          curlen = nextlen;
          nextlen = tree[(n + 1) * 2 + 1];
          if (++count < max_count && curlen === nextlen) continue;
          else if (count < min_count) s.bl_tree[curlen * 2] += count;
          else if (curlen !== 0) {
            if (curlen !== prevlen) s.bl_tree[curlen * 2]++;
            s.bl_tree[REP_3_6 * 2]++;
          } else if (count <= 10) s.bl_tree[REPZ_3_10 * 2]++;
          else s.bl_tree[REPZ_11_138 * 2]++;
          count = 0;
          prevlen = curlen;
          if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
          } else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
          } else {
            max_count = 7;
            min_count = 4;
          }
        }
      };
      var send_tree = (s, tree, max_code) => {
        let n;
        let prevlen = -1;
        let curlen;
        let nextlen = tree[1];
        let count = 0;
        let max_count = 7;
        let min_count = 4;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        }
        for (n = 0; n <= max_code; n++) {
          curlen = nextlen;
          nextlen = tree[(n + 1) * 2 + 1];
          if (++count < max_count && curlen === nextlen) continue;
          else if (count < min_count) do
            send_code(s, curlen, s.bl_tree);
          while (--count !== 0);
          else if (curlen !== 0) {
            if (curlen !== prevlen) {
              send_code(s, curlen, s.bl_tree);
              count--;
            }
            send_code(s, REP_3_6, s.bl_tree);
            send_bits(s, count - 3, 2);
          } else if (count <= 10) {
            send_code(s, REPZ_3_10, s.bl_tree);
            send_bits(s, count - 3, 3);
          } else {
            send_code(s, REPZ_11_138, s.bl_tree);
            send_bits(s, count - 11, 7);
          }
          count = 0;
          prevlen = curlen;
          if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
          } else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
          } else {
            max_count = 7;
            min_count = 4;
          }
        }
      };
      var build_bl_tree = (s) => {
        let max_blindex;
        scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
        scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
        build_tree(s, s.bl_desc);
        for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) break;
        s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
        return max_blindex;
      };
      var send_all_trees = (s, lcodes, dcodes, blcodes) => {
        let rank2;
        send_bits(s, lcodes - 257, 5);
        send_bits(s, dcodes - 1, 5);
        send_bits(s, blcodes - 4, 4);
        for (rank2 = 0; rank2 < blcodes; rank2++) send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
        send_tree(s, s.dyn_ltree, lcodes - 1);
        send_tree(s, s.dyn_dtree, dcodes - 1);
      };
      var detect_data_type = (s) => {
        let block_mask = 4093624447;
        let n;
        for (n = 0; n <= 31; n++, block_mask >>>= 1) if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) return Z_BINARY;
        if (s.dyn_ltree[18] !== 0 || s.dyn_ltree[20] !== 0 || s.dyn_ltree[26] !== 0) return Z_TEXT;
        for (n = 32; n < LITERALS; n++) if (s.dyn_ltree[n * 2] !== 0) return Z_TEXT;
        return Z_BINARY;
      };
      var static_init_done = false;
      var _tr_init = (s) => {
        if (!static_init_done) {
          tr_static_init();
          static_init_done = true;
        }
        s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
        s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
        s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
        s.bi_buf = 0;
        s.bi_valid = 0;
        init_block(s);
      };
      var _tr_stored_block = (s, buf, stored_len, last) => {
        send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
        bi_windup(s);
        put_short(s, stored_len);
        put_short(s, ~stored_len);
        if (stored_len) s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
        s.pending += stored_len;
      };
      var _tr_align = (s) => {
        send_bits(s, STATIC_TREES << 1, 3);
        send_code(s, END_BLOCK, static_ltree);
        bi_flush(s);
      };
      var _tr_flush_block = (s, buf, stored_len, last) => {
        let opt_lenb, static_lenb;
        let max_blindex = 0;
        if (s.level > 0) {
          if (s.strm.data_type === Z_UNKNOWN) s.strm.data_type = detect_data_type(s);
          build_tree(s, s.l_desc);
          build_tree(s, s.d_desc);
          max_blindex = build_bl_tree(s);
          opt_lenb = s.opt_len + 3 + 7 >>> 3;
          static_lenb = s.static_len + 3 + 7 >>> 3;
          if (static_lenb <= opt_lenb) opt_lenb = static_lenb;
        } else opt_lenb = static_lenb = stored_len + 5;
        if (stored_len + 4 <= opt_lenb && buf !== -1) _tr_stored_block(s, buf, stored_len, last);
        else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
          send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
          compress_block(s, static_ltree, static_dtree);
        } else {
          send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
          send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
          compress_block(s, s.dyn_ltree, s.dyn_dtree);
        }
        init_block(s);
        if (last) bi_windup(s);
      };
      var _tr_tally = (s, dist, lc) => {
        s.pending_buf[s.sym_buf + s.sym_next++] = dist;
        s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
        s.pending_buf[s.sym_buf + s.sym_next++] = lc;
        if (dist === 0) s.dyn_ltree[lc * 2]++;
        else {
          s.matches++;
          dist--;
          s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
          s.dyn_dtree[d_code(dist) * 2]++;
        }
        return s.sym_next === s.sym_end;
      };
      var adler32 = (adler, buf, len, pos) => {
        let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
        while (len !== 0) {
          n = len > 2e3 ? 2e3 : len;
          len -= n;
          do {
            s1 = s1 + buf[pos++] | 0;
            s2 = s2 + s1 | 0;
          } while (--n);
          s1 %= 65521;
          s2 %= 65521;
        }
        return s1 | s2 << 16 | 0;
      };
      var makeTable = () => {
        let c, table = [];
        for (var n = 0; n < 256; n++) {
          c = n;
          for (var k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
          table[n] = c;
        }
        return table;
      };
      var crcTable = new Uint32Array(makeTable());
      var crc32 = (crc, buf, len, pos) => {
        const t = crcTable;
        const end = pos + len;
        crc ^= -1;
        for (let i = pos; i < end; i++) crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
        return crc ^ -1;
      };
      var messages_default = {
        2: "need dictionary",
        1: "stream end",
        0: "",
        "-1": "file error",
        "-2": "stream error",
        "-3": "data error",
        "-4": "insufficient memory",
        "-5": "buffer error",
        "-6": "incompatible version"
      };
      var Z_NO_FLUSH = 0;
      var Z_PARTIAL_FLUSH = 1;
      var Z_SYNC_FLUSH = 2;
      var Z_FULL_FLUSH = 3;
      var Z_FINISH = 4;
      var Z_BLOCK = 5;
      var Z_TREES = 6;
      var Z_OK = 0;
      var Z_STREAM_END = 1;
      var Z_NEED_DICT = 2;
      var Z_ERRNO = -1;
      var Z_STREAM_ERROR = -2;
      var Z_DATA_ERROR = -3;
      var Z_MEM_ERROR = -4;
      var Z_BUF_ERROR = -5;
      var MAX_MEM_LEVEL = 9;
      var MAX_WBITS = 15;
      var DEF_MEM_LEVEL = 8;
      var HEAP_SIZE = 573;
      var MIN_MATCH = 3;
      var MAX_MATCH = 258;
      var MIN_LOOKAHEAD = 262;
      var PRESET_DICT = 32;
      var INIT_STATE = 42;
      var GZIP_STATE = 57;
      var EXTRA_STATE = 69;
      var NAME_STATE = 73;
      var COMMENT_STATE = 91;
      var HCRC_STATE = 103;
      var BUSY_STATE = 113;
      var FINISH_STATE = 666;
      var BS_NEED_MORE = 1;
      var BS_BLOCK_DONE = 2;
      var BS_FINISH_STARTED = 3;
      var BS_FINISH_DONE = 4;
      var OS_CODE = 3;
      var err = (strm, errorCode) => {
        strm.msg = messages_default[errorCode];
        return errorCode;
      };
      var rank = (f) => {
        return f * 2 - (f > 4 ? 9 : 0);
      };
      var zero = (buf) => {
        let len = buf.length;
        while (--len >= 0) buf[len] = 0;
      };
      var slide_hash = (s) => {
        let n, m;
        let p;
        let wsize = s.w_size;
        n = s.hash_size;
        p = n;
        do {
          m = s.head[--p];
          s.head[p] = m >= wsize ? m - wsize : 0;
        } while (--n);
        n = wsize;
        p = n;
        do {
          m = s.prev[--p];
          s.prev[p] = m >= wsize ? m - wsize : 0;
        } while (--n);
      };
      var HASH = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
      var INSERT_STRING = (s, str) => {
        let h;
        if (s.legacy_hash) h = s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        else {
          const w = s.window;
          const value = w[str] | w[str + 1] << 8 | w[str + 2] << 16 | w[str + 3] << 24;
          h = s.ins_h = Math.imul(value, 66521) + 66521 >>> 16 & s.hash_mask;
        }
        const hash_head = s.prev[str & s.w_mask] = s.head[h];
        s.head[h] = str;
        return hash_head;
      };
      var flush_pending = (strm) => {
        const s = strm.state;
        let len = s.pending;
        if (len > strm.avail_out) len = strm.avail_out;
        if (len === 0) return;
        strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
        strm.next_out += len;
        s.pending_out += len;
        strm.total_out += len;
        strm.avail_out -= len;
        s.pending -= len;
        if (s.pending === 0) s.pending_out = 0;
      };
      var flush_block_only = (s, last) => {
        _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
        s.block_start = s.strstart;
        flush_pending(s.strm);
      };
      var put_byte = (s, b) => {
        s.pending_buf[s.pending++] = b;
      };
      var putShortMSB = (s, b) => {
        s.pending_buf[s.pending++] = b >>> 8 & 255;
        s.pending_buf[s.pending++] = b & 255;
      };
      var read_buf = (strm, buf, start, size) => {
        let len = strm.avail_in;
        if (len > size) len = size;
        if (len === 0) return 0;
        strm.avail_in -= len;
        buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
        if (strm.state.wrap === 1) strm.adler = adler32(strm.adler, buf, len, start);
        else if (strm.state.wrap === 2) strm.adler = crc32(strm.adler, buf, len, start);
        strm.next_in += len;
        strm.total_in += len;
        return len;
      };
      var longest_match = (s, cur_match) => {
        let chain_length = s.max_chain_length;
        let scan = s.strstart;
        let match;
        let len;
        let best_len = s.prev_length;
        let nice_match = s.nice_match;
        const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
        const _win = s.window;
        const wmask = s.w_mask;
        const prev = s.prev;
        const strend = s.strstart + MAX_MATCH;
        let scan_end1 = _win[scan + best_len - 1];
        let scan_end = _win[scan + best_len];
        if (s.prev_length >= s.good_match) chain_length >>= 2;
        if (nice_match > s.lookahead) nice_match = s.lookahead;
        do {
          match = cur_match;
          if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) continue;
          scan += 2;
          match++;
          do
            ;
          while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
          len = MAX_MATCH - (strend - scan);
          scan = strend - MAX_MATCH;
          if (len > best_len) {
            s.match_start = cur_match;
            best_len = len;
            if (len >= nice_match) break;
            scan_end1 = _win[scan + best_len - 1];
            scan_end = _win[scan + best_len];
          }
        } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
        if (best_len <= s.lookahead) return best_len;
        return s.lookahead;
      };
      var fill_window = (s) => {
        const _w_size = s.w_size;
        let n, more, str;
        do {
          more = s.window_size - s.lookahead - s.strstart;
          if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
            s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
            s.match_start -= _w_size;
            s.strstart -= _w_size;
            s.block_start -= _w_size;
            if (s.insert > s.strstart) s.insert = s.strstart;
            slide_hash(s);
            more += _w_size;
          }
          if (s.strm.avail_in === 0) break;
          n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
          s.lookahead += n;
          if (!s.legacy_hash) {
            if (s.lookahead + s.insert > MIN_MATCH) {
              str = s.strstart - s.insert;
              while (s.insert) {
                INSERT_STRING(s, str);
                str++;
                s.insert--;
                if (s.lookahead + s.insert <= MIN_MATCH) break;
              }
            }
          } else if (s.lookahead + s.insert >= MIN_MATCH) {
            str = s.strstart - s.insert;
            s.ins_h = s.window[str];
            s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
            while (s.insert) {
              INSERT_STRING(s, str);
              str++;
              s.insert--;
              if (s.lookahead + s.insert < MIN_MATCH) break;
            }
          }
        } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
      };
      var deflate_stored = (s, flush) => {
        let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
        let len, left, have, last = 0;
        let used = s.strm.avail_in;
        do {
          len = 65535;
          have = s.bi_valid + 42 >> 3;
          if (s.strm.avail_out < have) break;
          have = s.strm.avail_out - have;
          left = s.strstart - s.block_start;
          if (len > left + s.strm.avail_in) len = left + s.strm.avail_in;
          if (len > have) len = have;
          if (len < min_block && (len === 0 && flush !== 4 || flush === 0 || len !== left + s.strm.avail_in)) break;
          last = flush === 4 && len === left + s.strm.avail_in ? 1 : 0;
          _tr_stored_block(s, 0, 0, last);
          s.pending_buf[s.pending - 4] = len;
          s.pending_buf[s.pending - 3] = len >> 8;
          s.pending_buf[s.pending - 2] = ~len;
          s.pending_buf[s.pending - 1] = ~len >> 8;
          flush_pending(s.strm);
          if (left) {
            if (left > len) left = len;
            s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
            s.strm.next_out += left;
            s.strm.avail_out -= left;
            s.strm.total_out += left;
            s.block_start += left;
            len -= left;
          }
          if (len) {
            read_buf(s.strm, s.strm.output, s.strm.next_out, len);
            s.strm.next_out += len;
            s.strm.avail_out -= len;
            s.strm.total_out += len;
          }
        } while (last === 0);
        used -= s.strm.avail_in;
        if (used) {
          if (used >= s.w_size) {
            s.matches = 2;
            s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
            s.strstart = s.w_size;
            s.insert = s.strstart;
          } else {
            if (s.window_size - s.strstart <= used) {
              s.strstart -= s.w_size;
              s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
              if (s.matches < 2) s.matches++;
              if (s.insert > s.strstart) s.insert = s.strstart;
            }
            s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
            s.strstart += used;
            s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
          }
          s.block_start = s.strstart;
        }
        if (s.high_water < s.strstart) s.high_water = s.strstart;
        if (last) return BS_FINISH_DONE;
        if (flush !== 0 && flush !== 4 && s.strm.avail_in === 0 && s.strstart === s.block_start) return BS_BLOCK_DONE;
        have = s.window_size - s.strstart;
        if (s.strm.avail_in > have && s.block_start >= s.w_size) {
          s.block_start -= s.w_size;
          s.strstart -= s.w_size;
          s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
          if (s.matches < 2) s.matches++;
          have += s.w_size;
          if (s.insert > s.strstart) s.insert = s.strstart;
        }
        if (have > s.strm.avail_in) have = s.strm.avail_in;
        if (have) {
          read_buf(s.strm, s.window, s.strstart, have);
          s.strstart += have;
          s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
        }
        if (s.high_water < s.strstart) s.high_water = s.strstart;
        have = s.bi_valid + 42 >> 3;
        have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
        min_block = have > s.w_size ? s.w_size : have;
        left = s.strstart - s.block_start;
        if (left >= min_block || (left || flush === 4) && flush !== 0 && s.strm.avail_in === 0 && left <= have) {
          len = left > have ? have : left;
          last = flush === 4 && s.strm.avail_in === 0 && len === left ? 1 : 0;
          _tr_stored_block(s, s.block_start, len, last);
          s.block_start += len;
          flush_pending(s.strm);
        }
        return last ? BS_FINISH_STARTED : BS_NEED_MORE;
      };
      var deflate_fast = (s, flush) => {
        let hash_head;
        let bflush;
        for (; ; ) {
          if (s.lookahead < MIN_LOOKAHEAD) {
            fill_window(s);
            if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
            if (s.lookahead === 0) break;
          }
          hash_head = 0;
          if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
          if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) s.match_length = longest_match(s, hash_head);
          if (s.match_length >= MIN_MATCH) {
            bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
            s.lookahead -= s.match_length;
            if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
              s.match_length--;
              do {
                s.strstart++;
                hash_head = INSERT_STRING(s, s.strstart);
              } while (--s.match_length !== 0);
              s.strstart++;
            } else {
              s.strstart += s.match_length;
              s.match_length = 0;
              if (s.legacy_hash) {
                s.ins_h = s.window[s.strstart];
                s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
              }
            }
          } else {
            bflush = _tr_tally(s, 0, s.window[s.strstart]);
            s.lookahead--;
            s.strstart++;
          }
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) return BS_NEED_MORE;
          }
        }
        s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
        if (flush === 4) {
          flush_block_only(s, true);
          if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
          return BS_FINISH_DONE;
        }
        if (s.sym_next) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) return BS_NEED_MORE;
        }
        return BS_BLOCK_DONE;
      };
      var deflate_slow = (s, flush) => {
        let hash_head;
        let bflush;
        let max_insert;
        for (; ; ) {
          if (s.lookahead < MIN_LOOKAHEAD) {
            fill_window(s);
            if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
            if (s.lookahead === 0) break;
          }
          hash_head = 0;
          if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
          s.prev_length = s.match_length;
          s.prev_match = s.match_start;
          s.match_length = MIN_MATCH - 1;
          if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
            s.match_length = longest_match(s, hash_head);
            if (s.match_length <= 5 && (s.strategy === 1 || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) s.match_length = MIN_MATCH - 1;
          }
          if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
            max_insert = s.strstart + s.lookahead - MIN_MATCH;
            bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
            s.lookahead -= s.prev_length - 1;
            s.prev_length -= 2;
            do
              if (++s.strstart <= max_insert) hash_head = INSERT_STRING(s, s.strstart);
            while (--s.prev_length !== 0);
            s.match_available = 0;
            s.match_length = MIN_MATCH - 1;
            s.strstart++;
            if (bflush) {
              flush_block_only(s, false);
              if (s.strm.avail_out === 0) return BS_NEED_MORE;
            }
          } else if (s.match_available) {
            bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
            if (bflush)
              flush_block_only(s, false);
            s.strstart++;
            s.lookahead--;
            if (s.strm.avail_out === 0) return BS_NEED_MORE;
          } else {
            s.match_available = 1;
            s.strstart++;
            s.lookahead--;
          }
        }
        if (s.match_available) {
          bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
          s.match_available = 0;
        }
        s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
        if (flush === 4) {
          flush_block_only(s, true);
          if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
          return BS_FINISH_DONE;
        }
        if (s.sym_next) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) return BS_NEED_MORE;
        }
        return BS_BLOCK_DONE;
      };
      var deflate_rle = (s, flush) => {
        let bflush;
        let prev;
        let scan, strend;
        const _win = s.window;
        for (; ; ) {
          if (s.lookahead <= MAX_MATCH) {
            fill_window(s);
            if (s.lookahead <= MAX_MATCH && flush === 0) return BS_NEED_MORE;
            if (s.lookahead === 0) break;
          }
          s.match_length = 0;
          if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
            scan = s.strstart - 1;
            prev = _win[scan];
            if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
              strend = s.strstart + MAX_MATCH;
              do
                ;
              while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
              s.match_length = MAX_MATCH - (strend - scan);
              if (s.match_length > s.lookahead) s.match_length = s.lookahead;
            }
          }
          if (s.match_length >= MIN_MATCH) {
            bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
            s.lookahead -= s.match_length;
            s.strstart += s.match_length;
            s.match_length = 0;
          } else {
            bflush = _tr_tally(s, 0, s.window[s.strstart]);
            s.lookahead--;
            s.strstart++;
          }
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) return BS_NEED_MORE;
          }
        }
        s.insert = 0;
        if (flush === 4) {
          flush_block_only(s, true);
          if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
          return BS_FINISH_DONE;
        }
        if (s.sym_next) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) return BS_NEED_MORE;
        }
        return BS_BLOCK_DONE;
      };
      var deflate_huff = (s, flush) => {
        let bflush;
        for (; ; ) {
          if (s.lookahead === 0) {
            fill_window(s);
            if (s.lookahead === 0) {
              if (flush === 0) return BS_NEED_MORE;
              break;
            }
          }
          s.match_length = 0;
          bflush = _tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) return BS_NEED_MORE;
          }
        }
        s.insert = 0;
        if (flush === 4) {
          flush_block_only(s, true);
          if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
          return BS_FINISH_DONE;
        }
        if (s.sym_next) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) return BS_NEED_MORE;
        }
        return BS_BLOCK_DONE;
      };
      var Config = class {
        constructor(good_length, max_lazy, nice_length, max_chain, func) {
          this.good_length = good_length;
          this.max_lazy = max_lazy;
          this.nice_length = nice_length;
          this.max_chain = max_chain;
          this.func = func;
        }
      };
      var configuration_table = [
        new Config(0, 0, 0, 0, deflate_stored),
        new Config(4, 4, 8, 4, deflate_fast),
        new Config(4, 5, 16, 8, deflate_fast),
        new Config(4, 6, 32, 32, deflate_fast),
        new Config(4, 4, 16, 16, deflate_slow),
        new Config(8, 16, 32, 32, deflate_slow),
        new Config(8, 16, 128, 128, deflate_slow),
        new Config(8, 32, 128, 256, deflate_slow),
        new Config(32, 128, 258, 1024, deflate_slow),
        new Config(32, 258, 258, 4096, deflate_slow)
      ];
      var lm_init = (s) => {
        s.window_size = 2 * s.w_size;
        zero(s.head);
        s.max_lazy_match = configuration_table[s.level].max_lazy;
        s.good_match = configuration_table[s.level].good_length;
        s.nice_match = configuration_table[s.level].nice_length;
        s.max_chain_length = configuration_table[s.level].max_chain;
        s.strstart = 0;
        s.block_start = 0;
        s.lookahead = 0;
        s.insert = 0;
        s.match_length = s.prev_length = MIN_MATCH - 1;
        s.match_available = 0;
        s.ins_h = 0;
      };
      var DeflateState = class {
        constructor() {
          this.strm = null;
          this.status = 0;
          this.pending_buf = null;
          this.pending_buf_size = 0;
          this.pending_out = 0;
          this.pending = 0;
          this.wrap = 0;
          this.gzhead = null;
          this.gzindex = 0;
          this.method = 8;
          this.last_flush = -1;
          this.w_size = 0;
          this.w_bits = 0;
          this.w_mask = 0;
          this.window = null;
          this.window_size = 0;
          this.prev = null;
          this.head = null;
          this.ins_h = 0;
          this.legacy_hash = 0;
          this.hash_size = 0;
          this.hash_bits = 0;
          this.hash_mask = 0;
          this.hash_shift = 0;
          this.block_start = 0;
          this.match_length = 0;
          this.prev_match = 0;
          this.match_available = 0;
          this.strstart = 0;
          this.match_start = 0;
          this.lookahead = 0;
          this.prev_length = 0;
          this.max_chain_length = 0;
          this.max_lazy_match = 0;
          this.level = 0;
          this.strategy = 0;
          this.good_match = 0;
          this.nice_match = 0;
          this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
          this.dyn_dtree = /* @__PURE__ */ new Uint16Array(122);
          this.bl_tree = /* @__PURE__ */ new Uint16Array(78);
          zero(this.dyn_ltree);
          zero(this.dyn_dtree);
          zero(this.bl_tree);
          this.l_desc = null;
          this.d_desc = null;
          this.bl_desc = null;
          this.bl_count = /* @__PURE__ */ new Uint16Array(16);
          this.heap = /* @__PURE__ */ new Uint16Array(573);
          zero(this.heap);
          this.heap_len = 0;
          this.heap_max = 0;
          this.depth = /* @__PURE__ */ new Uint16Array(573);
          zero(this.depth);
          this.sym_buf = 0;
          this.lit_bufsize = 0;
          this.sym_next = 0;
          this.sym_end = 0;
          this.opt_len = 0;
          this.static_len = 0;
          this.matches = 0;
          this.insert = 0;
          this.bi_buf = 0;
          this.bi_valid = 0;
        }
      };
      var deflateStateCheck = (strm) => {
        if (!strm) return 1;
        const s = strm.state;
        if (!s || s.strm !== strm || s.status !== INIT_STATE && s.status !== GZIP_STATE && s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) return 1;
        return 0;
      };
      var deflateResetKeep = (strm) => {
        if (deflateStateCheck(strm)) return err(strm, -2);
        strm.total_in = strm.total_out = 0;
        strm.data_type = 2;
        const s = strm.state;
        s.pending = 0;
        s.pending_out = 0;
        if (s.wrap < 0) s.wrap = -s.wrap;
        s.status = s.wrap === 2 ? GZIP_STATE : s.wrap ? INIT_STATE : BUSY_STATE;
        strm.adler = s.wrap === 2 ? 0 : 1;
        s.last_flush = -2;
        _tr_init(s);
        return 0;
      };
      var deflateReset = (strm) => {
        const ret = deflateResetKeep(strm);
        if (ret === 0) lm_init(strm.state);
        return ret;
      };
      var deflateSetHeader = (strm, head) => {
        if (deflateStateCheck(strm) || strm.state.wrap !== 2) return -2;
        strm.state.gzhead = head;
        return 0;
      };
      var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy, legacyHash) => {
        if (!strm) return -2;
        let wrap = 1;
        if (level === -1) level = 6;
        if (windowBits < 0) {
          wrap = 0;
          windowBits = -windowBits;
        } else if (windowBits > 15) {
          wrap = 2;
          windowBits -= 16;
        }
        if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== 8 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > 4 || windowBits === 8 && wrap !== 1) return err(strm, -2);
        if (windowBits === 8) windowBits = 9;
        const s = new DeflateState();
        strm.state = s;
        s.strm = strm;
        s.status = INIT_STATE;
        s.wrap = wrap;
        s.gzhead = null;
        s.w_bits = windowBits;
        s.w_size = 1 << s.w_bits;
        s.w_mask = s.w_size - 1;
        s.legacy_hash = legacyHash ? 1 : 0;
        s.hash_bits = memLevel + 7;
        if (!s.legacy_hash && s.hash_bits < 15) s.hash_bits = 15;
        s.hash_size = 1 << s.hash_bits;
        s.hash_mask = s.hash_size - 1;
        s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
        s.window = new Uint8Array(s.w_size * 2);
        s.head = new Uint16Array(s.hash_size);
        s.prev = new Uint16Array(s.w_size);
        s.lit_bufsize = 1 << memLevel + 6;
        s.pending_buf_size = s.lit_bufsize * 4;
        s.pending_buf = new Uint8Array(s.pending_buf_size);
        s.sym_buf = s.lit_bufsize;
        s.sym_end = (s.lit_bufsize - 1) * 3;
        s.level = level;
        s.strategy = strategy;
        s.method = method;
        return deflateReset(strm);
      };
      var deflateInit = (strm, level) => {
        return deflateInit2(strm, level, 8, MAX_WBITS, DEF_MEM_LEVEL, 0);
      };
      var deflate$1 = (strm, flush) => {
        if (deflateStateCheck(strm) || flush > 5 || flush < 0) return strm ? err(strm, -2) : -2;
        const s = strm.state;
        if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== 4) return err(strm, strm.avail_out === 0 ? -5 : -2);
        const old_flush = s.last_flush;
        s.last_flush = flush;
        if (s.pending !== 0) {
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return 0;
          }
        } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== 4) return err(strm, -5);
        if (s.status === FINISH_STATE && strm.avail_in !== 0) return err(strm, -5);
        if (s.status === INIT_STATE && s.wrap === 0) s.status = BUSY_STATE;
        if (s.status === INIT_STATE) {
          let header = 8 + (s.w_bits - 8 << 4) << 8;
          let level_flags = -1;
          if (s.strategy >= 2 || s.level < 2) level_flags = 0;
          else if (s.level < 6) level_flags = 1;
          else if (s.level === 6) level_flags = 2;
          else level_flags = 3;
          header |= level_flags << 6;
          if (s.strstart !== 0) header |= PRESET_DICT;
          header += 31 - header % 31;
          putShortMSB(s, header);
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 65535);
          }
          strm.adler = 1;
          s.status = BUSY_STATE;
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return 0;
          }
        }
        if (s.status === GZIP_STATE) {
          strm.adler = 0;
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) {
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return 0;
            }
          } else {
            put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
            put_byte(s, s.gzhead.time & 255);
            put_byte(s, s.gzhead.time >> 8 & 255);
            put_byte(s, s.gzhead.time >> 16 & 255);
            put_byte(s, s.gzhead.time >> 24 & 255);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
            put_byte(s, s.gzhead.os & 255);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 255);
              put_byte(s, s.gzhead.extra.length >> 8 & 255);
            }
            if (s.gzhead.hcrc) strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        }
        if (s.status === EXTRA_STATE) {
          if (s.gzhead.extra) {
            let beg = s.pending;
            let left = (s.gzhead.extra.length & 65535) - s.gzindex;
            while (s.pending + left > s.pending_buf_size) {
              let copy = s.pending_buf_size - s.pending;
              s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
              s.pending = s.pending_buf_size;
              if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              s.gzindex += copy;
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return 0;
              }
              beg = 0;
              left -= copy;
            }
            let gzhead_extra = new Uint8Array(s.gzhead.extra);
            s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
            s.pending += left;
            if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            s.gzindex = 0;
          }
          s.status = NAME_STATE;
        }
        if (s.status === NAME_STATE) {
          if (s.gzhead.name) {
            let beg = s.pending;
            let val;
            do {
              if (s.pending === s.pending_buf_size) {
                if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
                flush_pending(strm);
                if (s.pending !== 0) {
                  s.last_flush = -1;
                  return 0;
                }
                beg = 0;
              }
              if (s.gzindex < s.gzhead.name.length) val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
              else val = 0;
              put_byte(s, val);
            } while (val !== 0);
            if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            s.gzindex = 0;
          }
          s.status = COMMENT_STATE;
        }
        if (s.status === COMMENT_STATE) {
          if (s.gzhead.comment) {
            let beg = s.pending;
            let val;
            do {
              if (s.pending === s.pending_buf_size) {
                if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
                flush_pending(strm);
                if (s.pending !== 0) {
                  s.last_flush = -1;
                  return 0;
                }
                beg = 0;
              }
              if (s.gzindex < s.gzhead.comment.length) val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
              else val = 0;
              put_byte(s, val);
            } while (val !== 0);
            if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.status = HCRC_STATE;
        }
        if (s.status === HCRC_STATE) {
          if (s.gzhead.hcrc) {
            if (s.pending + 2 > s.pending_buf_size) {
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return 0;
              }
            }
            put_byte(s, strm.adler & 255);
            put_byte(s, strm.adler >> 8 & 255);
            strm.adler = 0;
          }
          s.status = BUSY_STATE;
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return 0;
          }
        }
        if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== 0 && s.status !== FINISH_STATE) {
          let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === 2 ? deflate_huff(s, flush) : s.strategy === 3 ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
          if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) s.status = FINISH_STATE;
          if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
            if (strm.avail_out === 0) s.last_flush = -1;
            return 0;
          }
          if (bstate === BS_BLOCK_DONE) {
            if (flush === 1) _tr_align(s);
            else if (flush !== 5) {
              _tr_stored_block(s, 0, 0, false);
              if (flush === 3) {
                zero(s.head);
                if (s.lookahead === 0) {
                  s.strstart = 0;
                  s.block_start = 0;
                  s.insert = 0;
                }
              }
            }
            flush_pending(strm);
            if (strm.avail_out === 0) {
              s.last_flush = -1;
              return 0;
            }
          }
        }
        if (flush !== 4) return 0;
        if (s.wrap <= 0) return 1;
        if (s.wrap === 2) {
          put_byte(s, strm.adler & 255);
          put_byte(s, strm.adler >> 8 & 255);
          put_byte(s, strm.adler >> 16 & 255);
          put_byte(s, strm.adler >> 24 & 255);
          put_byte(s, strm.total_in & 255);
          put_byte(s, strm.total_in >> 8 & 255);
          put_byte(s, strm.total_in >> 16 & 255);
          put_byte(s, strm.total_in >> 24 & 255);
        } else {
          putShortMSB(s, strm.adler >>> 16);
          putShortMSB(s, strm.adler & 65535);
        }
        flush_pending(strm);
        if (s.wrap > 0) s.wrap = -s.wrap;
        return s.pending !== 0 ? 0 : 1;
      };
      var deflateEnd = (strm) => {
        if (deflateStateCheck(strm)) return -2;
        const status = strm.state.status;
        strm.state = null;
        return status === BUSY_STATE ? err(strm, -3) : 0;
      };
      var deflateSetDictionary = (strm, dictionary) => {
        let dictLength = dictionary.length;
        if (deflateStateCheck(strm)) return -2;
        const s = strm.state;
        const wrap = s.wrap;
        if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) return -2;
        if (wrap === 1) strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
        s.wrap = 0;
        if (dictLength >= s.w_size) {
          if (wrap === 0) {
            zero(s.head);
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
          let tmpDict = new Uint8Array(s.w_size);
          tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
          dictionary = tmpDict;
          dictLength = s.w_size;
        }
        const avail = strm.avail_in;
        const next = strm.next_in;
        const input = strm.input;
        strm.avail_in = dictLength;
        strm.next_in = 0;
        strm.input = dictionary;
        fill_window(s);
        while (s.lookahead >= MIN_MATCH) {
          let str = s.strstart;
          let n = s.lookahead - (MIN_MATCH - 1);
          do {
            INSERT_STRING(s, str);
            str++;
          } while (--n);
          s.strstart = str;
          s.lookahead = MIN_MATCH - 1;
          fill_window(s);
        }
        s.strstart += s.lookahead;
        s.block_start = s.strstart;
        s.insert = s.lookahead;
        s.lookahead = 0;
        s.match_length = s.prev_length = MIN_MATCH - 1;
        s.match_available = 0;
        strm.next_in = next;
        strm.input = input;
        strm.avail_in = avail;
        s.wrap = wrap;
        return 0;
      };
      var BAD$1 = 16209;
      var TYPE$1 = 16191;
      function inflate_fast(strm, start) {
        let _in;
        let last;
        let _out;
        let beg;
        let end;
        let dmax;
        let wsize;
        let whave;
        let wnext;
        let s_window;
        let hold;
        let bits;
        let lcode;
        let dcode;
        let lmask;
        let dmask;
        let here;
        let op;
        let len;
        let dist;
        let from;
        let from_source;
        let input, output;
        const state = strm.state;
        _in = strm.next_in;
        input = strm.input;
        last = _in + (strm.avail_in - 5);
        _out = strm.next_out;
        output = strm.output;
        beg = _out - (start - strm.avail_out);
        end = _out + (strm.avail_out - 257);
        dmax = state.dmax;
        wsize = state.wsize;
        whave = state.whave;
        wnext = state.wnext;
        s_window = state.window;
        hold = state.hold;
        bits = state.bits;
        lcode = state.lencode;
        dcode = state.distcode;
        lmask = (1 << state.lenbits) - 1;
        dmask = (1 << state.distbits) - 1;
        top: do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen: for (; ; ) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = here >>> 16 & 255;
            if (op === 0) output[_out++] = here & 65535;
            else if (op & 16) {
              len = here & 65535;
              op &= 15;
              if (op) {
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                len += hold & (1 << op) - 1;
                hold >>>= op;
                bits -= op;
              }
              if (bits < 15) {
                hold += input[_in++] << bits;
                bits += 8;
                hold += input[_in++] << bits;
                bits += 8;
              }
              here = dcode[hold & dmask];
              dodist: for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do
                          output[_out++] = s_window[from++];
                        while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do
                          output[_out++] = s_window[from++];
                        while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do
                            output[_out++] = s_window[from++];
                          while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do
                          output[_out++] = s_window[from++];
                        while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) output[_out++] = from_source[from++];
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) output[_out++] = output[from++];
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
            } else if ((op & 64) === 0) {
              here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
              continue dolen;
            } else if (op & 32) {
              state.mode = TYPE$1;
              break top;
            } else {
              strm.msg = "invalid literal/length code";
              state.mode = BAD$1;
              break top;
            }
            break;
          }
        } while (_in < last && _out < end);
        len = bits >> 3;
        _in -= len;
        bits -= len << 3;
        hold &= (1 << bits) - 1;
        strm.next_in = _in;
        strm.next_out = _out;
        strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
        strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
        state.hold = hold;
        state.bits = bits;
      }
      var MAXBITS = 15;
      var ENOUGH_LENS$1 = 852;
      var ENOUGH_DISTS$1 = 592;
      var CODES$1 = 0;
      var LENS$1 = 1;
      var DISTS$1 = 2;
      var lbase = new Uint16Array([
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        13,
        15,
        17,
        19,
        23,
        27,
        31,
        35,
        43,
        51,
        59,
        67,
        83,
        99,
        115,
        131,
        163,
        195,
        227,
        258,
        0,
        0
      ]);
      var lext = new Uint8Array([
        16,
        16,
        16,
        16,
        16,
        16,
        16,
        16,
        17,
        17,
        17,
        17,
        18,
        18,
        18,
        18,
        19,
        19,
        19,
        19,
        20,
        20,
        20,
        20,
        21,
        21,
        21,
        21,
        16,
        199,
        75
      ]);
      var dbase = new Uint16Array([
        1,
        2,
        3,
        4,
        5,
        7,
        9,
        13,
        17,
        25,
        33,
        49,
        65,
        97,
        129,
        193,
        257,
        385,
        513,
        769,
        1025,
        1537,
        2049,
        3073,
        4097,
        6145,
        8193,
        12289,
        16385,
        24577,
        0,
        0
      ]);
      var dext = new Uint8Array([
        16,
        16,
        16,
        16,
        17,
        17,
        18,
        18,
        19,
        19,
        20,
        20,
        21,
        21,
        22,
        22,
        23,
        23,
        24,
        24,
        25,
        25,
        26,
        26,
        27,
        27,
        28,
        28,
        29,
        29,
        64,
        64
      ]);
      var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
        const bits = opts.bits;
        let len = 0;
        let sym = 0;
        let min = 0, max = 0;
        let root = 0;
        let curr = 0;
        let drop = 0;
        let left = 0;
        let used = 0;
        let huff = 0;
        let incr;
        let fill;
        let low;
        let mask;
        let next;
        let base = null;
        let match;
        const count = /* @__PURE__ */ new Uint16Array(16);
        const offs = /* @__PURE__ */ new Uint16Array(16);
        let extra = null;
        let here_bits, here_op, here_val;
        for (len = 0; len <= MAXBITS; len++) count[len] = 0;
        for (sym = 0; sym < codes; sym++) count[lens[lens_index + sym]]++;
        root = bits;
        for (max = MAXBITS; max >= 1; max--) if (count[max] !== 0) break;
        if (root > max) root = max;
        if (max === 0) {
          table[table_index++] = 20971520;
          table[table_index++] = 20971520;
          opts.bits = 1;
          return 0;
        }
        for (min = 1; min < max; min++) if (count[min] !== 0) break;
        if (root < min) root = min;
        left = 1;
        for (len = 1; len <= MAXBITS; len++) {
          left <<= 1;
          left -= count[len];
          if (left < 0) return -1;
        }
        if (left > 0 && (type === CODES$1 || max !== 1)) return -1;
        offs[1] = 0;
        for (len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + count[len];
        for (sym = 0; sym < codes; sym++) if (lens[lens_index + sym] !== 0) work[offs[lens[lens_index + sym]]++] = sym;
        if (type === CODES$1) {
          base = extra = work;
          match = 20;
        } else if (type === LENS$1) {
          base = lbase;
          extra = lext;
          match = 257;
        } else {
          base = dbase;
          extra = dext;
          match = 0;
        }
        huff = 0;
        sym = 0;
        len = min;
        next = table_index;
        curr = root;
        drop = 0;
        low = -1;
        used = 1 << root;
        mask = used - 1;
        if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
        for (; ; ) {
          here_bits = len - drop;
          if (work[sym] + 1 < match) {
            here_op = 0;
            here_val = work[sym];
          } else if (work[sym] >= match) {
            here_op = extra[work[sym] - match];
            here_val = base[work[sym] - match];
          } else {
            here_op = 96;
            here_val = 0;
          }
          incr = 1 << len - drop;
          fill = 1 << curr;
          min = fill;
          do {
            fill -= incr;
            table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
          } while (fill !== 0);
          incr = 1 << len - 1;
          while (huff & incr) incr >>= 1;
          if (incr !== 0) {
            huff &= incr - 1;
            huff += incr;
          } else huff = 0;
          sym++;
          if (--count[len] === 0) {
            if (len === max) break;
            len = lens[lens_index + work[sym]];
          }
          if (len > root && (huff & mask) !== low) {
            if (drop === 0) drop = root;
            next += min;
            curr = len - drop;
            left = 1 << curr;
            while (curr + drop < max) {
              left -= count[curr + drop];
              if (left <= 0) break;
              curr++;
              left <<= 1;
            }
            used += 1 << curr;
            if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
            low = huff & mask;
            table[low] = root << 24 | curr << 16 | next - table_index | 0;
          }
        }
        if (huff !== 0) table[next + huff] = len - drop << 24 | 4194304;
        opts.bits = root;
        return 0;
      };
      var CODES = 0;
      var LENS = 1;
      var DISTS = 2;
      var HEAD = 16180;
      var FLAGS = 16181;
      var TIME = 16182;
      var OS = 16183;
      var EXLEN = 16184;
      var EXTRA = 16185;
      var NAME = 16186;
      var COMMENT = 16187;
      var HCRC = 16188;
      var DICTID = 16189;
      var DICT = 16190;
      var TYPE = 16191;
      var TYPEDO = 16192;
      var STORED = 16193;
      var COPY_ = 16194;
      var COPY = 16195;
      var TABLE = 16196;
      var LENLENS = 16197;
      var CODELENS = 16198;
      var LEN_ = 16199;
      var LEN = 16200;
      var LENEXT = 16201;
      var DIST = 16202;
      var DISTEXT = 16203;
      var MATCH = 16204;
      var LIT = 16205;
      var CHECK = 16206;
      var LENGTH = 16207;
      var DONE = 16208;
      var BAD = 16209;
      var MEM = 16210;
      var SYNC = 16211;
      var ENOUGH_LENS = 852;
      var ENOUGH_DISTS = 592;
      var DEF_WBITS = 15;
      var zswap32 = (q) => {
        return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
      };
      var InflateState = class {
        constructor() {
          this.strm = null;
          this.mode = 0;
          this.last = false;
          this.wrap = 0;
          this.havedict = false;
          this.flags = 0;
          this.dmax = 0;
          this.check = 0;
          this.total = 0;
          this.head = null;
          this.wbits = 0;
          this.wsize = 0;
          this.whave = 0;
          this.wnext = 0;
          this.window = null;
          this.hold = 0;
          this.bits = 0;
          this.length = 0;
          this.offset = 0;
          this.extra = 0;
          this.lencode = null;
          this.distcode = null;
          this.lenbits = 0;
          this.distbits = 0;
          this.ncode = 0;
          this.nlen = 0;
          this.ndist = 0;
          this.have = 0;
          this.next = null;
          this.lens = /* @__PURE__ */ new Uint16Array(320);
          this.work = /* @__PURE__ */ new Uint16Array(288);
          this.lendyn = null;
          this.distdyn = null;
          this.sane = 0;
          this.back = 0;
          this.was = 0;
        }
      };
      var inflateStateCheck = (strm) => {
        if (!strm) return 1;
        const state = strm.state;
        if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) return 1;
        return 0;
      };
      var inflateResetKeep = (strm) => {
        if (inflateStateCheck(strm)) return -2;
        const state = strm.state;
        strm.total_in = strm.total_out = state.total = 0;
        strm.msg = "";
        if (state.wrap) strm.adler = state.wrap & 1;
        state.mode = HEAD;
        state.last = 0;
        state.havedict = 0;
        state.flags = -1;
        state.dmax = 32768;
        state.head = null;
        state.hold = 0;
        state.bits = 0;
        state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
        state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
        state.sane = 1;
        state.back = -1;
        return 0;
      };
      var inflateReset = (strm) => {
        if (inflateStateCheck(strm)) return -2;
        const state = strm.state;
        state.wsize = 0;
        state.whave = 0;
        state.wnext = 0;
        return inflateResetKeep(strm);
      };
      var inflateReset2 = (strm, windowBits) => {
        let wrap;
        if (inflateStateCheck(strm)) return -2;
        const state = strm.state;
        if (windowBits < 0) {
          wrap = 0;
          windowBits = -windowBits;
        } else {
          wrap = (windowBits >> 4) + 5;
          if (windowBits < 48) windowBits &= 15;
        }
        if (windowBits && (windowBits < 8 || windowBits > 15)) return -2;
        if (state.window !== null && state.wbits !== windowBits) state.window = null;
        state.wrap = wrap;
        state.wbits = windowBits;
        return inflateReset(strm);
      };
      var inflateInit2 = (strm, windowBits) => {
        if (!strm) return -2;
        const state = new InflateState();
        strm.state = state;
        state.strm = strm;
        state.window = null;
        state.mode = HEAD;
        const ret = inflateReset2(strm, windowBits);
        if (ret !== 0) strm.state = null;
        return ret;
      };
      var inflateInit = (strm) => {
        return inflateInit2(strm, DEF_WBITS);
      };
      var virgin = true;
      var lenfix;
      var distfix;
      var fixedtables = (state) => {
        if (virgin) {
          lenfix = /* @__PURE__ */ new Int32Array(512);
          distfix = /* @__PURE__ */ new Int32Array(32);
          let sym = 0;
          while (sym < 144) state.lens[sym++] = 8;
          while (sym < 256) state.lens[sym++] = 9;
          while (sym < 280) state.lens[sym++] = 7;
          while (sym < 288) state.lens[sym++] = 8;
          inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
          sym = 0;
          while (sym < 32) state.lens[sym++] = 5;
          inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
          virgin = false;
        }
        state.lencode = lenfix;
        state.lenbits = 9;
        state.distcode = distfix;
        state.distbits = 5;
      };
      var updatewindow = (strm, src, end, copy) => {
        let dist;
        const state = strm.state;
        if (state.window === null) state.window = new Uint8Array(1 << state.wbits);
        if (state.wsize === 0) {
          state.wsize = 1 << state.wbits;
          state.wnext = 0;
          state.whave = 0;
        }
        if (copy >= state.wsize) {
          state.window.set(src.subarray(end - state.wsize, end), 0);
          state.wnext = 0;
          state.whave = state.wsize;
        } else {
          dist = state.wsize - state.wnext;
          if (dist > copy) dist = copy;
          state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
          copy -= dist;
          if (copy) {
            state.window.set(src.subarray(end - copy, end), 0);
            state.wnext = copy;
            state.whave = state.wsize;
          } else {
            state.wnext += dist;
            if (state.wnext === state.wsize) state.wnext = 0;
            if (state.whave < state.wsize) state.whave += dist;
          }
        }
        return 0;
      };
      var inflate$1 = (strm, flush) => {
        let state;
        let input, output;
        let next;
        let put;
        let have, left;
        let hold;
        let bits;
        let _in, _out;
        let copy;
        let from;
        let from_source;
        let here = 0;
        let here_bits, here_op, here_val;
        let last_bits, last_op, last_val;
        let len;
        let ret;
        const hbuf = /* @__PURE__ */ new Uint8Array(4);
        let opts;
        let n;
        const order = new Uint8Array([
          16,
          17,
          18,
          0,
          8,
          7,
          9,
          6,
          10,
          5,
          11,
          4,
          12,
          3,
          13,
          2,
          14,
          1,
          15
        ]);
        if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) return -2;
        state = strm.state;
        if (state.mode === TYPE) state.mode = TYPEDO;
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        _in = have;
        _out = left;
        ret = 0;
        inf_leave: for (; ; ) switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            while (bits < 16) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 2 && hold === 35615) {
              if (state.wbits === 0) state.wbits = 15;
              state.check = 0;
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
              hold = 0;
              bits = 0;
              state.mode = FLAGS;
              break;
            }
            if (state.head) state.head.done = false;
            if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
              strm.msg = "incorrect header check";
              state.mode = BAD;
              break;
            }
            if ((hold & 15) !== 8) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            hold >>>= 4;
            bits -= 4;
            len = (hold & 15) + 8;
            if (state.wbits === 0) state.wbits = len;
            if (len > 15 || len > state.wbits) {
              strm.msg = "invalid window size";
              state.mode = BAD;
              break;
            }
            state.dmax = 1 << state.wbits;
            state.flags = 0;
            strm.adler = state.check = 1;
            state.mode = hold & 512 ? DICTID : TYPE;
            hold = 0;
            bits = 0;
            break;
          case FLAGS:
            while (bits < 16) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.flags = hold;
            if ((state.flags & 255) !== 8) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            if (state.flags & 57344) {
              strm.msg = "unknown header flags set";
              state.mode = BAD;
              break;
            }
            if (state.head) state.head.text = hold >> 8 & 1;
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = TIME;
          case TIME:
            while (bits < 32) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) state.head.time = hold;
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              hbuf[2] = hold >>> 16 & 255;
              hbuf[3] = hold >>> 24 & 255;
              state.check = crc32(state.check, hbuf, 4, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = OS;
          case OS:
            while (bits < 16) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) {
              state.head.xflags = hold & 255;
              state.head.os = hold >> 8;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = EXLEN;
          case EXLEN:
            if (state.flags & 1024) {
              while (bits < 16) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length = hold;
              if (state.head) state.head.extra_len = hold;
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
            } else if (state.head) state.head.extra = null;
            state.mode = EXTRA;
          case EXTRA:
            if (state.flags & 1024) {
              copy = state.length;
              if (copy > have) copy = have;
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) state.head.extra = new Uint8Array(state.head.extra_len);
                  state.head.extra.set(input.subarray(next, next + copy), len);
                }
                if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) break inf_leave;
            }
            state.length = 0;
            state.mode = NAME;
          case NAME:
            if (state.flags & 2048) {
              if (have === 0) break inf_leave;
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) state.head.name += String.fromCharCode(len);
              } while (len && copy < have);
              if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
              have -= copy;
              next += copy;
              if (len) break inf_leave;
            } else if (state.head) state.head.name = null;
            state.length = 0;
            state.mode = COMMENT;
          case COMMENT:
            if (state.flags & 4096) {
              if (have === 0) break inf_leave;
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) state.head.comment += String.fromCharCode(len);
              } while (len && copy < have);
              if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
              have -= copy;
              next += copy;
              if (len) break inf_leave;
            } else if (state.head) state.head.comment = null;
            state.mode = HCRC;
          case HCRC:
            if (state.flags & 512) {
              while (bits < 16) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 4 && hold !== (state.check & 65535)) {
                strm.msg = "header crc mismatch";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            if (state.head) {
              state.head.hcrc = state.flags >> 9 & 1;
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE;
            break;
          case DICTID:
            while (bits < 32) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            strm.adler = state.check = zswap32(hold);
            hold = 0;
            bits = 0;
            state.mode = DICT;
          case DICT:
            if (state.havedict === 0) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              return 2;
            }
            strm.adler = state.check = 1;
            state.mode = TYPE;
          case TYPE:
            if (flush === 5 || flush === 6) break inf_leave;
          case TYPEDO:
            if (state.last) {
              hold >>>= bits & 7;
              bits -= bits & 7;
              state.mode = CHECK;
              break;
            }
            while (bits < 3) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.last = hold & 1;
            hold >>>= 1;
            bits -= 1;
            switch (hold & 3) {
              case 0:
                state.mode = STORED;
                break;
              case 1:
                fixedtables(state);
                state.mode = LEN_;
                if (flush === 6) {
                  hold >>>= 2;
                  bits -= 2;
                  break inf_leave;
                }
                break;
              case 2:
                state.mode = TABLE;
                break;
              case 3:
                strm.msg = "invalid block type";
                state.mode = BAD;
            }
            hold >>>= 2;
            bits -= 2;
            break;
          case STORED:
            hold >>>= bits & 7;
            bits -= bits & 7;
            while (bits < 32) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
              strm.msg = "invalid stored block lengths";
              state.mode = BAD;
              break;
            }
            state.length = hold & 65535;
            hold = 0;
            bits = 0;
            state.mode = COPY_;
            if (flush === 6) break inf_leave;
          case COPY_:
            state.mode = COPY;
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) copy = have;
              if (copy > left) copy = left;
              if (copy === 0) break inf_leave;
              output.set(input.subarray(next, next + copy), put);
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            state.mode = TYPE;
            break;
          case TABLE:
            while (bits < 14) {
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.nlen = (hold & 31) + 257;
            hold >>>= 5;
            bits -= 5;
            state.ndist = (hold & 31) + 1;
            hold >>>= 5;
            bits -= 5;
            state.ncode = (hold & 15) + 4;
            hold >>>= 4;
            bits -= 4;
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = "too many length or distance symbols";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = LENLENS;
          case LENLENS:
            while (state.have < state.ncode) {
              while (bits < 3) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.lens[order[state.have++]] = hold & 7;
              hold >>>= 3;
              bits -= 3;
            }
            while (state.have < 19) state.lens[order[state.have++]] = 0;
            state.lencode = state.lendyn;
            state.lenbits = 7;
            opts = { bits: state.lenbits };
            ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid code lengths set";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = CODELENS;
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) break;
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_val < 16) {
                hold >>>= here_bits;
                bits -= here_bits;
                state.lens[state.have++] = here_val;
              } else {
                if (here_val === 16) {
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) break inf_leave;
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  if (state.have === 0) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 3);
                  hold >>>= 2;
                  bits -= 2;
                } else if (here_val === 17) {
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) break inf_leave;
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 3 + (hold & 7);
                  hold >>>= 3;
                  bits -= 3;
                } else {
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) break inf_leave;
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 11 + (hold & 127);
                  hold >>>= 7;
                  bits -= 7;
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                while (copy--) state.lens[state.have++] = len;
              }
            }
            if (state.mode === BAD) break;
            if (state.lens[256] === 0) {
              strm.msg = "invalid code -- missing end-of-block";
              state.mode = BAD;
              break;
            }
            state.lenbits = 9;
            opts = { bits: state.lenbits };
            ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid literal/lengths set";
              state.mode = BAD;
              break;
            }
            state.distbits = 6;
            state.distcode = state.distdyn;
            opts = { bits: state.distbits };
            ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            state.distbits = opts.bits;
            if (ret) {
              strm.msg = "invalid distances set";
              state.mode = BAD;
              break;
            }
            state.mode = LEN_;
            if (flush === 6) break inf_leave;
          case LEN_:
            state.mode = LEN;
          case LEN:
            if (have >= 6 && left >= 258) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              inflate_fast(strm, _out);
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              if (state.mode === TYPE) state.back = -1;
              break;
            }
            state.back = 0;
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) break;
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_op && (here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (; ; ) {
                here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) break;
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              state.back = -1;
              state.mode = TYPE;
              break;
            }
            if (here_op & 64) {
              strm.msg = "invalid literal/length code";
              state.mode = BAD;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
          case LENEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            state.was = state.length;
            state.mode = DIST;
          case DIST:
            for (; ; ) {
              here = state.distcode[hold & (1 << state.distbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) break;
              if (have === 0) break inf_leave;
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (; ; ) {
                here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) break;
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = "invalid distance code";
              state.mode = BAD;
              break;
            }
            state.offset = here_val;
            state.extra = here_op & 15;
            state.mode = DISTEXT;
          case DISTEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.offset += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            if (state.offset > state.dmax) {
              strm.msg = "invalid distance too far back";
              state.mode = BAD;
              break;
            }
            state.mode = MATCH;
          case MATCH:
            if (left === 0) break inf_leave;
            copy = _out - left;
            if (state.offset > copy) {
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = "invalid distance too far back";
                  state.mode = BAD;
                  break;
                }
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              } else from = state.wnext - copy;
              if (copy > state.length) copy = state.length;
              from_source = state.window;
            } else {
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) copy = left;
            left -= copy;
            state.length -= copy;
            do
              output[put++] = from_source[from++];
            while (--copy);
            if (state.length === 0) state.mode = LEN;
            break;
          case LIT:
            if (left === 0) break inf_leave;
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              while (bits < 32) {
                if (have === 0) break inf_leave;
                have--;
                hold |= input[next++] << bits;
                bits += 8;
              }
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
              _out = left;
              if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = "incorrect data check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = LENGTH;
          case LENGTH:
            if (state.wrap && state.flags) {
              while (bits < 32) {
                if (have === 0) break inf_leave;
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
                strm.msg = "incorrect length check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = DONE;
          case DONE:
            ret = 1;
            break inf_leave;
          case BAD:
            ret = -3;
            break inf_leave;
          case MEM:
            return -4;
          case SYNC:
          default:
            return -2;
        }
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== 4)) {
          if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
            state.mode = MEM;
            return -4;
          }
        }
        _in -= strm.avail_in;
        _out -= strm.avail_out;
        strm.total_in += _in;
        strm.total_out += _out;
        state.total += _out;
        if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
        strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
        if ((_in === 0 && _out === 0 || flush === 4) && ret === 0) ret = -5;
        return ret;
      };
      var inflateEnd = (strm) => {
        if (inflateStateCheck(strm)) return -2;
        let state = strm.state;
        if (state.window) state.window = null;
        strm.state = null;
        return 0;
      };
      var inflateGetHeader = (strm, head) => {
        if (inflateStateCheck(strm)) return -2;
        const state = strm.state;
        if ((state.wrap & 2) === 0) return -2;
        state.head = head;
        head.done = false;
        return 0;
      };
      var inflateSetDictionary = (strm, dictionary) => {
        const dictLength = dictionary.length;
        let state;
        let dictid;
        let ret;
        if (inflateStateCheck(strm)) return -2;
        state = strm.state;
        if (state.wrap !== 0 && state.mode !== DICT) return -2;
        if (state.mode === DICT) {
          dictid = 1;
          dictid = adler32(dictid, dictionary, dictLength, 0);
          if (dictid !== state.check) return -3;
        }
        ret = updatewindow(strm, dictionary, dictLength, dictLength);
        if (ret) {
          state.mode = MEM;
          return -4;
        }
        state.havedict = 1;
        return 0;
      };
      var ZStream = class {
        constructor() {
          this.input = null;
          this.next_in = 0;
          this.avail_in = 0;
          this.total_in = 0;
          this.output = null;
          this.next_out = 0;
          this.avail_out = 0;
          this.total_out = 0;
          this.msg = "";
          this.state = null;
          this.data_type = 2;
          this.adler = 0;
        }
      };
      var GZheader = class {
        constructor() {
          this.text = 0;
          this.time = 0;
          this.xflags = 0;
          this.os = 0;
          this.extra = null;
          this.extra_len = 0;
          this.name = "";
          this.comment = "";
          this.hcrc = 0;
          this.done = false;
        }
      };
      var flattenChunks = (chunks) => {
        const result = new Uint8Array(chunks.reduce((len, chunk) => len + chunk.length, 0));
        let pos = 0;
        for (const chunk of chunks) {
          result.set(chunk, pos);
          pos += chunk.length;
        }
        return result;
      };
      function _typeof(o) {
        "@babel/helpers - typeof";
        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
          return typeof o2;
        } : function(o2) {
          return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
        }, _typeof(o);
      }
      function toPrimitive(t, r) {
        if ("object" != _typeof(t) || !t) return t;
        var e = t[Symbol.toPrimitive];
        if (void 0 !== e) {
          var i = e.call(t, r || "default");
          if ("object" != _typeof(i)) return i;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return ("string" === r ? String : Number)(t);
      }
      function toPropertyKey(t) {
        var i = toPrimitive(t, "string");
        return "symbol" == _typeof(i) ? i : i + "";
      }
      function _defineProperty(e, r, t) {
        return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
          value: t,
          enumerable: true,
          configurable: true,
          writable: true
        }) : e[r] = t, e;
      }
      var toString$1 = Object.prototype.toString;
      var defaultOptions$1 = {
        level: -1,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: 0,
        raw: false,
        gzip: false,
        legacyHash: false,
        dictionary: /* @__PURE__ */ new Uint8Array(0)
      };
      var Deflate = class {
        /**
        * Creates a new deflator instance with the specified params. Throws an
        * exception on bad params. See {@link DeflateOptions} for the list of
        * supported options.
        *
        * @example
        * ```javascript
        * import { Deflate } from 'pako'
        *
        * const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
        * const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
        *
        * const deflate = new Deflate({ level: 3 })
        *
        * deflate.push(chunk1, false)
        * deflate.push(chunk2, true)  // true -> last chunk
        *
        * if (deflate.err) throw new Error(deflate.err)
        *
        * console.log(deflate.result)
        * ```
        */
        constructor(options = {}) {
          _defineProperty(this, "options", void 0);
          _defineProperty(
            this,
            /**
            * Error code after deflate finishes. {@link Z_OK} on success.
            * You will not need it in real life, because deflate errors
            * are possible only on wrong options or bad custom `onData` / `onEnd`
            * handlers.
            */
            "err",
            void 0
          );
          _defineProperty(
            this,
            /** Error message, if {@link Deflate.err} is not {@link Z_OK}. */
            "msg",
            void 0
          );
          _defineProperty(this, "ended", void 0);
          _defineProperty(this, "started", void 0);
          _defineProperty(
            this,
            /**
            * Chunks of output data, if {@link Deflate.onData} not overridden.
            * @internal
            */
            "chunks",
            void 0
          );
          _defineProperty(this, "strm", void 0);
          _defineProperty(
            this,
            /**
            * Compressed result, generated by default {@link Deflate.onData}
            * and {@link Deflate.onEnd} handlers. Filled after you push last chunk
            * (call {@link Deflate.push} with {@link Z_FINISH} / `true` param).
            */
            "result",
            void 0
          );
          this.options = Object.assign({}, defaultOptions$1, options);
          const opt = this.options;
          if (opt.raw && opt.windowBits > 0) opt.windowBits = -opt.windowBits;
          else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) opt.windowBits += 16;
          this.err = 0;
          this.msg = "";
          this.ended = false;
          this.started = false;
          this.chunks = [];
          this.result = /* @__PURE__ */ new Uint8Array(0);
          this.strm = new ZStream();
          this.strm.avail_out = 0;
          let status = deflateInit2(this.strm, opt.level, 8, opt.windowBits, opt.memLevel, opt.strategy, opt.legacyHash);
          if (status !== 0) throw new Error(messages_default[status]);
          if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
          const dictionary = opt.dictionary;
          if (dictionary.length) {
            if (opt.gzip) throw new Error("dictionary is not supported with gzip");
            status = deflateSetDictionary(this.strm, dictionary);
            if (status !== 0) throw new Error(messages_default[status]);
          }
        }
        /**
        * Sends input data to the deflate pipe, generating {@link Deflate.onData} calls
        * with new compressed chunks. Returns `true` on success. The last data block must
        * have `flush_mode` {@link Z_FINISH} (or `true`). That will flush the internal
        * pending buffers and call {@link Deflate.onEnd}.
        *
        * On failure, calls {@link Deflate.onEnd} with the error code and returns false.
        *
        * @param data input data. Strings will be converted to utf8 byte sequence.
        * @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES} modes.
        *   See constants. Skipped or `false` means {@link Z_NO_FLUSH}, `true` means {@link Z_FINISH}.
        *
        * @example
        * ```javascript
        * push(chunk, false) // push one of data chunks
        * ...
        * push(chunk, true)  // push last chunk
        * ```
        */
        push(data, flush_mode = false) {
          const strm = this.strm;
          const chunkSize = this.options.chunkSize;
          let status;
          let _flush_mode;
          if (this.ended) return false;
          if (typeof flush_mode === "number") _flush_mode = flush_mode;
          else _flush_mode = flush_mode === true ? 4 : 0;
          if (typeof data === "string") strm.input = new TextEncoder().encode(data);
          else if (toString$1.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
          else strm.input = data;
          strm.next_in = 0;
          strm.avail_in = strm.input.length;
          if (!this.started) {
            this.started = true;
            this.onStart(strm);
          }
          for (; ; ) {
            if (strm.avail_out === 0) {
              strm.output = new Uint8Array(chunkSize);
              strm.next_out = 0;
              strm.avail_out = chunkSize;
            }
            if ((_flush_mode === 2 || _flush_mode === 3) && strm.avail_out <= 6) {
              this.onData(strm.output.subarray(0, strm.next_out));
              strm.avail_out = 0;
              continue;
            }
            status = deflate$1(strm, _flush_mode);
            if (status === 1) {
              if (strm.next_out > 0) this.onData(strm.output.subarray(0, strm.next_out));
              status = deflateEnd(this.strm);
              break;
            }
            if (strm.avail_out === 0) {
              this.onData(strm.output);
              continue;
            }
            if (_flush_mode > 0 && strm.next_out > 0) {
              this.onData(strm.output.subarray(0, strm.next_out));
              strm.avail_out = 0;
              continue;
            }
            if (strm.avail_in === 0) return true;
          }
          this.err = status;
          this.msg = strm.msg || messages_default[status];
          this.ended = true;
          this.onEnd(status);
          return status === 0;
        }
        /**
        * Called once before the first low-level deflate call.
        */
        onStart(strm) {
        }
        /**
        * By default, stores data blocks in the {@link Deflate.chunks} property and glues
        * them in {@link Deflate.onEnd}. Override this handler if you need another behaviour.
        */
        onData(chunk) {
          this.chunks.push(chunk);
        }
        /**
        * Called once after you tell deflate that the input stream is
        * complete ({@link Z_FINISH}). By default, joins the collected {@link Deflate.chunks}
        * into the {@link Deflate.result} property.
        *
        * @param status deflate status. {@link Z_OK} on success, other if not.
        */
        onEnd(status) {
          if (status === 0) this.result = flattenChunks(this.chunks);
          this.chunks = [];
        }
      };
      function deflate(input, options = {}) {
        const deflator = new Deflate(options);
        deflator.push(input, true);
        if (deflator.err) throw new Error(deflator.msg);
        return deflator.result;
      }
      function deflateRaw(input, options = {}) {
        return deflate(input, Object.assign({}, options, { raw: true }));
      }
      function gzip(input, options = {}) {
        return deflate(input, Object.assign({}, options, { gzip: true }));
      }
      function ownKeys(e, r) {
        var t = Object.keys(e);
        if (Object.getOwnPropertySymbols) {
          var o = Object.getOwnPropertySymbols(e);
          r && (o = o.filter(function(r2) {
            return Object.getOwnPropertyDescriptor(e, r2).enumerable;
          })), t.push.apply(t, o);
        }
        return t;
      }
      function _objectSpread2(e) {
        for (var r = 1; r < arguments.length; r++) {
          var t = null != arguments[r] ? arguments[r] : {};
          r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
            _defineProperty(e, r2, t[r2]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
            Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
          });
        }
        return e;
      }
      var toString = Object.prototype.toString;
      var defaultOptions = {
        chunkSize: 1024 * 64,
        windowBits: 15,
        raw: false,
        dictionary: /* @__PURE__ */ new Uint8Array(0)
      };
      var Inflate = class {
        /**
        * Creates a new inflator instance with the specified params. Throws an
        * exception on bad params. See {@link InflateOptions} for the list of
        * supported options.
        *
        * By default, when no options are set, the deflate/gzip data format is
        * autodetected via the wrapper header.
        *
        * @example
        * ```javascript
        * import { Inflate } from 'pako'
        *
        * const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
        * const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
        *
        * const inflate = new Inflate({ level: 3 })
        *
        * inflate.push(chunk1, false)
        * inflate.push(chunk2, true)  // true -> last chunk
        *
        * if (inflate.err) throw new Error(inflate.err)
        *
        * console.log(inflate.result)
        * ```
        */
        constructor(options = {}) {
          _defineProperty(this, "options", void 0);
          _defineProperty(
            this,
            /**
            * Error code after inflate finishes. {@link Z_OK} on success.
            * Should be checked when broken data is possible.
            */
            "err",
            void 0
          );
          _defineProperty(
            this,
            /** Error message, if {@link Inflate.err} is not {@link Z_OK}. */
            "msg",
            void 0
          );
          _defineProperty(
            this,
            /**
            * `true` once the compressed stream has ended. A stream may end before the
            * caller's data does (trailing bytes), so check this to know when to stop
            * pushing - further {@link Inflate.push} calls are no-ops.
            */
            "ended",
            void 0
          );
          _defineProperty(this, "started", void 0);
          _defineProperty(
            this,
            /**
            * Chunks of output data, if {@link Inflate.onData} not overridden.
            * @internal
            */
            "chunks",
            void 0
          );
          _defineProperty(this, "strm", void 0);
          _defineProperty(
            this,
            /**
            * Uncompressed result, generated by default {@link Inflate.onData}
            * and {@link Inflate.onEnd} handlers. Filled after you push last chunk
            * (call {@link Inflate.push} with {@link Z_FINISH} / `true` param).
            */
            "result",
            void 0
          );
          this.options = Object.assign({}, defaultOptions, options);
          const opt = this.options;
          if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
            opt.windowBits = -opt.windowBits;
            if (opt.windowBits === 0) opt.windowBits = -15;
          }
          if (opt.windowBits >= 0 && opt.windowBits < 16 && !options.windowBits) opt.windowBits += 32;
          if (opt.windowBits > 15 && opt.windowBits < 48) {
            if ((opt.windowBits & 15) === 0) opt.windowBits |= 15;
          }
          this.err = 0;
          this.msg = "";
          this.ended = false;
          this.started = false;
          this.chunks = [];
          this.result = /* @__PURE__ */ new Uint8Array(0);
          this.strm = new ZStream();
          this.strm.avail_out = 0;
          let status = inflateInit2(this.strm, opt.windowBits);
          if (status !== 0) throw new Error(messages_default[status]);
          if (toString.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
          const dictionary = opt.dictionary;
          if (opt.raw && dictionary.length) {
            status = inflateSetDictionary(this.strm, dictionary);
            if (status !== 0) throw new Error(messages_default[status]);
          }
        }
        /**
        * Sends input data to the inflate pipe, generating {@link Inflate.onData} calls
        * with new output chunks. Returns `true` on success. If end of stream is
        * detected, {@link Inflate.onEnd} will be called.
        *
        * `flush_mode` is not needed for normal operation, because end of stream
        * is detected automatically. Pass {@link Z_SYNC_FLUSH} to force the decoder
        * to emit all currently available output — handy when you need to decode
        * data frame-by-frame from a long-running stream.
        *
        * On failure, calls {@link Inflate.onEnd} with the error code and returns false.
        *
        * Once the stream has ended (a compressed stream may end before your data
        * does), further `push` calls are no-ops and return whether the decode
        * finished successfully. The final outcome is in {@link Inflate.result},
        * {@link Inflate.err} and {@link Inflate.msg}.
        *
        * @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES}
        *   flush modes. See constants. Skipped or `false` means {@link Z_NO_FLUSH},
        *   `true` means {@link Z_FINISH}.
        *
        * @example
        * ```javascript
        * push(chunk, false) // push one of data chunks
        * ...
        * push(chunk, true)  // push last chunk
        * ```
        */
        push(data, flush_mode = false) {
          const strm = this.strm;
          const chunkSize = this.options.chunkSize;
          let status;
          let _flush_mode;
          let last_avail_out;
          if (this.ended) return this.err === 0;
          if (typeof flush_mode === "number") _flush_mode = flush_mode;
          else _flush_mode = flush_mode === true ? 4 : 0;
          if (toString.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
          else strm.input = data;
          strm.next_in = 0;
          strm.avail_in = strm.input.length;
          if (!this.started) {
            this.started = true;
            this.onStart(strm);
          }
          for (; ; ) {
            if (strm.avail_out === 0) {
              strm.output = new Uint8Array(chunkSize);
              strm.next_out = 0;
              strm.avail_out = chunkSize;
            }
            status = inflate$1(strm, _flush_mode);
            if (status === 2) {
              const dictionary = this.options.dictionary;
              if (dictionary.length) {
                status = inflateSetDictionary(strm, dictionary);
                if (status === 0) status = inflate$1(strm, _flush_mode);
                else if (status === -3) status = 2;
              }
            }
            while (strm.avail_in > 0 && status === 1 && strm.state.wrap & 2 && strm.state.flags !== 0 && strm.input[strm.next_in] !== 0) {
              inflateReset(strm);
              status = inflate$1(strm, _flush_mode);
            }
            if (status === -2 || status === -3 || status === 2 || status === -4) break;
            last_avail_out = strm.avail_out;
            if (strm.next_out) {
              if (strm.avail_out === 0 || status === 1 || _flush_mode > 0) {
                this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
                strm.avail_out = 0;
                strm.next_out = 0;
              }
            }
            if ((status === 0 || status === -5) && last_avail_out === 0) continue;
            if (status === 1) {
              status = inflateEnd(this.strm);
              break;
            }
            if (strm.avail_in === 0) {
              if (_flush_mode === 4) {
                status = inflateEnd(this.strm);
                if (status === 0) status = -5;
                break;
              }
              return true;
            }
          }
          this.err = status;
          this.msg = strm.msg || messages_default[status];
          this.ended = true;
          this.onEnd(status);
          return status === 0;
        }
        /**
        * Called once before the first low-level inflate call.
        *
        * Override this handler to attach low-level inflate state, for example to read
        * gzip header metadata:
        *
        * ```javascript
        * import { Inflate, GZheader, zlibInflateGetHeader } from 'pako'
        *
        * const inflator = new Inflate()
        *
        * inflator.onStart = function (strm) {
        *   this.header = new GZheader()
        *   zlibInflateGetHeader(strm, this.header)
        * }
        *
        * inflator.push(data, true)
        * console.log(inflator.header.name)
        * ```
        */
        onStart(strm) {
        }
        /**
        * By default, stores data blocks in the {@link Inflate.chunks} property and glues
        * them in {@link Inflate.onEnd}. Override this handler if you need another behaviour.
        *
        * @param chunk output data.
        */
        onData(chunk) {
          this.chunks.push(chunk);
        }
        /**
        * Called after you tell inflate that the input stream is
        * complete ({@link Z_FINISH}). By default, joins the collected {@link Inflate.chunks},
        * frees memory and fills the {@link Inflate.result} property.
        *
        * @param status inflate status. {@link Z_OK} on success, other if not.
        */
        onEnd(status) {
          if (status === 0) this.result = flattenChunks(this.chunks);
          this.chunks = [];
        }
      };
      function inflate(input, options = {}) {
        const inflator = new Inflate(options);
        inflator.push(input, true);
        if (inflator.err) throw new Error(inflator.msg);
        const result = inflator.result;
        return options.toText ? new TextDecoder().decode(result) : result;
      }
      function inflateRaw(input, options = {}) {
        return inflate(input, _objectSpread2(_objectSpread2({}, options), {}, { raw: true }));
      }
      exports.Deflate = Deflate;
      exports.GZheader = GZheader;
      exports.Inflate = Inflate;
      exports.ZStream = ZStream;
      exports.Z_BLOCK = Z_BLOCK;
      exports.Z_BUF_ERROR = Z_BUF_ERROR;
      exports.Z_DATA_ERROR = Z_DATA_ERROR;
      exports.Z_ERRNO = Z_ERRNO;
      exports.Z_FINISH = Z_FINISH;
      exports.Z_FULL_FLUSH = Z_FULL_FLUSH;
      exports.Z_MEM_ERROR = Z_MEM_ERROR;
      exports.Z_NEED_DICT = Z_NEED_DICT;
      exports.Z_NO_FLUSH = Z_NO_FLUSH;
      exports.Z_OK = Z_OK;
      exports.Z_PARTIAL_FLUSH = Z_PARTIAL_FLUSH;
      exports.Z_STREAM_END = Z_STREAM_END;
      exports.Z_STREAM_ERROR = Z_STREAM_ERROR;
      exports.Z_SYNC_FLUSH = Z_SYNC_FLUSH;
      exports.Z_TREES = Z_TREES;
      exports.deflate = deflate;
      exports.deflateRaw = deflateRaw;
      exports.gzip = gzip;
      exports.inflate = inflate;
      exports.inflateRaw = inflateRaw;
      exports.ungzip = inflate;
      exports.zlibDeflate = deflate$1;
      exports.zlibDeflateEnd = deflateEnd;
      exports.zlibDeflateInit = deflateInit;
      exports.zlibDeflateInit2 = deflateInit2;
      exports.zlibDeflateReset = deflateReset;
      exports.zlibDeflateResetKeep = deflateResetKeep;
      exports.zlibDeflateSetDictionary = deflateSetDictionary;
      exports.zlibDeflateSetHeader = deflateSetHeader;
      exports.zlibInflate = inflate$1;
      exports.zlibInflateEnd = inflateEnd;
      exports.zlibInflateGetHeader = inflateGetHeader;
      exports.zlibInflateInit = inflateInit;
      exports.zlibInflateInit2 = inflateInit2;
      exports.zlibInflateReset = inflateReset;
      exports.zlibInflateReset2 = inflateReset2;
      exports.zlibInflateResetKeep = inflateResetKeep;
      exports.zlibInflateSetDictionary = inflateSetDictionary;
    }
  });

  // shims/mdict-base.js
  var require_mdict_base = __commonJS({
    "shims/mdict-base.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MdictMeta = void 0;
      var assert_1 = { default: function(condition, msg) {
        if (!condition) throw new Error(msg || "assertion failed");
      } };
      var lzo1x_wrapper_js_1 = __importDefault(require_lzo1x_wrapper());
      var utils_js_1 = __importDefault(require_utils());
      var scanner_js_1 = require_scanner();
      var _pako = require_pako_cjs();
      var zlib_1 = { default: { inflateSync: _pako.inflate } };
      var pako = {
        inflate: zlib_1.default.inflateSync
      };
      var UTF_16LE_DECODER = new TextDecoder("utf-16le");
      var UTF16 = "UTF-16";
      var UTF_8_DECODER = new TextDecoder("utf-8");
      var UTF8 = "UTF-8";
      var BIG5_DECODER = new TextDecoder("big5");
      var BIG5 = "BIG5";
      var GB18030_DECODER = new TextDecoder("gb18030");
      var GB18030 = "GB18030";
      var MdictMeta = class {
        constructor() {
          this.fname = "";
          this.passcode = "";
          this.ext = "mdx";
          this.version = 2;
          this.numWidth = 4;
          this.numFmt = utils_js_1.default.NUMFMT_UINT32;
          this.encoding = "";
          this.decoder = new TextDecoder();
          this.encrypt = 0;
        }
      };
      exports.MdictMeta = MdictMeta;
      var MDictBase = class {
        /**
         * mdict constructor
         * @param {string} fname
         * @param {string} passcode
         * @param options
         */
        constructor(fname, passcode, options) {
          this.meta = new MdictMeta();
          this.meta.fname = fname;
          this.meta.passcode = passcode;
          this.meta.ext = utils_js_1.default.getExtension(fname, "mdx");
          this.scanner = new scanner_js_1.FileScanner(fname);
          this.options = options !== null && options !== void 0 ? options : {
            passcode,
            debug: false,
            resort: true,
            isStripKey: true,
            isCaseSensitive: false,
            encryptType: -1
          };
          if (passcode) {
          } else if (this.meta.version >= 3) {
          }
          this._headerStartOffset = 0;
          this._headerEndOffset = 0;
          this.header = {};
          this._keyHeaderStartOffset = 0;
          this._keyHeaderEndOffset = 0;
          this.keyHeader = {
            keywordBlocksNum: 0,
            keywordNum: 0,
            keyInfoUnpackSize: 0,
            keyInfoPackedSize: 0,
            keywordBlockPackedSize: 0
          };
          this._keyBlockInfoStartOffset = 0;
          this._keyBlockInfoEndOffset = 0;
          this.keyInfoList = [];
          this._keyBlockStartOffset = 0;
          this._keyBlockEndOffset = 0;
          this.keywordList = [];
          this._recordHeaderStartOffset = 0;
          this._recordHeaderEndOffset = 0;
          this.recordHeader = {
            recordBlocksNum: 0,
            entriesNum: 0,
            recordInfoCompSize: 0,
            recordBlockCompSize: 0
          };
          this._recordInfoStartOffset = 0;
          this._recordInfoEndOffset = 0;
          this.recordInfoList = [];
          this._recordBlockStartOffset = 0;
          this._recordBlockEndOffset = 0;
          this.recordBlockDataList = [];
          this.readDict();
        }
        strip(key) {
          if (this._isStripKey()) {
            key = key.replace(utils_js_1.default.REGEXP_STRIPKEY[this.meta.ext], "$1");
          }
          if (!this._isKeyCaseSensitive()) {
            key = key.toLowerCase();
          }
          if (this.meta.ext == "mdd") {
            key = key.replace(utils_js_1.default.REGEXP_STRIPKEY[this.meta.ext], "$1");
            key = key.replace(/_/g, "!");
          }
          return key.toLowerCase().trim();
        }
        comp(word1, word2) {
          return word1.localeCompare(word2);
        }
        // comp2(word1: string, word2: string): number {
        //   // if case-sensitive, the uppercase word is smaller than lowercase word
        //   // for example: `Holanda` is smaller than `abacaxi`
        //   // so when comparing with the words, we should use the dictionary order,
        //   // however, if we change the word to lowercase, the binary search algorithm will be confused
        //   // so, we use the enhanced compare function `common.wordCompare`
        //
        //   const key1 = this.strip(word1);
        //   const key2 = this.strip(word2);
        //
        //   const collator = new Intl.Collator('en-US');
        //   const result =  collator.compare(key1, key2);
        //   if (hasLatinies(word1) && hasLatinies(word2)){
        //     if (word1.length > word2.length) {
        //       return 1;
        //     } else if (word1.length < word2.length) {
        //       const result2 = word1.localeCompare(word2);
        //       if (result2 >= 0 ){
        //         return result2;
        //       } else {
        //         if (word1.length > word2.length) {
        //           return 1;
        //         }
        //         return -1;
        //       }
        //     }
        //   }
        //   if (hasLatinies(word1) || hasLatinies(word2)){
        //     if (word1.length > word2.length) {
        //       const result2 = word1.localeCompare(word2);
        //       if (result2 >= 0 ){
        //         return result2;
        //       } else {
        //         if (word1.length > word2.length) {
        //           return 1;
        //         }
        //         return -1;
        //       }
        //     } else if (word1.length < word2.length) {
        //       return 1;
        //     } else {
        //       if (hasLatinies(word1) && !hasLatinies(word2)){
        //         return 1;
        //       }
        //     }
        //   }
        //   if(result == 0) {
        //     // prefix
        //     if (word1.at(0) === '-' && word2.at(0) !== '-') {
        //       return 1;
        //     }
        //     if (word2.at(0) === '-' && word1.at(0) !== '-') {
        //       return 1;
        //     }
        //     //inner space and middle dash
        //     if (word2.indexOf('-') > 0 && word1.indexOf(' ') >0) {
        //       return 0;
        //     }
        //     if (word1.indexOf('-') > 0 && word2.indexOf(' ') >0) {
        //       return 0;
        //     }
        //
        //   }
        //   if (result < 0) {
        //     if (this.meta.ext == 'mdd') {
        //       if (key1.length > key2.length) {
        //         return this.strip(key1) > this.strip(key2) ? -1 : 1;
        //       } else if (key2.length > key1.length) {
        //         return 1;
        //       }
        //     }
        //     return result;
        //   }
        //   return result;
        // }
        _isKeyCaseSensitive() {
          return this.options.isCaseSensitive || utils_js_1.default.isTrue(this.header["isCaseSensitive"]);
        }
        _isStripKey() {
          return this.options.isStripKey || utils_js_1.default.isTrue(this.header["StripKey"]);
        }
        readDict() {
          this._readHeader();
          this._readKeyHeader();
          this._readKeyInfos();
          this._readKeyBlocks();
          this._readRecordHeader();
          this._readRecordInfos();
          this.keywordList.sort((ki1, ki2) => {
            return ki1.keyText.localeCompare(ki2.keyText);
          });
        }
        /**
         * STEP 4.2. split keys from key block
         * split key from key block buffer
         * @param {Buffer} keyBlock key block buffer
         * @param {number} keyBlockIdx
         */
        splitKeyBlock(keyBlock, keyBlockIdx) {
          const width = this.meta.encoding == "UTF-16" || this.meta.ext == "mdd" ? 2 : 1;
          const keyList = [];
          let keyStartIndex = 0;
          while (keyStartIndex < keyBlock.length) {
            let meaningOffset = 0;
            const meaningOffsetBuff = keyBlock.slice(keyStartIndex, keyStartIndex + this.meta.numWidth);
            meaningOffset = utils_js_1.default.b2n(meaningOffsetBuff);
            let keyEndIndex = -1;
            let i = keyStartIndex + this.meta.numWidth;
            while (i < keyBlock.length) {
              if (width === 1 && keyBlock[i] == 0 || width === 2 && keyBlock[i] == 0 && keyBlock[i + 1] == 0) {
                keyEndIndex = i;
                break;
              }
              i += width;
            }
            if (keyEndIndex == -1) {
              break;
            }
            const keyTextBuffer = keyBlock.slice(keyStartIndex + this.meta.numWidth, keyEndIndex);
            const keyText = this.meta.decoder.decode(keyTextBuffer);
            if (keyList.length > 0) {
              keyList[keyList.length - 1].recordEndOffset = meaningOffset;
            }
            keyList.push({
              recordStartOffset: meaningOffset,
              keyText,
              keyBlockIdx,
              recordEndOffset: -1
            });
            keyStartIndex = keyEndIndex + width;
          }
          return keyList;
        }
        /**
         * STEP 1. read dictionary header
         * Get mdx header info (xml content to object)
         * [0:4], 4 bytes header length (header_byte_size), big-endian, 4 bytes, 16 bits
         * [4:header_byte_size + 4] header_bytes
         * [header_bytes_size + 4:header_bytes_size +8] adler32 checksum
         * should be:
         * assert(zlib.adler32(header_bytes) & 0xffffffff, adler32)
         *
         */
        _readHeader() {
          const headerByteSizeBuff = this.scanner.readBuffer(0, 4);
          const headerByteSize = utils_js_1.default.b2n(headerByteSizeBuff);
          const headerBuffer = this.scanner.readBuffer(4, headerByteSize);
          this._headerEndOffset = headerByteSize + 4 + 4;
          this._keyHeaderStartOffset = headerByteSize + 4 + 4;
          const headerText = UTF_16LE_DECODER.decode(headerBuffer);
          Object.assign(this.header, utils_js_1.default.parseHeader(headerText));
          this.header.KeyCaseSensitive = this.header.KeyCaseSensitive || "No";
          this.header.StripKey = this.header.StripKey || "Yes";
          if (!this.header.Encrypted || this.header.Encrypted == "" || this.header.Encrypted == "No") {
            this.meta.encrypt = 0;
          } else if (this.header.Encrypted == "Yes") {
            this.meta.encrypt = 1;
          } else {
            this.meta.encrypt = parseInt(this.header["Encrypted"], 10);
          }
          if (this.options.encryptType && this.options.encryptType != -1) {
            this.meta.encrypt = this.options.encryptType;
          }
          this.meta.version = parseFloat(this.header["GeneratedByEngineVersion"]);
          if (this.meta.version >= 2) {
            this.meta.numWidth = 8;
            this.meta.numFmt = utils_js_1.default.NUMFMT_UINT64;
          } else {
            this.meta.numWidth = 4;
            this.meta.numFmt = utils_js_1.default.NUMFMT_UINT32;
          }
          if (!this.header.Encoding || this.header.Encoding == "") {
            this.meta.encoding = UTF8;
            this.meta.decoder = UTF_8_DECODER;
          } else if (this.header.Encoding == "GBK" || this.header.Encoding == "GB2312") {
            this.meta.encoding = GB18030;
            this.meta.decoder = GB18030_DECODER;
          } else if (this.header["Encoding"].toLowerCase() == "big5") {
            this.meta.encoding = BIG5;
            this.meta.decoder = BIG5_DECODER;
          } else {
            this.meta.encoding = this.header["Encoding"].toLowerCase() == "utf16" || this.header["Encoding"].toLowerCase() == "utf-16" ? UTF16 : UTF8;
            if (this.meta.encoding == UTF16) {
              this.meta.decoder = UTF_16LE_DECODER;
            } else {
              this.meta.decoder = UTF_8_DECODER;
            }
          }
          if (this.meta.ext === "mdd") {
            this.meta.encoding = UTF16;
            this.meta.decoder = UTF_16LE_DECODER;
          }
        }
        /**
         * STEP 2. read key block header
         * read key block header
         */
        _readKeyHeader() {
          this._keyHeaderStartOffset = this._headerEndOffset;
          const headerMetaSize = this.meta.version >= 2 ? 8 * 5 : 4 * 4;
          const keyHeaderBuff = this.scanner.readBuffer(this._keyHeaderStartOffset, headerMetaSize);
          if (this.meta.encrypt & 1) {
            if (!this.meta.passcode || this.meta.passcode == "") {
              throw Error(" user identification is needed to read encrypted file");
            }
            if (this.header.RegisterBy == "Email") {
              throw Error("encrypted file not support yet");
            } else {
              throw Error("encrypted file not support yet");
            }
          }
          let offset = 0;
          const keywordBlockNumBuff = keyHeaderBuff.slice(offset, offset + this.meta.numWidth);
          this.keyHeader.keywordBlocksNum = utils_js_1.default.b2n(keywordBlockNumBuff);
          offset += this.meta.numWidth;
          const keywordNumBuff = keyHeaderBuff.slice(offset, offset + this.meta.numWidth);
          this.keyHeader.keywordNum = utils_js_1.default.b2n(keywordNumBuff);
          offset += this.meta.numWidth;
          if (this.meta.version >= 2) {
            const keyInfoUnpackSizeBuff = keyHeaderBuff.slice(offset, offset + this.meta.numWidth);
            const keyInfoUnpackSize = utils_js_1.default.b2n(keyInfoUnpackSizeBuff);
            offset += this.meta.numWidth;
            this.keyHeader.keyInfoUnpackSize = keyInfoUnpackSize;
          }
          const keyInfoPackedSizeBuff = keyHeaderBuff.slice(offset, offset + this.meta.numWidth);
          const keyInfoPackedSize = utils_js_1.default.b2n(keyInfoPackedSizeBuff);
          offset += this.meta.numWidth;
          this.keyHeader.keyInfoPackedSize = keyInfoPackedSize;
          const keywordBlockPackedSizeBuff = keyHeaderBuff.slice(offset, offset + this.meta.numWidth);
          const keywordBlockPackedSize = utils_js_1.default.b2n(keywordBlockPackedSizeBuff);
          offset += this.meta.numWidth;
          this.keyHeader.keywordBlockPackedSize = keywordBlockPackedSize;
          this._keyHeaderEndOffset = this._keyHeaderStartOffset + headerMetaSize + (this.meta.version >= 2 ? 4 : 0);
        }
        /**
         * STEP 3. read key block info, if you want quick search, read at here already enough
         * read key block info
         * key block info list
         */
        _readKeyInfos() {
          this._keyBlockInfoStartOffset = this._keyHeaderEndOffset;
          const keyBlockInfoBuff = this.scanner.readBuffer(this._keyBlockInfoStartOffset, this.keyHeader.keyInfoPackedSize);
          const keyBlockInfoList = this._decodeKeyInfo(keyBlockInfoBuff);
          this._keyBlockInfoEndOffset = this._keyBlockInfoStartOffset + this.keyHeader.keyInfoPackedSize;
          (0, assert_1.default)(this.keyHeader.keywordBlocksNum === keyBlockInfoList.length, "the num_key_info_list should equals to key_block_info_list");
          this.keyInfoList = keyBlockInfoList;
          this._recordBlockStartOffset = this._keyBlockInfoEndOffset + this.keyHeader.keywordBlockPackedSize;
        }
        /**
         * STEP 3.1. decode key block info, this function will invokde in `_readKeyBlockInfo`
         * and decode the first key and last key infomation, etc.
         * @param {Uint8Array} keyInfoBuff key block info buffer
         */
        _decodeKeyInfo(keyInfoBuff) {
          const keyBlockNum = this.keyHeader.keywordBlocksNum;
          if (this.meta.version == 2) {
            const packType = keyInfoBuff.subarray(0, 4).join("");
            if (this.meta.encrypt === 2) {
              keyInfoBuff = utils_js_1.default.mdxDecrypt(keyInfoBuff);
            }
            (0, assert_1.default)(this.keyHeader.keyInfoPackedSize == keyInfoBuff.length, `key_block_info keyInfoPackedSize ${this.keyHeader.keyInfoPackedSize} should equal to key-info buffer length ${keyInfoBuff.length}`);
            if (this.meta.version >= 2 && packType == "2000") {
              const keyInfoBuffUnpacked = zlib_1.default.inflateSync(keyInfoBuff.slice(8));
              (0, assert_1.default)(this.keyHeader.keyInfoUnpackSize == keyInfoBuffUnpacked.length, `key_block_info keyInfoUnpackSize  ${this.keyHeader.keyInfoUnpackSize} should equal to keyInfoBuffUnpacked buffer length ${keyInfoBuffUnpacked.length}`);
              keyInfoBuff = keyInfoBuffUnpacked;
            }
          }
          const keyBlockInfoList = [];
          let entriesCount = 0;
          let kbCount = 0;
          let indexOffset = 0;
          let kbPackSizeAccu = 0;
          let kbUnpackSizeAccu = 0;
          while (kbCount < keyBlockNum) {
            let blockWordCount = 0;
            let packSize = 0;
            let unpackSize = 0;
            let firstWordSize = 0;
            let lastWordSize = 0;
            let firstKey = "";
            let lastKey = "";
            blockWordCount = utils_js_1.default.b2n(keyInfoBuff.slice(indexOffset, indexOffset + this.meta.numWidth));
            indexOffset += this.meta.numWidth;
            firstWordSize = utils_js_1.default.b2n(keyInfoBuff.slice(indexOffset, indexOffset + this.meta.numWidth / 4));
            indexOffset += this.meta.numWidth / 4;
            if (this.meta.version >= 2) {
              if (this.meta.encoding === UTF16) {
                firstWordSize = (firstWordSize + 1) * 2;
              } else {
                firstWordSize += 1;
              }
            } else {
              if (this.meta.encoding === UTF16) {
                firstWordSize = firstWordSize * 2;
              }
            }
            const firstWordBuffer = keyInfoBuff.slice(indexOffset, indexOffset + firstWordSize);
            indexOffset += firstWordSize;
            lastWordSize = utils_js_1.default.b2n(keyInfoBuff.slice(indexOffset, indexOffset + this.meta.numWidth / 4));
            indexOffset += this.meta.numWidth / 4;
            if (this.meta.version >= 2) {
              if (this.meta.encoding === UTF16) {
                lastWordSize = (lastWordSize + 1) * 2;
              } else {
                lastWordSize += 1;
              }
            } else {
              if (this.meta.encoding === UTF16) {
                lastWordSize = lastWordSize * 2;
              }
            }
            const lastWordBuffer = keyInfoBuff.slice(indexOffset, indexOffset + lastWordSize);
            indexOffset += lastWordSize;
            packSize = utils_js_1.default.b2n(keyInfoBuff.slice(indexOffset, indexOffset + this.meta.numWidth));
            indexOffset += this.meta.numWidth;
            unpackSize = utils_js_1.default.b2n(keyInfoBuff.slice(indexOffset, indexOffset + this.meta.numWidth));
            indexOffset += this.meta.numWidth;
            if (this.meta.encoding === UTF16) {
              firstKey = this.meta.decoder.decode(firstWordBuffer);
              lastKey = this.meta.decoder.decode(lastWordBuffer);
            } else {
              firstKey = this.meta.decoder.decode(firstWordBuffer);
              lastKey = this.meta.decoder.decode(lastWordBuffer);
            }
            keyBlockInfoList.push({
              firstKey,
              lastKey,
              keyBlockPackSize: packSize,
              keyBlockPackAccumulator: kbPackSizeAccu,
              keyBlockUnpackSize: unpackSize,
              keyBlockUnpackAccumulator: kbUnpackSizeAccu,
              keyBlockEntriesNum: blockWordCount,
              keyBlockEntriesNumAccumulator: entriesCount,
              keyBlockInfoIndex: kbCount
            });
            kbCount += 1;
            entriesCount += blockWordCount;
            kbPackSizeAccu += packSize;
            kbUnpackSizeAccu += unpackSize;
          }
          (0, assert_1.default)(kbPackSizeAccu === this.keyHeader.keywordBlockPackedSize);
          return keyBlockInfoList;
        }
        /**
         * step 4.1. decode key block
         * find the key block by the phrase
         * @param kbPackedBuff
         * @param unpackSize
         */
        unpackKeyBlock(kbPackedBuff, unpackSize) {
          const compType = Buffer.from(kbPackedBuff.slice(0, 4));
          let keyBlock;
          if (compType.toString("hex") == "00000000") {
            keyBlock = kbPackedBuff.slice(8);
          } else if (compType.toString("hex") == "01000000") {
            const decompressedBuff = lzo1x_wrapper_js_1.default.decompress(kbPackedBuff.slice(8), unpackSize, 0);
            keyBlock = Buffer.from(decompressedBuff);
          } else if (compType.toString("hex") === "02000000") {
            keyBlock = Buffer.from(pako.inflate(kbPackedBuff.slice(8)));
          } else {
            throw Error(`cannot determine the compress type: ${compType.toString("hex")}`);
          }
          return keyBlock;
        }
        /**
         * STEP 4. decode key block
         * decode key block return the total keys list,
         * Note: this method runs very slow, please do not use this unless special target
         */
        _readKeyBlocks() {
          this._keyBlockStartOffset = this._keyBlockInfoEndOffset;
          let keyBlockList = [];
          let kbStartOffset = this._keyBlockStartOffset;
          for (let idx = 0; idx < this.keyInfoList.length; idx++) {
            const packSize = this.keyInfoList[idx].keyBlockPackSize;
            const unpackSize = this.keyInfoList[idx].keyBlockUnpackSize;
            const start = kbStartOffset;
            (0, assert_1.default)(start === this.keyInfoList[idx].keyBlockPackAccumulator + this._keyBlockStartOffset, "should be equal");
            const kbCompBuff = this.scanner.readBuffer(start, packSize);
            const keyBlock = this.unpackKeyBlock(kbCompBuff, unpackSize);
            const splitKeyBlock = this.splitKeyBlock(Buffer.from(keyBlock), idx);
            if (keyBlockList.length > 0 && keyBlockList[keyBlockList.length - 1].recordEndOffset == -1) {
              keyBlockList[keyBlockList.length - 1].recordEndOffset = splitKeyBlock[0].recordStartOffset;
            }
            keyBlockList = keyBlockList.concat(splitKeyBlock);
            kbStartOffset += packSize;
          }
          if (keyBlockList[keyBlockList.length - 1].recordEndOffset === -1) {
            keyBlockList[keyBlockList.length - 1].recordEndOffset = -1;
          }
          (0, assert_1.default)(keyBlockList.length === this.keyHeader.keywordNum, `key list length: ${keyBlockList.length} should equal to key entries num: ${this.keyHeader.keywordNum}`);
          this._keyBlockEndOffset = this._keyBlockStartOffset + this.keyHeader.keywordBlockPackedSize;
          this.keywordList = keyBlockList;
        }
        /**
         * STEP 5.
         * decode record header,
         * includes:
         * [0:8/4]    - record block number
         * [8:16/4:8] - num entries the key-value entries number
         * [16:24/8:12] - record block info size
         * [24:32/12:16] - record block size
         */
        _readRecordHeader() {
          this._recordHeaderStartOffset = this._keyBlockInfoEndOffset + this.keyHeader.keywordBlockPackedSize;
          const recordHeaderLen = this.meta.version >= 2 ? 4 * 8 : 4 * 4;
          this._recordHeaderEndOffset = this._recordHeaderStartOffset + recordHeaderLen;
          const recordHeaderBuffer = this.scanner.readBuffer(this._recordHeaderStartOffset, recordHeaderLen);
          let ofset = 0;
          const recordBlocksNum = utils_js_1.default.b2n(recordHeaderBuffer.slice(ofset, ofset + this.meta.numWidth));
          ofset += this.meta.numWidth;
          const entriesNum = utils_js_1.default.b2n(recordHeaderBuffer.slice(ofset, ofset + this.meta.numWidth));
          (0, assert_1.default)(entriesNum === this.keyHeader.keywordNum);
          ofset += this.meta.numWidth;
          const recordInfoCompSize = utils_js_1.default.b2n(recordHeaderBuffer.slice(ofset, ofset + this.meta.numWidth));
          ofset += this.meta.numWidth;
          const recordBlockCompSize = utils_js_1.default.b2n(recordHeaderBuffer.slice(ofset, ofset + this.meta.numWidth));
          this.recordHeader = {
            recordBlocksNum,
            entriesNum,
            recordInfoCompSize,
            recordBlockCompSize
          };
        }
        /**
         * STEP 6.
         * decode record Info,
         */
        _readRecordInfos() {
          this._recordInfoStartOffset = this._recordHeaderEndOffset;
          const recordInfoBuff = this.scanner.readBuffer(this._recordInfoStartOffset, this.recordHeader.recordInfoCompSize);
          const recordInfoList = [];
          let offset = 0;
          let compressedAdder = 0;
          let decompressionAdder = 0;
          for (let i = 0; i < this.recordHeader.recordBlocksNum; i++) {
            const packSize = utils_js_1.default.b2n(recordInfoBuff.slice(offset, offset + this.meta.numWidth));
            offset += this.meta.numWidth;
            const unpackSize = utils_js_1.default.b2n(recordInfoBuff.slice(offset, offset + this.meta.numWidth));
            offset += this.meta.numWidth;
            recordInfoList.push({
              packSize,
              packAccumulateOffset: compressedAdder,
              unpackSize,
              unpackAccumulatorOffset: decompressionAdder
            });
            compressedAdder += packSize;
            decompressionAdder += unpackSize;
          }
          (0, assert_1.default)(offset === this.recordHeader.recordInfoCompSize);
          (0, assert_1.default)(compressedAdder === this.recordHeader.recordBlockCompSize);
          this.recordInfoList = recordInfoList;
          if (this.keywordList.length > 0) {
            this.keywordList[this.keywordList.length - 1].recordEndOffset = this.recordInfoList[this.recordInfoList.length - 1].unpackAccumulatorOffset + this.recordInfoList[this.recordInfoList.length - 1].unpackSize;
          }
          this._recordInfoEndOffset = this._recordInfoStartOffset + this.recordHeader.recordInfoCompSize;
          this._recordBlockStartOffset = this._recordInfoEndOffset;
        }
        /**
         * STEP 7.
         * read all records block,
         * this is a slow method, do not use!
         */
        _readRecordBlocks() {
          this._recordBlockStartOffset = this._recordInfoEndOffset;
          const keyData = [];
          let sizeCounter = 0;
          let itemCounter = 0;
          let recordOffset = this._recordBlockStartOffset;
          for (let idx = 0; idx < this.recordInfoList.length; idx++) {
            let compressType = "none";
            const packSize = this.recordInfoList[idx].packSize;
            const unpackSize = this.recordInfoList[idx].unpackSize;
            const rbPackBuff = this.scanner.readBuffer(recordOffset, packSize);
            recordOffset += packSize;
            const rbCompType = Buffer.from(rbPackBuff.slice(0, 4));
            let recordBlock = new Uint8Array(rbPackBuff.length);
            if (rbCompType.toString("hex") === "00000000") {
              recordBlock = rbPackBuff.slice(8, rbPackBuff.length);
            } else {
              let blockBufDecrypted = null;
              if (this.meta.encrypt === 1) {
                blockBufDecrypted = utils_js_1.default.mdxDecrypt(rbPackBuff);
              } else {
                blockBufDecrypted = rbPackBuff.slice(8, rbPackBuff.length);
              }
              if (rbCompType.toString("hex") === "01000000") {
                compressType = "lzo";
                recordBlock = Buffer.from(lzo1x_wrapper_js_1.default.decompress(blockBufDecrypted, unpackSize, 0));
                recordBlock = Buffer.from(recordBlock).slice(recordBlock.byteOffset, recordBlock.byteOffset + recordBlock.byteLength);
              } else if (rbCompType.toString("hex") === "02000000") {
                compressType = "zlib";
                recordBlock = Buffer.from(pako.inflate(blockBufDecrypted));
              }
            }
            (0, assert_1.default)(recordBlock.length === unpackSize);
            let offset = 0;
            let i = 0;
            while (i < this.keywordList.length) {
              const recordStart = this.keywordList[i].recordStartOffset;
              const keyText = this.keywordList[i].keyText;
              if (recordStart - offset >= recordBlock.length) {
                break;
              }
              let recordEnd;
              if (i < this.keywordList.length - 1) {
                recordEnd = this.keywordList[i + 1].recordStartOffset;
              } else {
                recordEnd = recordBlock.length + offset;
              }
              i += 1;
              keyData.push({
                key: keyText,
                idx: itemCounter,
                // data,
                encoding: this.meta.encoding,
                // record_start,
                // record_end,
                record_idx: idx,
                record_comp_start: recordOffset,
                record_compressed_size: packSize,
                record_decompressed_size: unpackSize,
                record_comp_type: compressType,
                record_encrypted: this.meta.encrypt === 1,
                relative_record_start: recordStart - offset,
                relative_record_end: recordEnd - offset
              });
              itemCounter++;
            }
            offset += recordBlock.length;
            sizeCounter += packSize;
          }
          (0, assert_1.default)(sizeCounter === this.recordHeader.recordBlockCompSize);
          this.recordBlockDataList = keyData;
          this._recordBlockEndOffset = this._recordBlockStartOffset + sizeCounter;
        }
      };
      exports.default = MDictBase;
    }
  });

  // shims/mdict.js
  var require_mdict = __commonJS({
    "shims/mdict.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Mdict = void 0;
      var mdict_base_js_1 = __importDefault(require_mdict_base());
      var utils_js_1 = __importDefault(require_utils());
      var lzo1x_wrapper_js_1 = __importDefault(require_lzo1x_wrapper());
      var pako = require_pako_cjs();
      var Mdict = class extends mdict_base_js_1.default {
        constructor(fname, options) {
          var _a, _b, _c, _d, _e, _f;
          options = options || {};
          options = {
            passcode: (_a = options.passcode) !== null && _a !== void 0 ? _a : "",
            debug: (_b = options.debug) !== null && _b !== void 0 ? _b : false,
            resort: (_c = options.resort) !== null && _c !== void 0 ? _c : true,
            isStripKey: (_d = options.isStripKey) !== null && _d !== void 0 ? _d : true,
            isCaseSensitive: (_e = options.isCaseSensitive) !== null && _e !== void 0 ? _e : true,
            encryptType: (_f = options.encryptType) !== null && _f !== void 0 ? _f : -1
          };
          const passcode = options.passcode || void 0;
          super(fname, passcode, options);
        }
        /**
         * lookupKeyInfoItem lookup the `keyInfoItem`
         * the `keyInfoItem` contains key-word record block location: recordStartOffset
         * the `recordStartOffset` should indicate the unpacked record data relative offset
         * @param word the target word phrase
         */
        lookupKeyBlockByWord(word, isAssociate = false) {
          const list = this.keywordList;
          let left = 0;
          let right = list.length - 1;
          let mid = 0;
          while (left <= right) {
            mid = left + (right - left >> 1);
            const compRes = this.comp(word, list[mid].keyText);
            if (compRes > 0) {
              left = mid + 1;
            } else if (compRes == 0) {
              break;
            } else {
              right = mid - 1;
            }
          }
          if (this.comp(word, list[mid].keyText) != 0) {
            if (!isAssociate) {
              return void 0;
            }
          }
          return list[mid];
        }
        /**
         * locate the record meaning buffer by `keyListItem`
         * the `KeyBlockItem.recordStartOffset` should indicate the record block info location
         * use the record block info, we can get the `recordBuffer`, then we need decrypt and decompress
         * use decompressed `recordBuffer` we can get the total block which contains meanings
         * then, use:
         *  const start = item.recordStartOffset - recordBlockInfo.unpackAccumulatorOffset;
         *  const end = item.recordEndOffset - recordBlockInfo.unpackAccumulatorOffset;
         *  the finally meaning's buffer is `unpackRecordBlockBuff[start, end]`
         * @param item
         */
        lookupRecordByKeyBlock(item) {
          const recordBlockIndex = this.reduceRecordBlockInfo(item.recordStartOffset);
          const recordBlockInfo = this.recordInfoList[recordBlockIndex];
          const recordBuffer = this.scanner.readBuffer(this._recordBlockStartOffset + recordBlockInfo.packAccumulateOffset, recordBlockInfo.packSize);
          const unpackRecordBlockBuff = this.decompressBuff(recordBuffer, recordBlockInfo.unpackSize);
          const start = item.recordStartOffset - recordBlockInfo.unpackAccumulatorOffset;
          const end = item.recordEndOffset - recordBlockInfo.unpackAccumulatorOffset;
          return unpackRecordBlockBuff.slice(start, end);
        }
        /**
         * lookupPartialKeyInfoListById
         * decode key block by key block id, and we can get the partial key list
         * the key list just contains the partial key list
         * @param {number} keyInfoId key block id
         * @return {KeyWordItem[]}
         */
        lookupPartialKeyBlockListByKeyInfoId(keyInfoId) {
          const packSize = this.keyInfoList[keyInfoId].keyBlockPackSize;
          const unpackSize = this.keyInfoList[keyInfoId].keyBlockUnpackSize;
          const startOffset = this.keyInfoList[keyInfoId].keyBlockPackAccumulator + this._keyBlockStartOffset;
          const keyBlockPackedBuff = this.scanner.readBuffer(startOffset, packSize);
          const keyBlock = this.unpackKeyBlock(keyBlockPackedBuff, unpackSize);
          return this.splitKeyBlock(keyBlock, keyInfoId);
        }
        /**
         * lookupInfoBlock reduce word find the nearest key block
         * @param {string} word searching phrase
         * @param keyInfoList
         */
        lookupKeyInfoByWord(word, keyInfoList) {
          const list = keyInfoList ? keyInfoList : this.keyInfoList;
          let left = 0;
          let right = list.length - 1;
          let mid = 0;
          while (left <= right) {
            mid = left + (right - left >> 1);
            if (this.comp(word, list[mid].firstKey) >= 0 && this.comp(word, list[mid].lastKey) <= 0) {
              return mid;
            } else if (this.comp(word, list[mid].lastKey) >= 0) {
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
          return -1;
        }
        decompressBuff(recordBuffer, unpackSize) {
          const rbCompType = Buffer.from(recordBuffer.subarray(0, 4));
          let unpackRecordBlockBuff = new Uint8Array(recordBuffer.length);
          if (rbCompType.toString("hex") === "00000000") {
            unpackRecordBlockBuff = recordBuffer.slice(8);
          } else {
            let blockBufDecrypted = null;
            if (this.meta.encrypt === 1) {
              blockBufDecrypted = utils_js_1.default.mdxDecrypt(recordBuffer);
            } else {
              blockBufDecrypted = recordBuffer.subarray(8, recordBuffer.length);
            }
            if (rbCompType.toString("hex") === "01000000") {
              unpackRecordBlockBuff = lzo1x_wrapper_js_1.default.decompress(blockBufDecrypted, unpackSize, 1308672);
              unpackRecordBlockBuff = Buffer.from(unpackRecordBlockBuff).subarray(unpackRecordBlockBuff.byteOffset, unpackRecordBlockBuff.byteOffset + unpackRecordBlockBuff.byteLength);
            } else if (rbCompType.toString("hex") === "02000000") {
              unpackRecordBlockBuff = Buffer.from(pako.inflate(blockBufDecrypted));
            }
          }
          return unpackRecordBlockBuff;
        }
        /**
         * find record which record start locate
         * @param {number} recordStart record start offset
         */
        reduceRecordBlockInfo(recordStart) {
          let left = 0;
          let right = this.recordInfoList.length - 1;
          let mid = 0;
          while (left <= right) {
            mid = left + (right - left >> 1);
            if (recordStart >= this.recordInfoList[mid].unpackAccumulatorOffset) {
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
          return left - 1;
        }
        close() {
          this.scanner.close();
          this.keywordList = [];
          this.keyInfoList = [];
          this.recordInfoList = [];
        }
      };
      exports.Mdict = Mdict;
      exports.default = Mdict;
    }
  });

  // shims/mdx.js
  var require_mdx = __commonJS({
    "shims/mdx.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MDX = void 0;
      var mdict_js_1 = require_mdict();
      var utils_js_1 = __importDefault(require_utils());
      var MDX = class extends mdict_js_1.Mdict {
        /**
         * lookup the word
         * @tests ok
         * @param word search word
         * @returns word definition
         */
        lookup(word) {
          const keyWordItem = this.lookupKeyBlockByWord(word);
          if (!keyWordItem) {
            return {
              keyText: word,
              definition: null
            };
          }
          const def = this.lookupRecordByKeyBlock(keyWordItem);
          if (!def) {
            return {
              keyText: word,
              definition: null
            };
          }
          return {
            keyText: word,
            definition: this.meta.decoder.decode(def)
          };
        }
        /**
         * lookup all entries matching the word
         * useful when dictionary has duplicate keys (e.g., main entry + image + link)
         * @param word search word
         * @returns array of all matching entries
         */
        lookupAll(word) {
          const matchedItems = this.keywordList.filter((item) => {
            return this.comp(item.keyText, word) === 0;
          });
          return matchedItems.map((item) => {
            const def = this.lookupRecordByKeyBlock(item);
            return {
              keyText: item.keyText,
              definition: def ? this.meta.decoder.decode(def) : null
            };
          });
        }
        fetch(keywordItem) {
          const def = this.lookupRecordByKeyBlock(keywordItem);
          if (!def) {
            return {
              keyText: keywordItem.keyText,
              definition: null
            };
          }
          return {
            keyText: keywordItem.keyText,
            definition: this.meta.decoder.decode(def)
          };
        }
        /**
         * search the prefix like the phrase in the dictionary
         * @tests ok
         * @param prefix prefix search phrase
         * @returns the prefix related list
         */
        prefix(prefix) {
          const keywordList = this.associate(prefix);
          return keywordList.filter((item) => {
            return item.keyText.startsWith(prefix);
          });
        }
        /**
         * search matched list of associate words
         * @tests ok
         * @param phrase associate search likely workds
         * @returns matched list
         */
        associate(phrase) {
          const keyBlockItem = this.lookupKeyBlockByWord(phrase, true);
          if (!keyBlockItem) {
            return [];
          }
          return this.keywordList.filter((keyword) => {
            return keyword.keyBlockIdx == keyBlockItem.keyBlockIdx;
          });
        }
        /**
         * suggest the phrase with the edit distance
         * @tests ok
         * @param phrase search phrase
         * @param distance edit distance
         * @returns the suggest list
         */
        suggest(phrase, distance) {
          if (distance < 0 || distance > 5) {
            console.log("the edit distance should be in the range of 0 to 5");
            return [];
          }
          const keywordList = this.associate(phrase);
          const suggestList = [];
          keywordList.forEach((item) => {
            const key = this.strip(item.keyText);
            const ed = utils_js_1.default.levenshteinDistance(key, this.strip(phrase));
            if (ed <= distance) {
              suggestList.push(item);
            }
          });
          return suggestList;
        }
        fetch_definition(keywordItem) {
          const def = this.lookupRecordByKeyBlock(keywordItem);
          if (!def) {
            return {
              keyText: keywordItem.keyText,
              definition: null
            };
          }
          return {
            keyText: keywordItem.keyText,
            definition: this.meta.decoder.decode(def)
          };
        }
        /**
         * fuzzy search words list
         * @tests ok
         * @param word search word
         * @param fuzzy_size the fuzzy workd size
         * @param ed_gap edit distance
         * @returns fuzzy word list
         */
        fuzzy_search(word, fuzzy_size, ed_gap) {
          const fuzzy_words = [];
          const keywordList = this.associate(word);
          keywordList.forEach((item) => {
            const key = this.strip(item.keyText);
            const ed = utils_js_1.default.levenshteinDistance(key, this.strip(word));
            if (ed <= ed_gap) {
              fuzzy_words.push(Object.assign(Object.assign({}, item), { ed }));
            }
          });
          fuzzy_words.sort((a, b) => {
            return a.ed - b.ed;
          });
          return fuzzy_words.slice(0, fuzzy_size);
        }
        /**
         * search words that contain the specified substring
         * @param substring the text to search for
         * @param caseSensitive whether to perform case-sensitive search (default: false)
         * @param limit maximum number of results to return (default: 1000)
         * @returns list of keywords containing the substring
         */
        contains(substring, caseSensitive = false, limit = 1e3) {
          const searchKey = caseSensitive ? substring : substring.toLowerCase();
          const matchedList = [];
          for (const item of this.keywordList) {
            const keyText = caseSensitive ? item.keyText : item.keyText.toLowerCase();
            if (keyText.includes(searchKey)) {
              matchedList.push(item);
              if (matchedList.length >= limit) {
                break;
              }
            }
          }
          return matchedList;
        }
      };
      exports.MDX = MDX;
    }
  });

  // shims/mdd.js
  var require_mdd = __commonJS({
    "shims/mdd.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MDD = void 0;
      var mdict_js_1 = require_mdict();
      var BASE64ENCODER = function(arrayBuffer) {
        return Buffer.from(arrayBuffer).toString("base64");
      };
      var MDD = class extends mdict_js_1.Mdict {
        /**
         * locate the resource key
         * @param resourceKey resource key
         * @returns the keyText and definition
         */
        locate(resourceKey) {
          let normalizedKey = resourceKey.replace(/\//g, "\\");
          if (normalizedKey.length > 0 && !normalizedKey.startsWith("\\")) {
            normalizedKey = "\\" + normalizedKey;
          }
          const item = this.lookupKeyBlockByWord(normalizedKey);
          if (!item) {
            return {
              keyText: resourceKey,
              definition: null
            };
          }
          const meaningBuff = this.lookupRecordByKeyBlock(item);
          if (!meaningBuff) {
            return {
              keyText: resourceKey,
              definition: null
            };
          }
          return {
            keyText: resourceKey,
            definition: BASE64ENCODER(meaningBuff)
          };
        }
      };
      exports.MDD = MDD;
    }
  });

  // shims/index.js
  var require_index = __commonJS({
    "shims/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MDD = exports.MDX = exports.Mdict = void 0;
      var mdict_js_1 = require_mdict();
      Object.defineProperty(exports, "Mdict", { enumerable: true, get: function() {
        return mdict_js_1.Mdict;
      } });
      var mdx_js_1 = require_mdx();
      Object.defineProperty(exports, "MDX", { enumerable: true, get: function() {
        return mdx_js_1.MDX;
      } });
      var mdd_js_1 = require_mdd();
      Object.defineProperty(exports, "MDD", { enumerable: true, get: function() {
        return mdd_js_1.MDD;
      } });
    }
  });

  // shims/browser-entry.js
  var require_browser_entry = __commonJS({
    "shims/browser-entry.js"() {
      var { Buffer: Buffer2 } = require_buffer();
      if (typeof globalThis.Buffer === "undefined") {
        globalThis.Buffer = Buffer2;
      }
      var { MDX, MDD } = require_index();
      function setBuffer(arrayBuffer) {
        globalThis.__mdict_buffer = arrayBuffer;
      }
      globalThis.MDictLib = { MDX, MDD, setBuffer };
    }
  });
  require_browser_entry();
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/
