'use strict';

const intersections = require('../../stream/intersections');

module.exports.tests = {};

module.exports.tests.aliases = (test) => {
  test('Lexington and East 53rd get short aliases in both orders', (t) => {
    const labels = intersections.intersectionLabels('Lexington Avenue', 'East 53rd Street');
    t.ok(labels.aliases.indexOf('Lex & 53rd') !== -1, 'Lex & 53rd');
    t.ok(labels.aliases.indexOf('53rd & Lex') !== -1, '53rd & Lex');
    t.ok(labels.aliases.indexOf('Lexington Avenue & East 53rd Street') !== -1 ||
      labels.display === 'Lexington Avenue & East 53rd Street', 'full name present');
    t.end();
  });

  test('a street without a US short form gets no invented alias', (t) => {
    t.equal(intersections.shortStreetName('Marszałkowska'), null);
    const labels = intersections.intersectionLabels('Marszałkowska', 'Piękna');
    const shorts = labels.aliases.filter((alias) => alias.indexOf('Marszałkowska') === -1 && alias.indexOf('Piękna') === -1);
    t.equal(shorts.length, 0);
    t.ok(labels.display.indexOf('Marszałkowska') !== -1);
    t.ok(labels.display.indexOf('Piękna') !== -1);
    t.end();
  });
};

module.exports.tests.geometry = (test) => {
  test('a shared node of two streets becomes one intersection document', (t) => {
    const nodeMap = new Map();
    intersections.ingestWay(nodeMap, {
      type: 'way',
      tags: { highway: 'primary', name: 'Lexington Avenue' },
      nodes: [{ lat: 40.758125, lon: -73.971309 }, { lat: 40.760000, lon: -73.971309 }]
    });
    intersections.ingestWay(nodeMap, {
      type: 'way',
      tags: { highway: 'residential', name: 'East 53rd Street' },
      nodes: [{ lat: 40.758125, lon: -73.971309 }, { lat: 40.758125, lon: -73.970000 }]
    });
    intersections.ingestWay(nodeMap, {
      type: 'way',
      tags: { highway: 'residential', name: 'East 54th Street' },
      nodes: [{ lat: 40.759000, lon: -73.971309 }]
    });

    const found = intersections.buildIntersections(nodeMap);
    t.equal(found.length, 1);
    t.equal(found[0].lat, 40.758125);
    t.ok(found[0].a === 'East 53rd Street' || found[0].b === 'East 53rd Street');
    t.ok(found[0].a === 'Lexington Avenue' || found[0].b === 'Lexington Avenue');

    const doc = intersections.createIntersectionDocument(found[0]);
    t.equal(doc.getLayer(), 'intersection');
    t.equal(doc.getAddress('street') !== doc.getAddress('cross_street'), true);
    const aliases = doc.getNameAliases('default');
    t.ok(aliases.indexOf('Lex & 53rd') !== -1);
    t.ok(aliases.indexOf('53rd & Lex') !== -1);
    t.end();
  });
};

module.exports.all = (tape) => {
  function test(name, testFunction) {
    return tape('intersections: ' + name, testFunction);
  }

  for (const testCase in module.exports.tests) {
    module.exports.tests[testCase](test);
  }
};
