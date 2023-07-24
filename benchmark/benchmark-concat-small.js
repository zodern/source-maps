const Benchmark = require('benchmark');
const ParcelSourceMap = require('@parcel/source-map').default;
const ConcatSourceMap = require('../');
const fs = require('node:fs');
const sourcemap = require('source-map');

const smallLineCount = fs.readFileSync('./small.js', 'utf-8').split('\n').length;
const smallMap = JSON.parse(fs.readFileSync('./small.js.map', 'utf-8'));

new Benchmark.Suite()
  .add('@parcel/source-map', function () {
    let map = new ParcelSourceMap();
    map.addVLQMap(smallMap, 0);
    map.addVLQMap(smallMap, smallLineCount * 1 + 1);
    map.addVLQMap(smallMap, smallLineCount * 2 + 2);
    map.addVLQMap(smallMap, smallLineCount * 3 + 3);
    map.toVLQ();
  })
  .add('concat-source-maps', function () {
    let map = new ConcatSourceMap();
    map.addMap(smallMap, smallLineCount * 1 + 1);
    map.addMap(smallMap, smallLineCount * 2 + 2);
    map.addMap(smallMap, smallLineCount * 3 + 3);
    map.build();
  })
  .add('source-map', {
    defer: true,
    fn: async (defer) => {
      const sourcemapConsumer1 = await new sourcemap.SourceMapConsumer(smallMap);
      const sourcemapConsumer2 = await new sourcemap.SourceMapConsumer(smallMap);
      const sourcemapConsumer3 = await new sourcemap.SourceMapConsumer(smallMap);
      let chunk1 = sourcemap.SourceNode.fromStringWithSourceMap(
        '',
        sourcemapConsumer1,
      );
      let chunk2 = sourcemap.SourceNode.fromStringWithSourceMap(
        '',
        sourcemapConsumer2,
      );
      let chunk3 = sourcemap.SourceNode.fromStringWithSourceMap(
        '',
        sourcemapConsumer3,
      );
      let chunk = new sourcemap.SourceNode(null, null, null, [chunk1, chunk2, chunk3]);
      sourcemapConsumer1.destroy();
      sourcemapConsumer2.destroy();
      sourcemapConsumer3.destroy();
      chunk.toStringWithSourceMap({
        file: '/app.js',
      });
      defer.resolve();
    }
  })
  .on('cycle', function (event) {
    if (event.target.error) {
      throw event.target.error;
    }
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true })
