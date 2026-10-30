const {
  ES_ID_MAX_BYTES,
  collapseRepeatedPhrase,
  fitSourceId
} = require('../../util/bounded_source_id');

module.exports.tests = {};

module.exports.tests.collapse = function(test) {
  test('collapse: phrase glued without a space between copies', function(t) {
    const once = 'вулиця капітана шаповала';
    t.equal(collapseRepeatedPhrase(once + once + once), once);
    t.end();
  });

  test('collapse: phrase repeated with spaces between copies', function(t) {
    const once = 'вулиця капітана шаповала';
    t.equal(collapseRepeatedPhrase(`${once} ${once}`), once);
    t.end();
  });

  test('collapse: ordinary name is unchanged', function(t) {
    t.equal(collapseRepeatedPhrase('бул. Витоша'), 'бул. Витоша');
    t.end();
  });
};

module.exports.tests.fit = function(test) {
  test('fit: short id is unchanged', function(t) {
    const id = 'address_бул_витоша_37_42.690000_23.320000';
    const fitted = fitSourceId('address', id);
    t.equal(fitted.truncated, false);
    t.equal(fitted.id, id);
    t.end();
  });

  test('fit: repeated street name stays within the elasticsearch id limit', function(t) {
    const once = 'вулиця_капітана_шаповала';
    const id = `address_${once.repeat(12)}_76_49.468151_37.378801`;
    const fitted = fitSourceId('address', id);
    const gid = `openstreetmap:address:${fitted.id}`;
    t.equal(fitted.truncated, true);
    t.ok(Buffer.byteLength(gid, 'utf8') <= ES_ID_MAX_BYTES);
    t.notEqual(fitted.id, id);
    t.end();
  });
};

module.exports.all = function(tape, common) {
  function test(name, testFunction) {
    return tape('bounded_source_id: ' + name, testFunction);
  }
  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
