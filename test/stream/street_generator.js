const tape = require('tape');
const through = require('through2');
const Document = require('pelias-model').Document;
const fs = require('fs');
const path = require('path');
const { Level } = require('level');

// Modules under test
const streetGenerator = require('../../stream/street_generator');
const houseNumbersCollector = require('../../stream/house_numbers_collector');

// Helper to clean up test database
function cleanupTestDb() {
  const dbPath = streetGenerator.DB_PATH;
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

// Helper function to create a test address document
function createAddressDoc(id, houseNumber, street, locality, region, country, lat, lon) {
  const doc = new Document('openstreetmap', 'address', id)
    .setAddress('number', houseNumber)
    .setAddress('street', street)
    .setCentroid({ lat: lat, lon: lon });

  // Set OSM tags
  const tags = {
    'addr:housenumber': houseNumber,
    'addr:street': street
  };
  if (locality) tags['addr:city'] = locality;
  if (region) tags['addr:state'] = region;
  if (country) tags['addr:country'] = country;
  doc.setMeta('tags', tags);

  // Also set parent hierarchy
  if (locality) doc.parent.locality = [locality];
  if (region) doc.parent.region = [region];
  if (country) doc.parent.country = [country];

  return doc;
}

// Helper to populate LevelDB with test data
function populateTestDb(data, callback) {
  cleanupTestDb();
  const db = new Level(streetGenerator.DB_PATH, { valueEncoding: 'json' });
  
  let pending = data.length;
  if (pending === 0) {
    db.close(callback);
    return;
  }

  data.forEach(({ key, value }) => {
    db.put(key, value, (err) => {
      if (err) return callback(err);
      if (--pending === 0) {
        db.close(callback);
      }
    });
  });
}

// Test: Street generator creates correct street document
tape('street_generator: generates street document with correct properties', (test) => {
  const testData = [{
    key: 'testowa|warszawa|50.0|19.0',  // New format: street|locality|lat|lon
    value: {
      numbers: ['1', '2', '3', '10', '22a'],
      centroid: { lat: 150.0, lon: 57.0, count: 3 }, // sum, not average
      streetName: 'Testowa',
      locality: 'Warszawa'
      // Note: region/country removed - will be added by WOF lookup
    }
  }];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 1, 'generated 1 street document');
        
        const street = results[0];
        test.equal(street.getLayer(), 'street', 'correct layer');
        test.equal(street.getSource(), 'openstreetmap', 'correct source');
        test.equal(street.getName('default'), 'testowa', 'correct street name');
        
        // Check centroid (should be average: 150/3 = 50.0, 57/3 = 19.0)
        const centroid = street.getCentroid();
        test.equal(centroid.lat, 50.0, 'correct average latitude');
        test.equal(centroid.lon, 19.0, 'correct average longitude');
        
        // Check addendum
        const addendum = street.getAddendum('osm');
        test.ok(addendum, 'has osm addendum');
        test.equal(addendum.house_numbers, '1,2,3,10,22a', 'correct house numbers list');
        
        test.end();
        cleanupTestDb();
      });

    // Trigger flush to generate streets
    generator.end();
  });
});

// Test: Street generator handles multiple streets
tape('street_generator: generates multiple street documents', (test) => {
  const testData = [
    {
      key: 'akacjowa|zacharzyce|51.0|17.1',  // Coordinates for geographic separation
      value: {
        numbers: ['1', '2', '3'],
        centroid: { lat: 153.0, lon: 51.3, count: 3 },
        streetName: 'Akacjowa',
        locality: 'Zacharzyce'
      }
    },
    {
      key: 'akacjowa|ślęza|51.0|17.0',  // Different coordinates = different street
      value: {
        numbers: ['4', '5', '6'],
        centroid: { lat: 102.0, lon: 34.0, count: 2 },
        streetName: 'Akacjowa',
        locality: 'Ślęza'
      }
    }
  ];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 2, 'generated 2 street documents');
        
        const street1 = results.find(d => d.getName('default') === 'akacjowa' && d.parent.locality && d.parent.locality[0] === 'Zacharzyce');
        const street2 = results.find(d => d.getName('default') === 'akacjowa' && d.parent.locality && d.parent.locality[0] === 'Ślęza');
        
        test.ok(street1, 'found Zacharzyce street');
        test.ok(street2, 'found Ślęza street');
        
        // Verify they have different house numbers
        const addendum1 = street1.getAddendum('osm');
        const addendum2 = street2.getAddendum('osm');
        test.equal(addendum1.house_numbers, '1,2,3', 'Zacharzyce has correct numbers');
        test.equal(addendum2.house_numbers, '4,5,6', 'Ślęza has correct numbers');
        
        test.end();
        cleanupTestDb();
      });

    generator.end();
  });
});

// Test: Street generator with single address
tape('street_generator: handles street with single address', (test) => {
  const testData = [{
    key: 'polna|wrocław|51.1|17.0',
    value: {
      numbers: ['42'],
      centroid: { lat: 51.1079, lon: 17.0385, count: 1 },
      streetName: 'Polna',
      locality: 'Wrocław'
    }
  }];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 1, 'generated 1 street document');
        
        const street = results[0];
        const centroid = street.getCentroid();
        
        // With count=1, average should equal the single value
        test.equal(centroid.lat, 51.1079, 'centroid equals single address lat');
        test.equal(centroid.lon, 17.0385, 'centroid equals single address lon');
        
        const addendum = street.getAddendum('osm');
        test.equal(addendum.house_numbers, '42', 'correct single house number');
        
        test.end();
        cleanupTestDb();
      });

    generator.end();
  });
});

// Test: Street generator skips old array format
tape('street_generator: skips streets in old array format', (test) => {
  const testData = [
    {
      key: 'testowa|warszawa|50.0|20.0',  // Old array format with new key style
      value: ['1', '2', '3'] // Old array format (v1.5.x)
    },
    {
      key: 'nowa|warszawa|50.0|21.0',
      value: {
        numbers: ['4', '5'],
        centroid: { lat: 100.0, lon: 40.0, count: 2 },
        streetName: 'Nowa',
        locality: 'Warszawa'
      }
    }
  ];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 1, 'generated only 1 street (skipped old format)');
        
        const street = results[0];
        test.equal(street.getName('default'), 'nowa', 'generated street from new format');
        
        test.end();
        cleanupTestDb();
      });

    generator.end();
  });
});

// Test: Street generator skips streets without centroid data
tape('street_generator: skips streets without centroid data', (test) => {
  const testData = [
    {
      key: 'badstreet|city|50.0|20.0',
      value: {
        numbers: ['1', '2'],
        centroid: { lat: 0, lon: 0, count: 0 }, // No centroid data
        streetName: 'Badstreet',
        locality: 'City'
      }
    },
    {
      key: 'goodstreet|city|50.0|20.0',
      value: {
        numbers: ['3', '4'],
        centroid: { lat: 50.0, lon: 20.0, count: 1 },
        streetName: 'Goodstreet',
        locality: 'City'
      }
    }
  ];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 1, 'generated only 1 street (skipped no-centroid)');
        
        const street = results[0];
        test.equal(street.getName('default'), 'goodstreet', 'generated street with valid centroid');
        
        test.end();
        cleanupTestDb();
      });

    generator.end();
  });
});

// Test: Street generator passes through input documents unchanged
tape('street_generator: passes through input documents unchanged', (test) => {
  const testData = [{
    key: 'testowa|warszawa|50.0|20.0',
    value: {
      numbers: ['1', '2'],
      centroid: { lat: 100.0, lon: 40.0, count: 2 },
      streetName: 'Testowa',
      locality: 'Warszawa'
    }
  }];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const inputDocs = [
      createAddressDoc('addr1', '1', 'Testowa', 'Warszawa', 'mazowieckie', 'Polska', 50.0, 20.0),
      createAddressDoc('addr2', '2', 'Testowa', 'Warszawa', 'mazowieckie', 'Polska', 50.0, 20.0)
    ];
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        // Should have 2 address docs + 1 street doc
        test.equal(results.length, 3, 'passed through 2 addresses + 1 generated street');
        
        const addresses = results.filter(d => d.getLayer() === 'address');
        const streets = results.filter(d => d.getLayer() === 'street');
        
        test.equal(addresses.length, 2, '2 address documents passed through');
        test.equal(streets.length, 1, '1 street document generated');
        
        test.end();
        cleanupTestDb();
      });

    // Write input documents
    inputDocs.forEach(doc => generator.write(doc));
    generator.end();
  });
});

// Test: Street generator with natural-sorted complex numbers
tape('street_generator: maintains natural sort of complex house numbers', (test) => {
  const testData = [{
    key: 'testowa|warszawa|50.0|20.0',
    value: {
      numbers: ['1', '2', '10', '22', '22a', '22b', '100'], // Pre-sorted by collector
      centroid: { lat: 150.0, lon: 60.0, count: 3 },
      streetName: 'Testowa',
      locality: 'Warszawa'
    }
  }];

  populateTestDb(testData, (err) => {
    test.error(err, 'database populated successfully');

    const generator = streetGenerator();
    const results = [];

    generator
      .on('data', (doc) => {
        results.push(doc);
      })
      .on('end', () => {
        test.equal(results.length, 1, 'generated 1 street document');
        
        const street = results[0];
        const addendum = street.getAddendum('osm');
        
        // Should maintain the natural sort order
        test.equal(
          addendum.house_numbers,
          '1,2,10,22,22a,22b,100',
          'maintains natural sort order'
        );
        
        test.end();
        cleanupTestDb();
      });

    generator.end();
  });
});

// Integration test with full pipeline simulation
tape('street_generator: integration with collector - full workflow', (test) => {
  cleanupTestDb();

  const addresses = [
    createAddressDoc('addr1', '1', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska', 52.0, 21.0),
    createAddressDoc('addr2', '3', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska', 52.1, 21.1),
    createAddressDoc('addr3', '5', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska', 52.2, 21.2),
  ];

  // Step 1: Collect with houseNumbersCollector
  const collector = houseNumbersCollector();
  const collectorResults = [];

  collector
    .on('data', (doc) => {
      collectorResults.push(doc);
    })
    .on('end', () => {
      test.equal(collectorResults.length, 3, 'collector passed through 3 addresses');
      
      // Step 2: Generate streets
      setTimeout(() => { // Give LevelDB time to close
        const generator = streetGenerator();
        const generatorResults = [];

        generator
          .on('data', (doc) => {
            generatorResults.push(doc);
          })
          .on('end', () => {
            // Should generate 1 street document
            const streets = generatorResults.filter(d => d.getLayer() === 'street');
            test.equal(streets.length, 1, 'generated 1 street');
            
            const street = streets[0];
            test.equal(street.getName('default'), 'marszałkowska', 'correct street name');
            
            // Check centroid is average of 3 addresses
            const centroid = street.getCentroid();
            const expectedLat = (52.0 + 52.1 + 52.2) / 3;
            const expectedLon = (21.0 + 21.1 + 21.2) / 3;
            test.ok(Math.abs(centroid.lat - expectedLat) < 0.01, 'correct average latitude');
            test.ok(Math.abs(centroid.lon - expectedLon) < 0.01, 'correct average longitude');
            
            // Check house numbers
            const addendum = street.getAddendum('osm');
            test.equal(addendum.house_numbers, '1,3,5', 'correct house numbers');
            
            test.end();
          });

        generator.end();
      }, 100);
    });

  // Feed addresses to collector
  addresses.forEach(addr => collector.write(addr));
  collector.end();
});

