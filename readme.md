# concat-source-maps

Very fast library to concat source maps. Generally at least 3x faster than other source map libraries.

```
npm install concat-source-maps
```

```js
const SourceMap = require('concat-source-maps');
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

#### benchmark

Generating empty source maps (small is 10 line files, medium is 10,000 line files, and large is 1,000,000 line files).
Larger is better.
```
concat-source-maps - small with lineCount x 3,527,239 ops/sec ±0.30% (92 runs sampled)
concat-source-maps - small x 1,385,932 ops/sec ±0.36% (93 runs sampled)
@parcel/source-map - small x 222,989 ops/sec ±0.39% (95 runs sampled)

concat-source-maps - medium with lineCount x 2,071,118 ops/sec ±0.40% (94 runs sampled)
concat-source-maps - medium x 2,853 ops/sec ±0.30% (101 runs sampled)
@parcel/source-map - medium x 690 ops/sec ±0.66% (96 runs sampled)

concat-source-maps - large with lineCount x 1,657,165 ops/sec ±0.36% (100 runs sampled)
concat-source-maps - large x 28.66 ops/sec ±0.27% (52 runs sampled)
@parcel/source-map - large x 6.89 ops/sec ±3.88% (22 runs sampled)
```

Concatenating source maps for 3 small files:

```
concat-source-maps x 12,740 ops/sec ±0.37% (96 runs sampled)
@parcel/source-map x 2,793 ops/sec ±0.36% (97 runs sampled)
source-map x 2,284 ops/sec ±0.73% (89 runs sampled)
```

Concatenating source maps for 3 copies of three.js:
```
concat-source-maps x 258 ops/sec ±0.32% (88 runs sampled)
@parcel/source-map x 23.76 ops/sec ±0.45% (44 runs sampled)
source-map x 14.12 ops/sec ±3.76% (70 runs sampled)
```

### Downsides?

- The names array and other parts of the source map are not deduplicated, which could result in a larger source map. However, sometimes the mappings are smaller which helps to counteract that.
- input index maps are currently not supported, though it wouldn't be difficult to add.
- A column offset for the input source maps is currently not supported. Each file is assumed to start at the beginning of a new line.
- The source map can not be adjusted, beyond adding new input source maps. We could support this, but it would be difficult to keep the same performance.
- The input source maps must be added in order from the top of the file down

### API

#### class SourceMap

Constructor has no parameters.

```js
const SourceMap = require('concat-source-maps');
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
