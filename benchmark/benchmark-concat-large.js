const Benchmark = require('benchmark');
const ParcelSourceMap = require('@parcel/source-map').default;
const ConcatSourceMap = require('../');
const fs = require('node:fs');
const sourcemap = require('source-map');

const largeLineCount = fs.readFileSync('./three.js', 'utf-8').split('\n').length;
const largeMap = JSON.parse(fs.readFileSync('./three.js.map', 'utf-8'));

new Benchmark.Suite()
  .add('@parcel/source-map', function () {
    let map = new ParcelSourceMap();
    map.addVLQMap(largeMap, 0);
    map.addVLQMap(largeMap, largeLineCount * 1 + 1);
    map.addVLQMap(largeMap, largeLineCount * 2 + 2);
    map.addVLQMap(largeMap, largeLineCount * 3 + 3);
    map.toVLQ();
  })
  .add('concat-source-maps', function () {
    let map = new ConcatSourceMap();
    map.addMap(largeMap, largeLineCount * 1 + 1);
    map.addMap(largeMap, largeLineCount * 2 + 2);
    map.addMap(largeMap, largeLineCount * 3 + 3);
    map.build();
  })
  .add('source-map', {
    defer: true,
    fn: async (defer) => {
      const sourcemapConsumer1 = await new sourcemap.SourceMapConsumer(largeMap);
      const sourcemapConsumer2 = await new sourcemap.SourceMapConsumer(largeMap);
      const sourcemapConsumer3 = await new sourcemap.SourceMapConsumer(largeMap);
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
