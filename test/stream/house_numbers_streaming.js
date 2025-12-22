const tape = require('tape');
const through = require('through2');
const Document = require('pelias-model').Document;
const fs = require('fs');
const path = require('path');
const os = require('os');

// Modules under test
const houseNumbersCollector = require('../../stream/house_numbers_collector');
const houseNumbersEnricher = require('../../stream/house_numbers_enricher');

// Helper function to create a test address document
function createAddressDoc(id, houseNumber, street, locality, region, country) {
  const doc = new Document('openstreetmap', 'address', id)
    .setAddress('number', houseNumber)
    .setAddress('street', street)
    .setCentroid({ lat: 50.0, lon: 19.0 });

  if (locality) doc.parent.locality = [locality];
  if (region) doc.parent.region = [region];
  if (country) doc.parent.country = [country];

  return doc;
}

// Helper function to create a test venue document
function createVenueDoc(id, name) {
  return new Document('openstreetmap', 'venue', id)
    .setName('default', name)
    .setCentroid({ lat: 50.0, lon: 19.0 });
}

// Helper to clean up test database
function cleanupTestDb() {
  const dbPath = houseNumbersCollector.DB_PATH;
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

// Test natural sort function
tape('collector: naturalSort sorts numeric house numbers correctly', (test) => {
  const numbers = ['10', '2', '1', '100', '22', '3'];
  const sorted = numbers.sort(houseNumbersCollector.naturalSort);
  
  test.deepEqual(sorted, ['1', '2', '3', '10', '22', '100'], 'numeric sorting works');
  test.end();
});

tape('collector: naturalSort sorts alphanumeric house numbers correctly', (test) => {
  const numbers = ['22b', '22', '22a', '23', '21'];
  const sorted = numbers.sort(houseNumbersCollector.naturalSort);
  
  test.deepEqual(sorted, ['21', '22', '22a', '22b', '23'], 'alphanumeric sorting works');
  test.end();
});

tape('collector: naturalSort handles mixed formats', (test) => {
  const numbers = ['5B', '5', '5A', '7', '22/1', '22/2', '22', '22-24'];
  const sorted = numbers.sort(houseNumbersCollector.naturalSort);
  
  test.deepEqual(
    sorted,
    ['5', '5A', '5B', '7', '22', '22-24', '22/1', '22/2'],
    'mixed format sorting works'
  );
  test.end();
});

// Test generateStreetKey function
tape('collector: generateStreetKey generates correct key with full hierarchy', (test) => {
  const doc = createAddressDoc('1', '5', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska');
  const key = houseNumbersCollector.generateStreetKey(doc);
  
  test.equal(key, 'marszałkowska|warszawa|mazowieckie|polska', 'key generated correctly');
  test.end();
});

tape('collector: generateStreetKey handles missing hierarchy', (test) => {
  const doc = createAddressDoc('1', '5', 'Main Street', '', '', '');
  const key = houseNumbersCollector.generateStreetKey(doc);
  
  test.equal(key, 'main street|||', 'handles missing data');
  test.end();
});

// Integration test: Pass 1 + Pass 2
tape('streaming: full integration test with collection and enrichment', (test) => {
  cleanupTestDb();

  const testDocs = [
    createAddressDoc('1', '1', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '3', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '2', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('4', '10', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createVenueDoc('5', 'Test Cafe')
  ];

  // PASS 1: Collection
  const collector = houseNumbersCollector();
  const collectorResults = [];

  collector
    .pipe(through.obj((doc, enc, next) => {
      collectorResults.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(collectorResults.length, 5, 'Pass 1: all documents passed through');

      // Short delay to ensure LevelDB is closed
      setTimeout(() => {
        // PASS 2: Enrichment
        const enricher = houseNumbersEnricher();
        const enricherResults = [];

        enricher
          .pipe(through.obj((doc, enc, next) => {
            enricherResults.push(doc);
            next();
          }))
          .on('finish', () => {
            test.equal(enricherResults.length, 5, 'Pass 2: all documents passed through');

            // Check that address documents have been enriched
            const addresses = enricherResults.filter(doc => doc.getLayer() === 'address');
            test.equal(addresses.length, 4, 'Pass 2: 4 address documents');

            addresses.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.ok(addendum, 'Pass 2: addendum exists');
              test.ok(addendum.house_numbers, 'Pass 2: house_numbers field exists');
              test.equal(addendum.house_numbers, '1,2,3,10', 'Pass 2: house numbers sorted correctly');
            });

            // Check that venue was not enriched
            const venues = enricherResults.filter(doc => doc.getLayer() === 'venue');
            test.equal(venues.length, 1, 'Pass 2: 1 venue document');
            const venueAddendum = venues[0].getAddendum('osm');
            test.notOk(venueAddendum && venueAddendum.house_numbers, 'Pass 2: venue not enriched');

            cleanupTestDb();
            test.end();
          });

        // Write same docs to enricher
        testDocs.forEach(doc => enricher.write(doc));
        enricher.end();
      }, 100);
    });

  // Write docs to collector
  testDocs.forEach(doc => collector.write(doc));
  collector.end();
});

// Test: Different cities
tape('streaming: separates streets in different cities', (test) => {
  cleanupTestDb();

  const testDocs = [
    createAddressDoc('1', '1', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '2', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '5', 'Main Street', 'Krakow', 'Lesser Poland', 'Poland'),
    createAddressDoc('4', '7', 'Main Street', 'Krakow', 'Lesser Poland', 'Poland')
  ];

  // Pass 1
  const collector = houseNumbersCollector();
  collector
    .pipe(through.obj((doc, enc, next) => next()))
    .on('finish', () => {
      setTimeout(() => {
        // Pass 2
        const enricher = houseNumbersEnricher();
        const results = [];

        enricher
          .pipe(through.obj((doc, enc, next) => {
            results.push(doc);
            next();
          }))
          .on('finish', () => {
            // Check Warsaw documents
            const warsawDocs = results.filter(doc => 
              doc.parent && doc.parent.locality && doc.parent.locality[0] === 'Warsaw'
            );
            warsawDocs.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.equal(addendum.house_numbers, '1,2', 'Warsaw street has correct numbers');
            });

            // Check Krakow documents
            const krakowDocs = results.filter(doc => 
              doc.parent && doc.parent.locality && doc.parent.locality[0] === 'Krakow'
            );
            krakowDocs.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.equal(addendum.house_numbers, '5,7', 'Krakow street has correct numbers');
            });

            cleanupTestDb();
            test.end();
          });

        testDocs.forEach(doc => enricher.write(doc));
        enricher.end();
      }, 100);
    });

  testDocs.forEach(doc => collector.write(doc));
  collector.end();
});

// Test: Alphanumeric numbers
tape('streaming: handles alphanumeric house numbers', (test) => {
  cleanupTestDb();

  const testDocs = [
    createAddressDoc('1', '22', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '22a', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '22b', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('4', '23', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('5', '21', 'Główna', 'Warsaw', 'Mazovia', 'Poland')
  ];

  // Pass 1
  const collector = houseNumbersCollector();
  collector
    .pipe(through.obj((doc, enc, next) => next()))
    .on('finish', () => {
      setTimeout(() => {
        // Pass 2
        const enricher = houseNumbersEnricher();
        const results = [];

        enricher
          .pipe(through.obj((doc, enc, next) => {
            results.push(doc);
            next();
          }))
          .on('finish', () => {
            results.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.equal(
                addendum.house_numbers,
                '21,22,22a,22b,23',
                'alphanumeric numbers sorted correctly'
              );
            });

            cleanupTestDb();
            test.end();
          });

        testDocs.forEach(doc => enricher.write(doc));
        enricher.end();
      }, 100);
    });

  testDocs.forEach(doc => collector.write(doc));
  collector.end();
});

// Test: Duplicate removal
tape('streaming: removes duplicate house numbers', (test) => {
  cleanupTestDb();

  const testDocs = [
    createAddressDoc('1', '5', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('2', '5', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('3', '7', 'Test Street', 'City', 'Region', 'Country')
  ];

  // Pass 1
  const collector = houseNumbersCollector();
  collector
    .pipe(through.obj((doc, enc, next) => next()))
    .on('finish', () => {
      setTimeout(() => {
        // Pass 2
        const enricher = houseNumbersEnricher();
        const results = [];

        enricher
          .pipe(through.obj((doc, enc, next) => {
            results.push(doc);
            next();
          }))
          .on('finish', () => {
            test.equal(results.length, 3, 'all documents passed through');

            results.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.equal(addendum.house_numbers, '5,7', 'duplicates removed');
            });

            cleanupTestDb();
            test.end();
          });

        testDocs.forEach(doc => enricher.write(doc));
        enricher.end();
      }, 100);
    });

  testDocs.forEach(doc => collector.write(doc));
  collector.end();
});

// Test: Realistic Polish street
tape('streaming: realistic Polish street with mixed numbers', (test) => {
  cleanupTestDb();

  const testDocs = [
    createAddressDoc('1', '1', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('2', '3', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('3', '5', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('4', '22', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('5', '22a', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('6', '22b', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('7', '23', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('8', '25', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska')
  ];

  // Pass 1
  const collector = houseNumbersCollector();
  collector
    .pipe(through.obj((doc, enc, next) => next()))
    .on('finish', () => {
      setTimeout(() => {
        // Pass 2
        const enricher = houseNumbersEnricher();
        const results = [];

        enricher
          .pipe(through.obj((doc, enc, next) => {
            results.push(doc);
            next();
          }))
          .on('finish', () => {
            test.equal(results.length, 8, 'all documents passed through');

            results.forEach(doc => {
              const addendum = doc.getAddendum('osm');
              test.equal(
                addendum.house_numbers,
                '1,3,5,22,22a,22b,23,25',
                'realistic Polish street numbers sorted correctly'
              );
            });

            cleanupTestDb();
            test.end();
          });

        testDocs.forEach(doc => enricher.write(doc));
        enricher.end();
      }, 100);
    });

  testDocs.forEach(doc => collector.write(doc));
  collector.end();
});

