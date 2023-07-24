# @zodern/source-maps

Very fast library to concat source maps.

```
npm install @zodern/source-maps
```

```js
const SourceMap = require('@zodern/source-maps');
const fs = require('node:fs');

const map = new SourceMap();
map.addMap(fs.readFileSync('./index.js.map', 'utf-8'));
map.addEmptyMap('test.js', fs.readFileSync('./test.js', 'utf-8'), 25);

const outputSourceMap = map.build();
```

### Why is it fast?

The slowest part of source map libraries is decoding, storing, and then encoding the mappings.
In source maps, each mapping is encoded as values relative to the previous mapping. This library leverages that fact to use a simplified decoding process, and to only re-encode one or two mappings per input source map. The library is able to simply copy the majority of the mappings from the input source map to the output source map.

The mapping parser has also been heavily optimized, and is 2x - 4x faster than most other source map libraries.

This design would lend itself to easily adding caching, or parallelism using workers. Currently neither has been implemented.

#### Benchmark

Generating empty source maps: 

```
# Small is 3 files with 10 lines each
@zodern/source-maps - small with lineCount x 3,527,239 ops/sec ±0.30% (92 runs sampled)
@zodern/source-maps - small x 1,385,932 ops/sec ±0.36% (93 runs sampled)
@parcel/source-map - small x 222,989 ops/sec ±0.39% (95 runs sampled)

# Medium is 3 files with 10,000 lines each
@zodern/source-maps - medium with lineCount x 2,071,118 ops/sec ±0.40% (94 runs sampled)
@zodern/source-maps - medium x 2,853 ops/sec ±0.30% (101 runs sampled)
@parcel/source-map - medium x 690 ops/sec ±0.66% (96 runs sampled)

# Large is 3 files with 1,000,000 lines each
@zodern/source-maps - large with lineCount x 1,657,165 ops/sec ±0.36% (100 runs sampled)
@zodern/source-maps - large x 28.66 ops/sec ±0.27% (52 runs sampled)
@parcel/source-map - large x 6.89 ops/sec ±3.88% (22 runs sampled)
```

Concatenating source maps for 3 small files:

```
@zodern/source-maps x 12,191 ops/sec ±0.17% (99 runs sampled)
@zodern/source-maps CombinedFile x 10,400 ops/sec ±0.21% (100 runs sampled)
@parcel/source-map x 2,829 ops/sec ±0.34% (99 runs sampled)
source-map x 2,359 ops/sec ±0.25% (90 runs sampled)
```

Concatenating source maps for 3 copies of three.js:
```
@zodern/source-maps x 243 ops/sec ±0.36% (90 runs sampled)
@zodern/source-maps CombinedFile x 129 ops/sec ±1.48% (84 runs sampled)
@parcel/source-map x 22.33 ops/sec ±0.56% (41 runs sampled)
source-map x 14.07 ops/sec ±3.36% (70 runs sampled)
```

### Downsides

- The names array and other parts of the source map are not deduplicated, which could result in a larger source map. However, sometimes the mappings are smaller which helps to counteract that.
- input index maps are currently not supported, though it wouldn't be difficult to add.
- A column offset for the input source maps is currently not supported. Each file is assumed to start at the beginning of a new line.
- The source map can not be adjusted, beyond adding new input source maps. We could support this, but it would be difficult to keep the same performance.
- The input source maps must be added in order from the top of the file down

### API

#### class SourceMap

Constructor has no parameters.

```js
const SourceMap = require('@zodern/source-maps');
const map = new SourceMap();
```

#### map.addEmptyMap

```js
map.addEmptyMap(source, content, line);
map.addEmptyMap(source, content, line, lineCount);
map.addEmptyMap('/ui/button.js', 'export const button = HTMLButtonElement', 2);
```

Generates a source map for an unmodified file, creating one mapping for each line.

The most expensive part of this function is counting the lines in the content. If the calling code already knows how many lines there are, then it can be passed as the lineCount.

#### map.addMap

```js
map.addMap(sourceMap);
map.addMap(sourceMap, line);
```

Adds an input source map to concat to the output source map. Maps must be added in order from top of the generated file to the bottom, and should not overlap each other.

#### map.build

```js
map.build();
```

Returns the output source map.

#### class CombinedFile

Handles concatenating both the source maps and code.

```js
const { CombinedFile } = require('@zodern/source-maps');

const file = new CombinedFile(); 
```

#### file.addGeneratedCode

```js
file.addGeneratedCode(code);
file.addGeneratedCode('// File created on\n');
```

Adds code to the file, without generating a source map for it.

#### file.addCodeWithMap

```js
// map, header, and footer are all optional
file.addCodeWithMap(sourceName, { code, map, header, footer });
file.addCodeWithMap(sourceName, { code });
file.addCodeWithMap(sourceName, { code, header });
file.addCodeWithMap('/explore.js', { code: 'console.log("explore.js");', header: '//\n// explore.js\n//\n' });
```

Adds an input file to be concatenated. Both the sourceName (file's path), and code is required. If there is no source map, one will be generated. The header and footer, if provided, are added as generated code.

Any previously added code must end on a new line - the source maps are added/generated expecting the code to start at the beginning of a line.

#### file.build

```
file.build();
```

Returns an object with `{ code, map }`.
