const through = require('through2');
const tape = require('tape');
const Document = require('pelias-model').Document;
const stream = require('../../stream/osm_admin_extractor');

function test_stream(input, testedStream, callback) {
  const input_stream = through.obj();
  const destination_stream = through.obj(callback);

  input_stream
    .pipe(testedStream)
    .pipe(destination_stream);

  input.forEach(function(doc) {
    input_stream.write(doc);
  });

  input_stream.end();
}

tape('osm_admin_extractor: test stream', function(t) {
  const extractor = stream();
  t.ok(extractor, 'stream created');
  t.end();
});

tape('osm_admin_extractor: document with addr:city', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    city: 'Kraków',
    street: 'Grodzka'
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.locality[0], 'Kraków', 'locality set from OSM city');
    t.true(Array.isArray(actual.getMeta('osmAdminFields')), 'osmAdminFields metadata set');
    t.true(actual.getMeta('osmAdminFields').includes('locality'), 'locality in osmAdminFields');
    t.end();
  });
});

tape('osm_admin_extractor: document with addr:state', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    state: 'Lesser Poland'
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.region[0], 'Lesser Poland', 'region set from OSM state');
    t.true(actual.getMeta('osmAdminFields').includes('region'), 'region in osmAdminFields');
    t.end();
  });
});

tape('osm_admin_extractor: document with addr:country', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    country: 'Poland'
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.country[0], 'Poland', 'country set from OSM country');
    t.true(actual.getMeta('osmAdminFields').includes('country'), 'country in osmAdminFields');
    t.end();
  });
});

tape('osm_admin_extractor: document with all admin fields', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    city: 'Kraków',
    state: 'Lesser Poland',
    country: 'Poland'
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.locality[0], 'Kraków', 'locality set');
    t.equal(actual.parent.region[0], 'Lesser Poland', 'region set');
    t.equal(actual.parent.country[0], 'Poland', 'country set');
    
    const osmFields = actual.getMeta('osmAdminFields');
    t.equal(osmFields.length, 3, 'all three fields in osmAdminFields');
    t.true(osmFields.includes('locality'), 'locality in osmAdminFields');
    t.true(osmFields.includes('region'), 'region in osmAdminFields');
    t.true(osmFields.includes('country'), 'country in osmAdminFields');
    t.end();
  });
});

tape('osm_admin_extractor: document without admin tags passes through', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    street: 'Main Street',
    number: '123'
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.false(actual.parent.locality, 'no locality set');
    t.false(actual.parent.region, 'no region set');
    t.false(actual.parent.country, 'no country set');
    t.false(actual.getMeta('osmAdminFields'), 'no osmAdminFields metadata');
    t.end();
  });
});

tape('osm_admin_extractor: document with empty admin values', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    city: '',
    state: '   ',
    country: null
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.false(actual.parent.locality, 'no locality set for empty value');
    t.false(actual.parent.region, 'no region set for whitespace value');
    t.false(actual.parent.country, 'no country set for null value');
    t.false(actual.getMeta('osmAdminFields'), 'no osmAdminFields metadata');
    t.end();
  });
});

tape('osm_admin_extractor: document with partial admin data', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    city: 'Kraków',
    country: 'Poland'
    // state is missing
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.locality[0], 'Kraków', 'locality set');
    t.equal(actual.parent.country[0], 'Poland', 'country set');
    t.false(actual.parent.region, 'region not set when missing');
    
    const osmFields = actual.getMeta('osmAdminFields');
    t.equal(osmFields.length, 2, 'two fields in osmAdminFields');
    t.true(osmFields.includes('locality'), 'locality in osmAdminFields');
    t.true(osmFields.includes('country'), 'country in osmAdminFields');
    t.false(osmFields.includes('region'), 'region not in osmAdminFields');
    t.end();
  });
});

tape('osm_admin_extractor: trims whitespace from values', function(t) {
  const doc = new Document('openstreetmap', 'venue', '1');
  doc.setCentroid({ lat: 50.0, lon: 19.0 });
  doc.address_parts = {
    city: '  Kraków  ',
    state: '\tLesser Poland\n',
    country: ' Poland '
  };

  test_stream([doc], stream(), function(err, actual) {
    t.false(err, 'no error');
    t.equal(actual.parent.locality[0], 'Kraków', 'locality trimmed');
    t.equal(actual.parent.region[0], 'Lesser Poland', 'region trimmed');
    t.equal(actual.parent.country[0], 'Poland', 'country trimmed');
    t.end();
  });
});

