const Benchmark = require('benchmark');
const ParcelSourceMap = require('@parcel/source-map').default;
const ConcatSourceMap = require('../');
const vlq = require('vlq');

// For comparison, this is a simple implementation that doesn't have to deal
// with input source maps, and is thus 1.3 - 1.6x faster.
class EmptyMapMulti {
  constructor() {
    this.mappings = '';
    this.sources = [];
    this.sourcesContent = [];

    this.lastLine = 0;
    this.lastSourceLine = 0;
  }

  addMap(source, content, lineCount, line) {
    let index = this.sources.push(source);
    this.sourcesContent.push(content);

    if (line < this.lastLine) {
      throw new Error('Maps must be added in order from top to bottom');
    }

    if (this.lastLine < line) {
      this.mappings += ';'.repeat(line - this.lastLine);
    }

    let sourceLineOffset = 0 - this.lastSourceLine;
    let firstMapping = sourceLineOffset === 0 ?
      'AAAA;' :
      `AC${vlq.encode(sourceLineOffset)}A;`;

    if (lineCount > 0) {
      this.mappings += firstMapping;
    }

    if (lineCount > 1) {
      this.mappings += 'AACA;'.repeat(lineCount - 1);
    }

    this.lastSourceLine = lineCount > 0 ? lineCount - 1 : 0;
    this.lastLine = line + lineCount;
  }

  build() {
    return {
      mappings: this.mappings,
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: [],
      version: 3
    }
  }
}

let smallLineCount = 10;
let inputSmall = '\n'.repeat(smallLineCount);
let medLineCount = 10000;
let inputMedium = '\n'.repeat(medLineCount);
let largeLineCount = 1000000;
let inputLarge = '\n'.repeat(largeLineCount);

new Benchmark.Suite()
  .add('@parcel/source-map - small', function (){
    let map = new ParcelSourceMap();
    map.addEmptyMap('test1', inputSmall, 0);
    map.addEmptyMap('test2', inputSmall, smallLineCount * 1 + 1);
    map.addEmptyMap('test3', inputSmall, smallLineCount * 2 + 2);
    map.toVLQ();
  })
  .add('@parcel/source-map - medium', function (){
    let map = new ParcelSourceMap();
    map.addEmptyMap('test1', inputMedium, 0);
    map.addEmptyMap('test2', inputMedium, medLineCount * 1 + 1);
    map.addEmptyMap('test3', inputMedium, medLineCount * 2 + 2);
    map.toVLQ();
  })
  .add('@parcel/source-map - large', function (){
    let map = new ParcelSourceMap();
    map.addEmptyMap('test1', inputLarge, 0);
    map.addEmptyMap('test2', inputLarge, largeLineCount * 1 + 1);
    map.addEmptyMap('test3', inputLarge, largeLineCount * 2 + 2);
    map.toVLQ();
  })
  .add('@zodern/source-maps - small', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputSmall, 0);
    map.addEmptyMap('test2', inputSmall, smallLineCount * 1 + 1);
    map.addEmptyMap('test3', inputSmall, smallLineCount * 2 + 2);
    map.build();
  })
  .add('@zodern/source-maps - medium', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputMedium, 0);
    map.addEmptyMap('test2', inputMedium, medLineCount * 1 + 1);
    map.addEmptyMap('test3', inputMedium, medLineCount * 2 + 2);
    map.build();
  })
  .add('@zodern/source-maps - large', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputLarge, 0);
    map.addEmptyMap('test2', inputLarge, largeLineCount * 1 + 1);
    map.addEmptyMap('test3', inputLarge, largeLineCount * 2 + 2);
    map.build();
  })
  .add('@zodern/source-maps - small with lineCount', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputSmall, 0, smallLineCount);
    map.addEmptyMap('test2', inputSmall, smallLineCount * 1 + 1, smallLineCount);
    map.addEmptyMap('test3', inputSmall, smallLineCount * 2 + 2, smallLineCount);
    map.build();
  })
  .add('@zodern/source-maps - medium with lineCount', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputMedium, 0, medLineCount);
    map.addEmptyMap('test2', inputMedium, medLineCount * 1 + 1, medLineCount);
    map.addEmptyMap('test3', inputMedium, medLineCount * 2 + 2, medLineCount);
    map.build();
  })
  .add('@zodern/source-maps - large with lineCount', function () {
    let map = new ConcatSourceMap();
    map.addEmptyMap('test1', inputLarge, 0, largeLineCount);
    map.addEmptyMap('test2', inputLarge, largeLineCount * 1 + 1, largeLineCount);
    map.addEmptyMap('test3', inputLarge, largeLineCount * 2 + 2, largeLineCount);
    map.build();
  })
  // .add('custom - small', function () {
  //   let map = new EmptyMapMulti();
  //   map.addMap('test1', inputSmall,smallLineCount, 0);
  //   map.addMap('test2', inputSmall,smallLineCount, smallLineCount * 1 + 1);
  //   map.addMap('test3', inputSmall,smallLineCount, smallLineCount * 2 + 2);
  //   map.build();
  // })
  // .add('custom - medium', function () {
  //   let map = new EmptyMapMulti();
  //   map.addMap('test1', inputMedium, medLineCount, 0);
  //   map.addMap('test2', inputMedium, medLineCount, medLineCount * 1 + 1);
  //   map.addMap('test3', inputMedium, medLineCount, medLineCount * 2 + 2);
  //   map.build();
  // })
  // .add('custom - large', function () {
  //   let map = new EmptyMapMulti();
  //   map.addMap('test1', inputLarge, largeLineCount, 0);
  //   map.addMap('test2', inputLarge, largeLineCount, largeLineCount * 1 + 1);
  //   map.addMap('test3', inputLarge, largeLineCount, largeLineCount * 2 + 2);
  //   map.build();
  // })
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
