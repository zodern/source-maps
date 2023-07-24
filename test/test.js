const SourceMap = require('../index.js');
const assert = require('assert');

describe('single input map', () => {
  it('should leave mappings as is', () => {
    let inputMappings = 'AAAA;ACAA;';
    let input = { mappings: inputMappings, sources: ['a'], sourcesContent: ['a'] };
    let sm = new SourceMap();
    sm.addMap(input);
    const map = sm.build();
    assert.deepStrictEqual(map, {
      mappings: inputMappings,
      names: [],
      sources: ['a'],
      sourcesContent: ['a'],
      version: 3
    });
  });

  it('should offset by line', () => {
    let input = 'AAAA;ACAA;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] }, 3);
    const { mappings } = sm.build();
    assert.equal(';;;AAAA;ACAA;', mappings);
  });

  it('should handle multiple mappings on one line', () => {
    let input = 'AAAA,CCAA;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] }, 3);
    const { mappings } = sm.build();
    assert.equal(';;;AAAA,CCAA;', mappings);
  });

  it('should handle empty lines in middle of mappings', () => {
    let input = 'AAAA;;;;;CCAA';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] }, 0);
    const { mappings } = sm.build();
    assert.equal('AAAA;;;;;CCAA', mappings);
  });
  it('should handle first mappings with only a generated col', () => {
    let input = 'C,C,C,C,CAAA;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] }, 0);
    const { mappings } = sm.build();
    assert.equal('C,C,C,C,CAAA;', mappings);
  });
  it('should handle modifying separate names mapping', () => {
    let input = 'C,C,C,C,CAAA,AAAAC;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['a'] }, 0);
    const { mappings } = sm.build();
    assert.equal('C,C,C,C,CAAA,AAAAC;', mappings);
  });
});

describe('two input maps', () => {
  it('should concatenate', () => {
    let input = 'AAAA;AACA;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] });
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'] }, 5);
    const map = sm.build();
    assert.deepStrictEqual(map, {
      mappings: 'AAAA;AACA;;;;ACDA;AACA;',
      sources: ['a', 'a'],
      sourcesContent: ['a', 'a'],
      names: [],
      version: 3
    });
  });

  it('should handle names', () => {
    let input = 'AAAAA;AACA;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['b'] });
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['b'] }, 5);
    const { mappings } = sm.build();
    assert.equal('AAAAA;AACA;;;;ACDAC;AACA;', mappings);
  });
  it('should handle multiple names', () => {
    let input = 'AAAAA,MAAM,CAACC,MAAM;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['a', 'b'] });
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['c', 'd'] }, 5);
    const map = sm.build();
    assert.deepStrictEqual(map, {
      mappings: 'AAAAA,MAAM,CAACC,MAAM;;;;;ACAbC,MAAM,CAACC,MAAM;',
      sources: ['a', 'a'],
      sourcesContent: ['a', 'a'],
      names: ['a', 'b', 'c', 'd'],
      version: 3
    });
  });
});

describe('three input maps', () => {
  it('should account for adjustments made to second map', () => {
    let input = 'AAAAA,MAAM,CAACC,MAAM;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['a', 'b'] });
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['c', 'd'] }, 5);
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['c', 'd'] }, 6);
    const map = sm.build();

    assert.deepStrictEqual(map, {
      mappings: 'AAAAA,MAAM,CAACC,MAAM;;;;;ACAbC,MAAM,CAACC,MAAM;ACAbC,MAAM,CAACC,MAAM;',
      sources: ['a', 'a', 'a'],
      sourcesContent: ['a', 'a', 'a'],
      names: ['a', 'b', 'c', 'd', 'c', 'd'],
      version: 3
    });
  });
  it('should account for adjustments made to separate name', () => {
    let input = 'AAAA,MAAMA,CAACC,MAAM;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['a', 'b'] });
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['c', 'd'] }, 5);
    sm.addMap({ mappings: input, sources: ['a'], sourcesContent: ['a'], names: ['c', 'd'] }, 6);
    const { mappings } = sm.build();

    assert.equal('AAAA,MAAMA,CAACC,MAAM;;;;;ACAb,MAAMC,CAACC,MAAM;ACAb,MAAMC,CAACC,MAAM;', mappings);
  });
});

describe('emptyMap', () => {
  it('should generate empty map', () => {
    let sm = new SourceMap();
    sm.addEmptyMap('test.js', '\n\n\n\n\n', 5);
    const map = sm.build();
    assert.deepStrictEqual(map, {
      mappings: ';;;;;AAAA;AACA;AACA;AACA;AACA;',
      sources: ['test.js'],
      sourcesContent: ['\n\n\n\n\n'],
      names: [],
      version: 3
    });
  });

  it('should reset with first mapping', () => {
    let input = 'AAAA,MAMAA,CAACC,MAAM;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a', 'b'], sourcesContent: ['a', 'b'], names: ['a', 'b'] });
    sm.addEmptyMap('test.js', '\n\n\n', 2);
    const { mappings } = sm.build();

    assert.equal(mappings, 'AAAA,MAMAA,CAACC,MAAM;;AENP;AACA;AACA;')
  });
  it('should update last values', () => {
    let input = 'AAAA,MAMAA,CAACC,MAAM;';
    let sm = new SourceMap();
    sm.addMap({ mappings: input, sources: ['a', 'b'], sourcesContent: ['a', 'b'], names: ['a', 'b'] });
    sm.addEmptyMap('test.js', '\n\n\n', 2);
    sm.addEmptyMap('test.js', '\n\n\n', 6);
    const { mappings } = sm.build();

    assert.equal(mappings, 'AAAA,MAMAA,CAACC,MAAM;;AENP;AACA;AACA;;ACFA;AACA;AACA;')
  });
});

describe('CombinedFile', () => {
  it('should support only generated code', () => {
    let file = new SourceMap.CombinedFile();
    file.addGeneratedCode('test\ntest2\nhello');
    let out = file.build();
    assert.deepStrictEqual(out, { code: 'test\ntest2\nhello', map: null });
  });

  it('should support single file with map', () => {
    let file = new SourceMap.CombinedFile();
    file.addGeneratedCode('test');
    file.addGeneratedCode('\n');
    file.addCodeWithMap('/test.js', {
      code: 'var i = 0;\ni++\n;',
      map: {
        mappings: 'AAAA;AACA;ACFA;',
        sources: ['/input.js']
      },
      header: '// test.js\n\n',
      footer: '// end\n'
    });

    let out = file.build();
    assert.deepStrictEqual(out, {
      code: 'test\n// test.js\n\nvar i = 0;\ni++\n;// end\n',
      map: {
        mappings: ';;;AAAA;AACA;ACFA;',
        sources: ['/input.js']
      }
    });
  });

  it('should support single file without map', () => {
    let file = new SourceMap.CombinedFile();
    file.addGeneratedCode('test');
    file.addGeneratedCode('\n');
    file.addCodeWithMap('/test.js', {
      code: 'var i = 0;\ni++\n;',
      header: '// test.js\n\n',
      footer: '// end\n'
    });

    let out = file.build();
    assert.deepStrictEqual(out, {
      code: 'test\n// test.js\n\nvar i = 0;\ni++\n;// end\n',
      map: {
        names: [],
        mappings: ';;;AAAA;AACA;AACA;',
        sources: ['/test.js'],
        sourcesContent: ['var i = 0;\ni++\n;'],
        version: 3
      }
    });
  });
});
