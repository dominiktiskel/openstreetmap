const tape = require('tape');
const through = require('through2');
const Document = require('pelias-model').Document;
const houseNumbersAggregator = require('../../stream/house_numbers_aggregator');

// Helper function to create a test address document
function createAddressDoc(id, houseNumber, street, locality, region, country) {
  const doc = new Document('openstreetmap', 'address', id)
    .setAddress('number', houseNumber)
    .setAddress('street', street)
    .setCentroid({ lat: 50.0, lon: 19.0 });

  // Set parent hierarchy
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

// Test natural sort function
tape('naturalSort: sorts numeric house numbers correctly', (test) => {
  const numbers = ['10', '2', '1', '100', '22', '3'];
  const sorted = numbers.sort(houseNumbersAggregator.naturalSort);
  
  test.deepEqual(sorted, ['1', '2', '3', '10', '22', '100'], 'numeric sorting works');
  test.end();
});

tape('naturalSort: sorts alphanumeric house numbers correctly', (test) => {
  const numbers = ['22b', '22', '22a', '23', '21'];
  const sorted = numbers.sort(houseNumbersAggregator.naturalSort);
  
  test.deepEqual(sorted, ['21', '22', '22a', '22b', '23'], 'alphanumeric sorting works');
  test.end();
});

tape('naturalSort: handles mixed formats', (test) => {
  const numbers = ['5B', '5', '5A', '7', '22/1', '22/2', '22', '22-24'];
  const sorted = numbers.sort(houseNumbersAggregator.naturalSort);
  
  test.deepEqual(
    sorted,
    ['5', '5A', '5B', '7', '22', '22-24', '22/1', '22/2'],
    'mixed format sorting works'
  );
  test.end();
});

tape('naturalSort: case insensitive', (test) => {
  const numbers = ['22B', '22a', '22A', '22b'];
  const sorted = numbers.sort(houseNumbersAggregator.naturalSort);
  
  // Should be sorted case-insensitively
  test.deepEqual(sorted, ['22a', '22A', '22b', '22B'], 'case insensitive sorting works');
  test.end();
});

// Test generateStreetKey function
tape('generateStreetKey: generates correct key with full hierarchy', (test) => {
  const doc = createAddressDoc('1', '5', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska');
  const key = houseNumbersAggregator.generateStreetKey(doc);
  
  test.equal(key, 'marszałkowska|warszawa|mazowieckie|polska', 'key generated correctly');
  test.end();
});

tape('generateStreetKey: handles missing hierarchy', (test) => {
  const doc = createAddressDoc('1', '5', 'Main Street', '', '', '');
  const key = houseNumbersAggregator.generateStreetKey(doc);
  
  test.equal(key, 'main street|||', 'handles missing data');
  test.end();
});

// Test aggregator stream
tape('aggregator: aggregates house numbers for same street', (test) => {
  const docs = [
    createAddressDoc('1', '1', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '3', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '2', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('4', '10', 'Main Street', 'Warsaw', 'Mazovia', 'Poland')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(results.length, 4, 'all documents passed through');
      
      // Check that all documents have the same aggregated house numbers
      results.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.ok(addendum, 'addendum exists');
        test.ok(addendum.house_numbers, 'house_numbers field exists');
        test.equal(addendum.house_numbers, '1,2,3,10', 'house numbers sorted correctly');
      });
      
      test.end();
    });

  // Write all documents to the stream
  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: separates streets in different cities', (test) => {
  const docs = [
    createAddressDoc('1', '1', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '2', 'Main Street', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '5', 'Main Street', 'Krakow', 'Lesser Poland', 'Poland'),
    createAddressDoc('4', '7', 'Main Street', 'Krakow', 'Lesser Poland', 'Poland')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(results.length, 4, 'all documents passed through');
      
      // Check Warsaw documents
      const warsawDocs = results.filter(doc => doc.parent.locality[0] === 'Warsaw');
      warsawDocs.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.equal(addendum.house_numbers, '1,2', 'Warsaw street has correct numbers');
      });
      
      // Check Krakow documents
      const krakowDocs = results.filter(doc => doc.parent.locality[0] === 'Krakow');
      krakowDocs.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.equal(addendum.house_numbers, '5,7', 'Krakow street has correct numbers');
      });
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: handles alphanumeric house numbers', (test) => {
  const docs = [
    createAddressDoc('1', '22', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('2', '22a', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('3', '22b', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('4', '23', 'Główna', 'Warsaw', 'Mazovia', 'Poland'),
    createAddressDoc('5', '21', 'Główna', 'Warsaw', 'Mazovia', 'Poland')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(results.length, 5, 'all documents passed through');
      
      results.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.equal(
          addendum.house_numbers,
          '21,22,22a,22b,23',
          'alphanumeric numbers sorted correctly'
        );
      });
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: handles house numbers with slashes', (test) => {
  const docs = [
    createAddressDoc('1', '22/1', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('2', '22/2', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('3', '23', 'Test Street', 'City', 'Region', 'Country')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      results.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.equal(addendum.house_numbers, '22/1,22/2,23', 'slashes handled correctly');
      });
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: removes duplicate house numbers', (test) => {
  const docs = [
    createAddressDoc('1', '5', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('2', '5', 'Test Street', 'City', 'Region', 'Country'),
    createAddressDoc('3', '7', 'Test Street', 'City', 'Region', 'Country')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
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
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: passes through non-address documents unchanged', (test) => {
  const docs = [
    createAddressDoc('1', '5', 'Test Street', 'City', 'Region', 'Country'),
    createVenueDoc('2', 'Test Cafe'),
    createAddressDoc('3', '7', 'Test Street', 'City', 'Region', 'Country')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(results.length, 3, 'all documents passed through');
      
      // Check venue document doesn't have house_numbers addendum
      const venueDoc = results.find(doc => doc.getLayer() === 'venue');
      test.ok(venueDoc, 'venue document found');
      const venueAddendum = venueDoc.getAddendum('osm');
      test.notOk(venueAddendum || !venueAddendum.house_numbers, 'venue has no house_numbers');
      
      // Check address documents have house_numbers
      const addressDocs = results.filter(doc => doc.getLayer() === 'address');
      test.equal(addressDocs.length, 2, 'two address documents');
      addressDocs.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.ok(addendum && addendum.house_numbers, 'address has house_numbers');
        test.equal(addendum.house_numbers, '5,7', 'correct aggregation');
      });
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: handles realistic Polish street with mixed numbers', (test) => {
  const docs = [
    createAddressDoc('1', '1', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('2', '3', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('3', '5', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('4', '22', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('5', '22a', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('6', '22b', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('7', '23', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska'),
    createAddressDoc('8', '25', 'Marszałkowska', 'Warszawa', 'mazowieckie', 'Polska')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
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
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

tape('aggregator: handles addresses with missing admin hierarchy gracefully', (test) => {
  const docs = [
    createAddressDoc('1', '1', 'Unnamed Street', '', '', ''),
    createAddressDoc('2', '2', 'Unnamed Street', '', '', '')
  ];

  const aggregator = houseNumbersAggregator();
  const results = [];

  aggregator
    .pipe(through.obj((doc, enc, next) => {
      results.push(doc);
      next();
    }))
    .on('finish', () => {
      test.equal(results.length, 2, 'all documents passed through');
      
      results.forEach(doc => {
        const addendum = doc.getAddendum('osm');
        test.ok(addendum && addendum.house_numbers, 'addendum exists despite missing hierarchy');
        test.equal(addendum.house_numbers, '1,2', 'numbers aggregated correctly');
      });
      
      test.end();
    });

  docs.forEach(doc => aggregator.write(doc));
  aggregator.end();
});

