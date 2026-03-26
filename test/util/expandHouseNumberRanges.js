const expandHouseNumberRanges = require('../../util/expandHouseNumberRanges');

module.exports.tests = {};

// test exports
module.exports.tests.smoke = function (test, common) {
  test('interface', t => {
    t.equal(typeof expandHouseNumberRanges, 'function', 'function');
    t.end();
  });
};

module.exports.tests.invalid = function (test, common) {
  test('invalid input', t => {
    t.deepEqual(expandHouseNumberRanges(1), []);
    t.deepEqual(expandHouseNumberRanges(['a']), []);
    t.deepEqual(expandHouseNumberRanges([{'a': 'b'}]), []);
    t.deepEqual(expandHouseNumberRanges(undefined), []);
    t.deepEqual(expandHouseNumberRanges(null), []);
    t.deepEqual(expandHouseNumberRanges(''), []);
    t.deepEqual(expandHouseNumberRanges('  '), []);
    t.end();
  });
};

module.exports.tests.separators = function (test, common) {
  test('semicolon separator', t => {
    t.deepEqual(expandHouseNumberRanges('10;12'), ['10', '12']);
    t.deepEqual(expandHouseNumberRanges('10;12;14'), ['10', '12', '14']);
    t.deepEqual(expandHouseNumberRanges(' 10 ; 12 ; 14 '), ['10', '12', '14']);
    t.end();
  });

  test('slash separator', t => {
    t.deepEqual(expandHouseNumberRanges('10/12'), ['10', '12']);
    t.deepEqual(expandHouseNumberRanges('10/12/14'), ['10', '12', '14']);
    t.deepEqual(expandHouseNumberRanges(' 10 / 12 '), ['10', '12']);
    t.end();
  });

  test('comma separator', t => {
    t.deepEqual(expandHouseNumberRanges('10,12'), ['10', '12']);
    t.deepEqual(expandHouseNumberRanges('10,12,14'), ['10', '12', '14']);
    t.end();
  });

  test('mixed separators', t => {
    t.deepEqual(expandHouseNumberRanges('10;12/14'), ['10', '12', '14']);
    t.deepEqual(expandHouseNumberRanges('10,12;14'), ['10', '12', '14']);
    t.end();
  });
};

module.exports.tests.smallRanges = function (test, common) {
  test('small ranges - all numbers included', t => {
    // Range of 2 (10-11)
    t.deepEqual(expandHouseNumberRanges('10-11'), ['10', '11']);
    
    // Range of 3 (10-12)
    t.deepEqual(expandHouseNumberRanges('10-12'), ['10', '11', '12']);
    
    // Range of 4 (10-13)
    t.deepEqual(expandHouseNumberRanges('10-13'), ['10', '11', '12', '13']);
    
    // Range of 5 (10-14)
    t.deepEqual(expandHouseNumberRanges('10-14'), ['10', '11', '12', '13', '14']);
    
    t.end();
  });
};

module.exports.tests.largeRanges = function (test, common) {
  test('large even ranges - parity respected', t => {
    // Range of 9: 10-18 (even start)
    t.deepEqual(expandHouseNumberRanges('10-18'), ['10', '12', '14', '16', '18']);
    
    // Range of 11: 10-20 (even start)
    t.deepEqual(expandHouseNumberRanges('10-20'), ['10', '12', '14', '16', '18', '20']);
    
    // Range of 21: 100-120 (even start)
    t.deepEqual(expandHouseNumberRanges('100-120'), ['100', '102', '104', '106', '108', '110', '112', '114', '116', '118', '120']);
    
    t.end();
  });

  test('large odd ranges - parity respected', t => {
    // Range of 9: 11-19 (odd start)
    t.deepEqual(expandHouseNumberRanges('11-19'), ['11', '13', '15', '17', '19']);
    
    // Range of 11: 11-21 (odd start)
    t.deepEqual(expandHouseNumberRanges('11-21'), ['11', '13', '15', '17', '19', '21']);
    
    // Range of 21: 101-121 (odd start)
    t.deepEqual(expandHouseNumberRanges('101-121'), ['101', '103', '105', '107', '109', '111', '113', '115', '117', '119', '121']);
    
    t.end();
  });
};

module.exports.tests.suffixedRanges = function (test, common) {
  test('ranges with same suffix', t => {
    // Small range with suffix
    t.deepEqual(expandHouseNumberRanges('10a-12a'), ['10a', '11a', '12a']);
    
    // Large range with suffix (parity respected)
    t.deepEqual(expandHouseNumberRanges('10a-18a'), ['10a', '12a', '14a', '16a', '18a']);
    
    t.end();
  });

  test('ranges with different suffixes', t => {
    // Only start and end keep their suffixes
    t.deepEqual(expandHouseNumberRanges('10a-12b'), ['10a', '11', '12b']);
    
    t.end();
  });
};

module.exports.tests.mixed = function (test, common) {
  test('ranges mixed with separators', t => {
    // Range + semicolon
    t.deepEqual(expandHouseNumberRanges('10-14;20'), ['10', '11', '12', '13', '14', '20']);
    
    // Multiple ranges
    t.deepEqual(expandHouseNumberRanges('10-12;20-22'), ['10', '11', '12', '20', '21', '22']);
    
    // Range + slash + individual
    t.deepEqual(expandHouseNumberRanges('10-12/15'), ['10', '11', '12', '15']);
    
    t.end();
  });
};

module.exports.tests.edgeCases = function (test, common) {
  test('invalid ranges', t => {
    // Reversed range (start > end)
    t.deepEqual(expandHouseNumberRanges('20-10'), ['20-10']); // Kept as-is
    
    // Same number
    t.deepEqual(expandHouseNumberRanges('10-10'), ['10-10']); // Kept as-is
    
    // Non-numeric ranges
    t.deepEqual(expandHouseNumberRanges('a-z'), ['a-z']); // Kept as-is
    
    t.end();
  });

  test('deduplication', t => {
    // Duplicate values removed
    t.deepEqual(expandHouseNumberRanges('10;10;10'), ['10']);
    t.deepEqual(expandHouseNumberRanges('10-12;11'), ['10', '11', '12']);
    
    t.end();
  });

  test('whitespace handling', t => {
    t.deepEqual(expandHouseNumberRanges(' 10 - 12 '), ['10', '11', '12']);
    t.deepEqual(expandHouseNumberRanges('  10 ; 12  '), ['10', '12']);
    
    t.end();
  });
};

module.exports.tests.realWorld = function (test, common) {
  test('real-world OSM examples', t => {
    // From the bug report: aleja Akacjowa 10-12, Wrocław
    t.deepEqual(expandHouseNumberRanges('10-12'), ['10', '11', '12']);
    
    // Large ranges with parity
    t.deepEqual(expandHouseNumberRanges('1-21'), ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21']);
    t.deepEqual(expandHouseNumberRanges('2-22'), ['2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22']);
    
    // Complex mixed
    t.deepEqual(expandHouseNumberRanges('10-14;16/18;20'), ['10', '11', '12', '13', '14', '16', '18', '20']);
    
    t.end();
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('expandHouseNumberRanges: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};

