const vlq = require('vlq');

class SourceMap {
  constructor() {
    this.mappings = '';
    this.sources = [];
    this.sourcesContent = [];
    this.names = [];

    this.lastLine = 0;
    this.lastSourceLine = 0;
    this.lastName = 0;
    this.lastSource = 0;
    this.lastSourceCol = 0;

    this._endsOnNewLine = true;
  }

  addEmptyMap(source, content, line, lineCount) {
    this._endOnNewLine();

    if (line < this.lastLine) {
      throw new Error('Maps must be added in order from top to bottom');
    }

    if (this.lastLine < line) {
      this.mappings += ';'.repeat(line - this.lastLine);
    }

    lineCount = lineCount || (countLines(content) + 1);
    let firstMapping = vlq.encode([
      0,
      this.sources.length - this.lastSource,
      0 - this.lastSourceLine,
      -this.lastSourceCol
    ]) + ';';

    if (lineCount > 0) {
      this.mappings += firstMapping;
    }

    if (lineCount > 1) {
      this.mappings += 'AACA;'.repeat(lineCount - 1);
    }

    this.sources.push(source);
    this.sourcesContent.push(content);

    this.lastSource = this.sources.length - 1
    this.lastSourceLine = lineCount - 1;
    this.lastSourceCol = 0
    this.lastLine = line + lineCount;
    this._endsOnNewLine = true;
  }

  addMap({ mappings, sources, sourcesContent, names = [] }, line = 0) {
    this._endOnNewLine();

    let {
      lastSource,
      lastSourceLine,
      lastSourceCol,
      lastName,
      modifications,
      lines
    } = analyzeMappings(mappings, names && names.length > 0);

    if (this.lastLine < line) {
      this.mappings += ';'.repeat(line - this.lastLine);
    }

    let modifiedMappings = '';
    let prevIndex = 0;
    modifications.forEach(update => {
      modifiedMappings += mappings.substring(prevIndex, update.i);

      if (update.onlyUpdateName) {
        let namesAdjustment = this.names.length - this.lastName;

        modifiedMappings += vlq.encode([
          update.values[0],
          update.values[1],
          update.values[2],
          update.values[3],
          namesAdjustment + update.values[4]
        ]);

        lastName += namesAdjustment;
      } else {
        let [generatedCol, source, sourceLine, sourceCol] = update.values;
        let sourceAdjustment = this.sources.length - this.lastSource;
        let sourceLineAdjustment = 0 - this.lastSourceLine;
        let sourceColAdjustment = -this.lastSourceCol;

        modifiedMappings += vlq.encode([
          generatedCol,
          sourceAdjustment + source,
          sourceLineAdjustment + sourceLine,
          sourceColAdjustment + sourceCol
        ]);
        lastSource += sourceAdjustment;
        lastSourceLine += sourceLineAdjustment;
        lastSourceCol += sourceColAdjustment;

        if (update.size === 5) {
          let namesAdjustment = this.names.length - this.lastName;
          modifiedMappings += vlq.encode(namesAdjustment + update.values[4]);
          lastName += namesAdjustment;
        }
      }

      prevIndex = update.end;
    });
    modifiedMappings += mappings.substring(prevIndex);

    // Caching this here is significantly faster than doing it in _endOnNewLine
    this._endsOnNewLine = modifiedMappings.charAt(modifiedMappings.length - 1) === ';';

    this.sources.push(...sources);
    this.sourcesContent.push(...sourcesContent);
    this.names.push(...names);

    this.lastSource += lastSource;
    this.lastSourceLine += lastSourceLine;
    this.lastSourceCol += lastSourceCol;
    this.lastName += lastName;
    this.lastLine = lines + line;
    this.mappings += modifiedMappings;
  }

  _endOnNewLine() {
    if (!this._endsOnNewLine) {
      this.mappings += ';';
    }
  }

  build() {
    return {
      mappings: this.mappings,
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: this.names,
      version: 3
    }
  }
}

module.exports = SourceMap;

function analyzeMappings(mappings, hasNames) {
  // If there are no names, then no need to update them
  let updatedNames = !hasNames;
  let updatedFirstMapping = false;
  let modifications = [];
  let lines = 0;
  let pos = new Int32Array(5);

  let col = 0;
  let end;
  let i;
  let char;
  let j;
  for (i = 0; i < mappings.length; i++) {
    let lineEnd = mappings.indexOf(';', i);
    if (lineEnd === -1) {
      lineEnd = mappings.length;
    }
    col = 0;
    lines += 1;

    for (j = i; j < lineEnd; j++) {
      end = j + 1;
      inner: for (; end < lineEnd; end++) {
        char = mappings.charAt(end);
        if (char === ',') {
          break inner;
        }
      }

      let size = decode(mappings, pos, j, end);

      if (!updatedFirstMapping && size > 1) {
        updatedFirstMapping = true;
        let decoded = new Int32Array(5);
        decode(mappings, decoded, j, end)

        if (size === 5) {
          // Adjust names
          updatedNames = true;
        }

        modifications.push({ i: j, end, values: decoded, size, onlyUpdateName: false });
      } else if (!updatedNames && size === 5) {
        let decoded = new Int32Array(5);
        decode(mappings, decoded, j, end)
        modifications.push({ i: j, end, values: decoded, size, onlyUpdateName: true });
        updatedNames = true;
      }

      j = end;
    }

    i = lineEnd;
  }

  return {
    lastSource: pos[1],
    lastSourceLine: pos[2],
    lastSourceCol: pos[3],
    lastName: pos[4],
    lines,
    modifications
  };
}

module.exports.analyzeMappings = analyzeMappings;

// The first line counts as 0
function countLines(code) {
  let lastIndex = code.indexOf('\n');
  let count = 0;

  while (lastIndex > -1) {
    count += 1;
    lastIndex = code.indexOf('\n', lastIndex + 1);
  }

  return count;
}

let charIntegers = new Int8Array(300);

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('')
  .forEach(function (char, i) {
    charIntegers[char.charCodeAt(0)] = i;
  });

function decode(string, pos, index, end) {
  let shift = 0;
  let value = 0;
  let posIndex = 0;

  for (let i = index; i < end; i += 1) {
    let integer = charIntegers[string.charCodeAt(i)];

    const has_continuation_bit = integer & 32;

    integer &= 31;
    value += integer << shift;

    if (has_continuation_bit) {
      shift += 5;
    } else {
      const should_negate = value & 1;
      value >>>= 1;

      if (should_negate) {
        pos[posIndex++] += value === 0 ? -0x80000000 : -value;
      } else {
        if (posIndex == 1) {
        }
        pos[posIndex++] += value;
      }

      // reset
      value = shift = 0;
    }
  }

  return posIndex;
}

class CombinedFile {
  constructor() {
    this._chunks = [];
    this._lineOffset = 0;
    this._addedFiles = 0;
  }

  addEmptyLines(lineCount) {
    this._chunks.push('\n'.repeat(lineCount));
    this._lineOffset += lineCount;
  }

  addGeneratedCode(code) {
    let lineCount = countLines(code);
    this._chunks.push(code);
    this._lineOffset += lineCount;
  }

  addCodeWithMap(sourceName, {
    code,
    map,
    header,
    footer
  }) {
    this._addedFiles += 1;
    let lineCount = countLines(code) + 1;
    
    if (header) {
      this.addGeneratedCode(header);
    }

    this._chunks.push({
      code,
      map,
      sourceName,
      lineOffset: this._lineOffset,
      lines: lineCount
    });

    if (footer) {
      this.addGeneratedCode(footer);
    }

    if (map) {
      this._hasInputMaps = true;
    }

    this._lineOffset += lineCount;
  }

  _buildWithMap() {
    let code = '';
    let sourceMap = new SourceMap();

    this._chunks.forEach(chunk => {
      if (typeof chunk === 'string') {
        code += chunk;
      } else if (typeof chunk === 'object') {
        code += chunk.code;

        if (chunk.map) {
          sourceMap.addMap(chunk.map, chunk.lineOffset)
        } else {
          sourceMap.addEmptyMap(chunk.sourceName, chunk.code, chunk.lineOffset, chunk.lines);
        }
      } else {
        throw new Error(`unrecognized chunk type, ${typeof chunk}`);
      }
    });

    let map = sourceMap.build();

    return { code, map };
  }

  // Optimization for when there are 1 or 0 files.
  // We can avoid parsing the source map if there is one, and instead
  // modify it to account for the offset from any generated code. 
  _buildWithBiasedMap() {
    let file;
    let header = '';
    let footer = '';

    this._chunks.forEach(chunk => {
      if (typeof chunk === 'string') {
        if (file) {
          footer += chunk;
        } else {
          header += chunk;
        }
      } else if (typeof chunk === 'object') {
        if (file) {
          throw new Error('_buildWithBiasedMap does not support multiple files');
        }
        file = chunk;
      } else {
        throw new Error(`unrecognized chunk type, ${typeof chunk}`);
      }
    });

    if (!file) {
      return { code: header + footer, map: null };
    }

    let map = file.map;

    if (!map) {
      let sourceMap = new SourceMap();
      sourceMap.addEmptyMap(file.sourceName, file.code, file.lineOffset, file.lines);
      map = sourceMap.build();
    } else {
      // Bias the input sourcemap to account for the lines added by the header
      // This is much faster than parsing and re-encoding the sourcemap
      let headerMappings = ';'.repeat(file.lineOffset);
      map = Object.assign({}, map);
      map.mappings = headerMappings + map.mappings;
    }

    return {
      code: header + file.code + footer,
      map
    };
  }

  build() {
    let code;
    let map;

    if (this._addedFiles < 2) {
      ({ code, map } = this._buildWithBiasedMap());
    } else if (!this._hasInputMaps) {
      ({ code, map } = this._buildWithMap());
    }

    return {
      code,
      map
    };
  }
}

module.exports.CombinedFile = CombinedFile;
