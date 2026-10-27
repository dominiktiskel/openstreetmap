'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const oa = require('../../stream/openaddresses_house_numbers');

module.exports.tests = {};

module.exports.tests.normalize = (test) => {
  test('CHAPEL ST matches Chapel Street', (t) => {
    t.equal(oa.normalizeStreetName('CHAPEL ST'), 'chapel street');
    t.equal(oa.normalizeStreetName('Chapel Street'), 'chapel street');
    t.equal(oa.normalizeStreetName('CHAPEL ST'), oa.normalizeStreetName('Chapel Street'));
    t.end();
  });

  test('leading directional and suffix expand together', (t) => {
    t.equal(oa.normalizeStreetName('E MAIN ST'), 'east main street');
    t.equal(oa.displayStreetName('E MAIN ST'), 'East Main Street');
    t.end();
  });

  test('name without a USPS suffix is left unchanged apart from case', (t) => {
    t.equal(oa.normalizeStreetName('Marszałkowska'), 'marszałkowska');
    t.equal(oa.displayStreetName('Marszałkowska'), 'Marszałkowska');
    t.end();
  });

  test('St at the start of a name is not treated as Street', (t) => {
    t.equal(oa.normalizeStreetName('St John Street'), 'st john street');
    t.end();
  });
};

module.exports.tests.merge = (test) => {
  test('OA abbreviation joins the OSM street and keeps the OSM name', (t) => {
    const key = 'chapel street|new haven|41.3|-72.9';
    const aggregates = new Map();
    aggregates.set(key, {
      numbers: [
        { num: '29', lat: 41.31, lon: -72.93, zip: '06510' },
        { num: '165', lat: 41.31, lon: -72.92, zip: '06510' }
      ],
      centroid: { lat: 82.62, lon: -145.85, count: 2 },
      streetName: 'Chapel Street',
      zip: '06510',
      osmAdmin: { locality: 'New Haven', region: 'Connecticut', country: 'United States' }
    });
    const index = oa.buildMatchIndex(aggregates);

    const status = oa.applyOpenAddressPoint(aggregates, index, {
      number: '170',
      street: 'CHAPEL ST',
      lat: 41.308,
      lon: -72.925,
      zip: '06510',
      locality: 'New Haven',
      region: 'Connecticut',
      country: 'United States'
    });

    t.equal(status, 'merged');
    t.equal(aggregates.size, 1);
    const aggregate = aggregates.get(key);
    t.equal(aggregate.streetName, 'Chapel Street');
    const added = aggregate.numbers.find((item) => item.num === '170');
    t.equal(added.listOnly, true);
    t.equal(oa.emitsAddressDocument(added), false);
    t.equal(oa.emitsAddressDocument(aggregate.numbers[0]), true);
    t.equal(aggregate.numbers.map((item) => item.num).join(','), '29,165,170');
    t.end();
  });

  test('a number already on the OSM street is not marked listOnly', (t) => {
    const key = 'alabama street|new haven|41.3|-72.9';
    const aggregates = new Map();
    aggregates.set(key, {
      numbers: [{ num: '145', lat: 41.31, lon: -72.93, zip: '06510' }],
      centroid: { lat: 41.31, lon: -72.93, count: 1 },
      streetName: 'Alabama Street',
      zip: '06510',
      osmAdmin: { locality: 'New Haven' }
    });
    const index = oa.buildMatchIndex(aggregates);
    const status = oa.applyOpenAddressPoint(aggregates, index, {
      number: '145',
      street: 'ALABAMA ST',
      lat: 41.31,
      lon: -72.93,
      locality: 'New Haven'
    });
    t.equal(status, 'duplicate');
    t.equal(aggregates.get(key).numbers.length, 1);
    t.equal(aggregates.get(key).numbers[0].listOnly, undefined);
    t.equal(oa.emitsAddressDocument(aggregates.get(key).numbers[0]), true);
    t.end();
  });

  test('a street that exists only in OA becomes one street document source', (t) => {
    const aggregates = new Map();
    const index = oa.buildMatchIndex(aggregates);
    const first = oa.applyOpenAddressPoint(aggregates, index, {
      number: '13',
      street: 'CHESTER ST',
      lat: 41.291,
      lon: -72.890,
      zip: '06513',
      locality: 'New Haven',
      region: 'Connecticut',
      country: 'United States'
    });
    const second = oa.applyOpenAddressPoint(aggregates, index, {
      number: '15',
      street: 'Chester Street',
      lat: 41.292,
      lon: -72.891,
      zip: '06513',
      locality: 'New Haven'
    });

    t.equal(first, 'created');
    t.equal(second, 'merged');
    t.equal(aggregates.size, 1);
    const aggregate = aggregates.values().next().value;
    t.equal(aggregate.streetName, 'Chester Street');
    t.equal(aggregate.numbers.length, 2);
    t.equal(oa.emitsAddressDocument(aggregate.numbers[0]), false);
    t.equal(oa.emitsAddressDocument(aggregate.numbers[1]), false);
    t.end();
  });
};

module.exports.tests.leveldb = (test) => {
  test('mergeOpenAddresses writes the union back to LevelDB', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-oa-'));
    const dbPath = path.join(dir, 'streets');
    const filePath = path.join(dir, 'city.geojson');
    const { Level } = require('level');

    const db = new Level(dbPath, { valueEncoding: 'json' });
    await db.open();
    await db.put('alabama street|new haven|41.3|-72.9', {
      numbers: [
        { num: '25', lat: 41.31, lon: -72.92, zip: '06511' },
        { num: '145', lat: 41.31, lon: -72.93, zip: '06511' },
        { num: '165', lat: 41.31, lon: -72.94, zip: '06511' }
      ],
      centroid: { lat: 123.93, lon: -218.79, count: 3 },
      streetName: 'Alabama Street',
      zip: '06511',
      osmAdmin: { locality: 'New Haven', region: 'Connecticut', country: 'United States' }
    });
    await db.close();

    fs.writeFileSync(filePath, [
      JSON.stringify({
        type: 'Feature',
        properties: { number: '170', street: 'ALABAMA ST', postcode: '06511', city: 'NEW HAVEN' },
        geometry: { type: 'Point', coordinates: [-72.93, 41.31] }
      }),
      JSON.stringify({
        type: 'Feature',
        properties: { number: '25', street: 'ALABAMA ST', postcode: '06511', city: 'NEW HAVEN' },
        geometry: { type: 'Point', coordinates: [-72.92, 41.31] }
      })
    ].join('\n'));

    const stats = await oa.mergeOpenAddresses({
      dbPath: dbPath,
      filePaths: [filePath],
      lookup: async () => ({
        locality: [{ name: 'New Haven' }],
        region: [{ name: 'Connecticut' }],
        country: [{ name: 'United States' }]
      })
    });

    t.equal(stats.merged, 1);
    t.equal(stats.duplicate, 1);
    t.equal(stats.created, 0);

    const check = new Level(dbPath, { valueEncoding: 'json' });
    await check.open();
    const stored = await check.get('alabama street|new haven|41.3|-72.9');
    await check.close();
    t.equal(stored.streetName, 'Alabama Street');
    t.equal(stored.numbers.map((item) => item.num).join(','), '25,145,165,170');
    const extra = stored.numbers.find((item) => item.num === '170');
    t.equal(extra.listOnly, true);
    t.equal(oa.emitsAddressDocument(extra), false);

    fs.rmSync(dir, { recursive: true, force: true });
    t.end();
  });
};

module.exports.all = (tape) => {
  function test(name, testFunction) {
    return tape('openaddresses house numbers: ' + name, testFunction);
  }

  for (const testCase in module.exports.tests) {
    module.exports.tests[testCase](test);
  }
};
