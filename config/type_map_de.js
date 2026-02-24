/**
 * OSM tag to POI type mapping with German names and search aliases
 * Language: German (DE)
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { 
 *       type: 'type_string', 
 *       type_name: 'German Name',
 *       type_aliases: ['Alias1', 'Alias2']  // Search variants
 *     }
 *   }
 * }
 * 
 * Result in API (addendum.osm):
 * {
 *   "addendum": {
 *     "osm": {
 *       "type": "bus_stop",
 *       "type_name": "Bushaltestelle"
 *     }
 *   }
 * }
 * 
 * Search aliases allow users to find POIs using various German naming variants.
 */

module.exports = {
  'aerialway': {
    '*':                  { type: 'aerialway', type_name: 'Seilbahn', type_aliases: ['Gondelbahn', 'Sesselbahn', 'Gondel'] }
  },
  
  'aeroway': {
    'aerodrome': {
      type: 'aerodrome',
      type_name: 'Flughafen',
      type_aliases: ['Flugplatz', 'Landeplatz', 'Aerodrom']
    },
    'heliport': {
      type: 'heliport',
      type_name: 'Hubschrauberlandeplatz',
      type_aliases: ['Heliport', 'Helikopterlandeplatz']
    },
    'helipad': {
      type: 'helipad',
      type_name: 'Helipad',
      type_aliases: ['Hubschrauberlandeplatz']
    },
    'aerodrome_gate': {
      type: 'aerodrome_gate',
      type_name: 'Flughafengate',
      type_aliases: ['Gate', 'Abfluggate']
    },
    'terminal': {
      type: 'terminal',
      type_name: 'Flughafen-Terminal',
      type_aliases: ['Terminal', 'Abflughalle']
    }
  },
  
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name: 'Bushaltestelle', type_aliases: ['Haltestelle', 'Busstation'] },
    'bus_station':        { type: 'bus_station', type_name: 'Busbahnhof', type_aliases: ['ZOB', 'Omnibusbahnhof'] },
    'ferry_terminal':     { type: 'ferry_terminal', type_name: 'Fährterminal', type_aliases: ['Fähre', 'Schiffsterminal'] },
    'taxi':               { type: 'taxi', type_name: 'Taxistand', type_aliases: ['Taxi', 'Taxihalteplatz'] },
    'parking':            { type: 'parking', type_name: 'Parkplatz', type_aliases: ['Parken', 'Parkhaus', 'Parkfläche'] },
    'parking_space':      { type: 'parking_space', type_name: 'Parkfläche', type_aliases: ['Stellplatz', 'Parkplatz'] },
    'bicycle_parking':    {
      type: 'bicycle_parking',
      type_name: 'Fahrradparkplatz',
      type_aliases: ['Fahrradständer', 'Fahrradabstellplatz']
    },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name: 'Motorradparkplatz', type_aliases: ['Motorradabstellplatz'] },
    'charging_station':   {
      type: 'charging_station',
      type_name: 'Ladestation für Elektrofahrzeuge',
      type_aliases: ['Ladestation', 'E-Auto Laden', 'Elektroladesäule']
    },
    'fuel':               { type: 'fuel', type_name: 'Tankstelle', type_aliases: ['Benzin', 'Kraftstoff'] },
    'car_rental':         { type: 'car_rental', type_name: 'Autovermietung', type_aliases: ['Mietwagen', 'Leihwagen'] },
    'car_wash':           { type: 'car_wash', type_name: 'Autowäsche', type_aliases: ['Waschanlage', 'Autowaschanlage'] },
    
    // Religion & Culture
    'place_of_worship':   {
      type: 'place_of_worship',
      type_name: 'Gotteshaus',
      type_aliases: ['Kirche', 'Tempel', 'Kapelle', 'Sakralbau']
    },
    'theatre':            { type: 'theatre', type_name: 'Theater', type_aliases: ['Schauspielhaus', 'Bühne'] },
    'cinema':             { type: 'cinema', type_name: 'Kino', type_aliases: ['Lichtspielhaus', 'Filmtheater'] },
    'arts_centre':        { type: 'arts_centre', type_name: 'Kunstzentrum', type_aliases: ['Kulturzentrum', 'Kunsthaus'] },
    'library':            { type: 'library', type_name: 'Bibliothek', type_aliases: ['Bücherei', 'Stadtbücherei'] },
    'planetarium':        { type: 'planetarium', type_name: 'Planetarium', type_aliases: ['Sternwarte'] },
    'community_centre':   { type: 'community_centre', type_name: 'Gemeinschaftszentrum', type_aliases: ['Bürgerhaus', 'Kulturhaus'] },
    'social_centre':      { type: 'social_centre', type_name: 'Sozialzentrum', type_aliases: ['Soziales Zentrum'] },
    
    // Food & Drink
    'restaurant':         {
      type: 'restaurant',
      type_name: 'Restaurant',
      type_aliases: ['Gaststätte', 'Speiselokal', 'Imbiss', 'Gasthaus']
    },
    'fast_food':          {
      type: 'fast_food',
      type_name: 'Schnellrestaurant',
      type_aliases: ['Fast Food', 'Imbiss', 'Fastfood']
    },
    'cafe':               { type: 'cafe', type_name: 'Café', type_aliases: ['Kaffeehaus', 'Kaffeestube'] },
    'pub':                { type: 'pub', type_name: 'Kneipe', type_aliases: ['Pub', 'Gasthaus', 'Bar'] },
    'bar':                { type: 'bar', type_name: 'Bar', type_aliases: ['Cocktailbar', 'Lounge'] },
    'biergarten':         {
      type: 'biergarten',
      type_name: 'Biergarten',
      type_aliases: ['Gartenlokal', 'Freischankfläche']
    },
    'food_court':         {
      type: 'food_court',
      type_name: 'Food Court',
      type_aliases: ['Imbisshalle', 'Speisehalle', 'Gastronomiebereich']
    },
    'ice_cream':          { type: 'ice_cream', type_name: 'Eisdiele', type_aliases: ['Eiscafé', 'Gelato'] },
    
    // Education
    'school':             {
      type: 'school',
      type_name: 'Schule',
      type_aliases: ['Grundschule', 'Gymnasium', 'Bildungseinrichtung']
    },
    'kindergarten':       { type: 'kindergarten', type_name: 'Kindergarten', type_aliases: ['Kita', 'Kindertagesstätte', 'Krippe'] },
    'college':            { type: 'college', type_name: 'Fachschule', type_aliases: ['Hochschule', 'Fachhochschule'] },
    'university':         { type: 'university', type_name: 'Universität', type_aliases: ['Uni', 'Hochschule', 'TU', 'FH'] },
    'driving_school':     {
      type: 'driving_school',
      type_name: 'Fahrschule',
      type_aliases: ['Führerscheinschule', 'Fahrkurs']
    },
    
    // Healthcare & Social Services
    'clinic':             { type: 'clinic', type_name: 'Klinik', type_aliases: ['Arztpraxis', 'Poliklinik', 'Ambulanz'] },
    'dentist':            { type: 'dentist', type_name: 'Zahnarztpraxis', type_aliases: ['Zahnarzt', 'Zahnklinik'] },
    'doctors':            { type: 'doctors', type_name: 'Arztpraxis', type_aliases: ['Arzt', 'Allgemeinmedizin'] },
    'hospital':           { type: 'hospital', type_name: 'Krankenhaus', type_aliases: ['Klinikum', 'Spital'] },
    'pharmacy':           { type: 'pharmacy', type_name: 'Apotheke', type_aliases: [] },
    'veterinary':         {
      type: 'veterinary',
      type_name: 'Tierarztpraxis',
      type_aliases: ['Tierarzt', 'Tierklinik', 'Veterinär']
    },
    'nursing_home':       { type: 'nursing_home', type_name: 'Pflegeheim', type_aliases: ['Altenheim', 'Seniorenheim'] },
    'social_facility':    { type: 'social_facility', type_name: 'Sozialeinrichtung', type_aliases: ['Sozialamt', 'Sozialhilfe'] },
    
    // Finance
    'atm':                { type: 'atm', type_name: 'Geldautomat', type_aliases: ['Bankautomat', 'ATM', 'Bargeldautomat'] },
    'bank':               { type: 'bank', type_name: 'Bank', type_aliases: ['Bankfiliale', 'Sparkasse', 'Kreditinstitut'] },
    'bureau_de_change':   { type: 'bureau_de_change', type_name: 'Geldwechsel', type_aliases: ['Wechselstube', 'Währungswechsel'] },
    
    // Government & Public Services
    'police':             { type: 'police', type_name: 'Polizeiwache', type_aliases: ['Polizei', 'Polizeidienststelle'] },
    'fire_station':       { type: 'fire_station', type_name: 'Feuerwehrwache', type_aliases: ['Feuerwehr', 'Feuerwehrhaus'] },
    'post_office':        { type: 'post_office', type_name: 'Postfiliale', type_aliases: ['Post', 'Briefpostamt'] },
    'post_box':           { type: 'post_box', type_name: 'Briefkasten', type_aliases: ['Postkasten'] },
    'townhall':           { type: 'townhall', type_name: 'Rathaus', type_aliases: ['Gemeindehaus', 'Stadthaus'] },
    'courthouse':         { type: 'courthouse', type_name: 'Gericht', type_aliases: ['Amtsgericht', 'Landgericht', 'Gerichtsgebäude'] },
    'embassy':            { type: 'embassy', type_name: 'Botschaft', type_aliases: ['Konsulat', 'Diplomatische Vertretung'] },
    'public_building':    { type: 'public_building', type_name: 'Öffentliches Gebäude', type_aliases: ['Behörde'] },
    'ranger_station':     { type: 'ranger_station', type_name: 'Forsthaus', type_aliases: ['Forstwache', 'Revierförsterei'] },
    'register_office':    { type: 'register_office', type_name: 'Standesamt', type_aliases: ['Meldebehörde'] },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name: 'Öffentliche Toilette', type_aliases: ['Toilette', 'WC', 'Klo'] },
    'drinking_water':     { type: 'drinking_water', type_name: 'Trinkwasser', type_aliases: ['Trinkwasserbrunnen', 'Wasserspender'] },
    'fountain':           { type: 'fountain', type_name: 'Brunnen', type_aliases: ['Springbrunnen', 'Fontäne'] },
    'recycling':          {
      type: 'recycling',
      type_name: 'Wertstoffhof',
      type_aliases: ['Recycling', 'Mülltrennung', 'Wertstoffcontainer']
    },
    'waste_disposal':     { type: 'waste_disposal', type_name: 'Müllentsorgung', type_aliases: ['Mülldeponie', 'Abfallentsorgung'] },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name: 'Markt', type_aliases: ['Wochenmarkt', 'Marktplatz', 'Basar'] },
    'vending_machine':    { type: 'vending_machine', type_name: 'Automat', type_aliases: ['Verkaufsautomat'] },
    'telephone':          { type: 'telephone', type_name: 'Öffentliches Telefon', type_aliases: ['Telefonzelle', 'Fernsprecher'] },
    'internet_cafe':      { type: 'internet_cafe', type_name: 'Internetcafé', type_aliases: ['Cybercafé'] },
    'coworking_space':    { type: 'coworking_space', type_name: 'Coworking Space', type_aliases: ['Coworking', 'Gemeinschaftsbüro'] },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name: 'Nachtclub', type_aliases: ['Diskothek', 'Club', 'Disko'] },
    'casino':             { type: 'casino', type_name: 'Spielkasino', type_aliases: ['Kasino', 'Casino'] },
    'gambling':           { type: 'gambling', type_name: 'Spielhalle', type_aliases: ['Glücksspiel'] },
    
    // Recreation & Sports
    'dojo':               { type: 'dojo', type_name: 'Dojo', type_aliases: ['Kampfsportschule', 'Kampfkunststudio'] },
    'gym':                { type: 'gym', type_name: 'Fitnessstudio', type_aliases: ['Sportstudio', 'Fitnessclub', 'Gym'] },
    'bbq':                { type: 'bbq', type_name: 'Grillplatz', type_aliases: ['Grillstelle', 'Barbecue'] }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name: 'Bushaltestelle', type_aliases: ['Haltestelle'] },
    'platform':           { type: 'platform', type_name: 'Bahnsteig', type_aliases: ['Haltestelle'] },
    'rest_area':          { type: 'rest_area', type_name: 'Rastplatz', type_aliases: ['Raststätte', 'Rastanlage'] },
    'services':           { type: 'services', type_name: 'Raststätte', type_aliases: ['Autobahnraststätte', 'Rastanlage'] }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name: 'Bahnsteig', type_aliases: ['Haltestelle'] },
    'station':            { type: 'station', type_name: 'Bahnhof', type_aliases: ['Station', 'Haltepunkt'] },
    'stop_position':      { type: 'stop_position', type_name: 'Haltestelle', type_aliases: [] }
  },
  
  'shop': {
    // Food & Groceries
    'supermarket':        { type: 'supermarket', type_name: 'Supermarkt', type_aliases: ['Lebensmittelmarkt', 'Einkaufsmarkt'] },
    'convenience':        { type: 'convenience', type_name: 'Kiosk', type_aliases: ['Spätkauf', 'Tante-Emma-Laden', 'Nahkauf'] },
    'bakery':             { type: 'bakery', type_name: 'Bäckerei', type_aliases: ['Backstube', 'Konditorei'] },
    'butcher':            { type: 'butcher', type_name: 'Metzgerei', type_aliases: ['Fleischerei', 'Schlachterei'] },
    'cheese':             { type: 'cheese', type_name: 'Käseladen', type_aliases: ['Käserei', 'Käsegeschäft'] },
    'chocolate':          { type: 'chocolate', type_name: 'Schokoladengeschäft', type_aliases: ['Confiserie', 'Schokolade'] },
    'coffee':             { type: 'coffee', type_name: 'Kaffeeladen', type_aliases: ['Kaffeerösterei', 'Kaffeegeschäft'] },
    'deli':               { type: 'deli', type_name: 'Feinkostgeschäft', type_aliases: ['Feinkost', 'Delikatessen'] },
    'greengrocer':        { type: 'greengrocer', type_name: 'Gemüsehändler', type_aliases: ['Obst und Gemüse', 'Obst- und Gemüseladen'] },
    'seafood':            { type: 'seafood', type_name: 'Fischgeschäft', type_aliases: ['Fischladen', 'Fischhandel', 'Meeresfrüchte'] },
    'beverages':          { type: 'beverages', type_name: 'Getränkemarkt', type_aliases: ['Getränkeshop', 'Getränkefachmarkt'] },
    'alcohol':            { type: 'alcohol', type_name: 'Spirituosengeschäft', type_aliases: ['Weinhandlung', 'Getränkeshop'] },
    
    // Fashion & Personal Care
    'clothes':            { type: 'clothes', type_name: 'Bekleidungsgeschäft', type_aliases: ['Kleidergeschäft', 'Mode', 'Boutique'] },
    'shoes':              { type: 'shoes', type_name: 'Schuhgeschäft', type_aliases: ['Schuhladen', 'Schuhfachgeschäft'] },
    'hairdresser':        { type: 'hairdresser', type_name: 'Friseur', type_aliases: ['Friseursalon', 'Coiffeur', 'Frisörsalon'] },
    'beauty':             { type: 'beauty', type_name: 'Kosmetiksalon', type_aliases: ['Schönheitssalon', 'Beauty Salon', 'Kosmetik'] },
    'jewelry':            { type: 'jewelry', type_name: 'Juwelier', type_aliases: ['Schmuckgeschäft', 'Bijouterie'] },
    'tailor':             { type: 'tailor', type_name: 'Schneider', type_aliases: ['Schneiderei', 'Änderungsschneiderei'] },
    
    // General Retail
    'books':              { type: 'books', type_name: 'Buchhandlung', type_aliases: ['Buchladen', 'Bücher'] },
    'florist':            { type: 'florist', type_name: 'Blumenladen', type_aliases: ['Blumenbinderei', 'Blumengeschäft'] },
    'furniture':          { type: 'furniture', type_name: 'Möbelgeschäft', type_aliases: ['Möbelhaus', 'Einrichtungshaus'] },
    'electronics':        { type: 'electronics', type_name: 'Elektroniksgeschäft', type_aliases: ['Elektronik', 'Technikmarkt'] },
    'computer':           { type: 'computer', type_name: 'Computerladen', type_aliases: ['Computerfachgeschäft', 'PC-Geschäft'] },
    'mobile_phone':       { type: 'mobile_phone', type_name: 'Handyladen', type_aliases: ['Mobilfunk', 'Handyshop'] },
    'gift':               { type: 'gift', type_name: 'Geschenkeshop', type_aliases: ['Geschenkartikel', 'Souvenirladen'] },
    'toys':               { type: 'toys', type_name: 'Spielzeugladen', type_aliases: ['Spielwaren'] },
    'sports':             { type: 'sports', type_name: 'Sportgeschäft', type_aliases: ['Sportartikel', 'Sportfachgeschäft'] },
    'bicycle':            { type: 'bicycle', type_name: 'Fahrradladen', type_aliases: ['Fahrradgeschäft', 'Radgeschäft'] },
    'car':                { type: 'car', type_name: 'Autohaus', type_aliases: ['Autohändler', 'Fahrzeughandel'] },
    'car_parts':          {
      type: 'car_parts',
      type_name: 'Autoteilehandel',
      type_aliases: ['Kfz-Teile', 'Autoteile', 'Kfz-Zubehör']
    },
    'car_repair':         {
      type: 'car_repair',
      type_name: 'Autowerkstatt',
      type_aliases: ['Kfz-Werkstatt', 'Mechaniker', 'Garage']
    },
    'pet':                { type: 'pet', type_name: 'Tierhandlung', type_aliases: ['Zoofachgeschäft', 'Tiergeschäft'] },
    'department_store':   { type: 'department_store', type_name: 'Kaufhaus', type_aliases: ['Warenhaus'] },
    'mall':               { type: 'mall', type_name: 'Einkaufszentrum', type_aliases: ['Shoppingcenter', 'EKZ'] },
    'kiosk':              { type: 'kiosk', type_name: 'Kiosk', type_aliases: ['Zeitungskiosk', 'Trinkhalle'] },
    
    // Services
    'copyshop':           { type: 'copyshop', type_name: 'Copyshop', type_aliases: ['Druckerei', 'Kopierladen'] },
    'dry_cleaning':       { type: 'dry_cleaning', type_name: 'Reinigung', type_aliases: ['Chemische Reinigung', 'Textilreinigung'] },
    
    // Healthcare
    'chemist':            { type: 'chemist', type_name: 'Drogerie', type_aliases: ['Drogeriegeschäft', 'Kosmetika'] },
    'medical_supply':     { type: 'medical_supply', type_name: 'Sanitätshaus', type_aliases: ['Medizinbedarf', 'Orthopädie'] },
    'optician':           { type: 'optician', type_name: 'Optiker', type_aliases: ['Brillengeschäft', 'Augenoptiker'] }
  },
  
  'tourism': {
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Hotel', type_aliases: ['Gasthaus', 'Pension'] },
    'motel':              { type: 'motel', type_name: 'Motel', type_aliases: ['Motorhotel'] },
    'hostel':             { type: 'hostel', type_name: 'Jugendherberge', type_aliases: ['Hostel', 'Herberge'] },
    'guest_house':        { type: 'guest_house', type_name: 'Pension', type_aliases: ['Gästehaus', 'Fremdenzimmer'] },
    'apartment':          { type: 'apartment', type_name: 'Ferienwohnung', type_aliases: ['Appartement', 'Wohnung'] },
    'chalet':             { type: 'chalet', type_name: 'Chalet', type_aliases: ['Berghütte', 'Almhütte'] },
    'alpine_hut':         { type: 'alpine_hut', type_name: 'Almhütte', type_aliases: ['Berghütte', 'Schutzhütte'] },
    'wilderness_hut':     { type: 'wilderness_hut', type_name: 'Waldschutzhütte', type_aliases: ['Schutzhütte', 'Unterstand'] },
    'camp_site':          { type: 'camp_site', type_name: 'Campingplatz', type_aliases: ['Zeltplatz', 'Camping'] },
    'caravan_site':       { type: 'caravan_site', type_name: 'Wohnmobilstellplatz', type_aliases: ['Caravanpark', 'Campingplatz für Wohnmobile'] },
    
    // Attractions & Information
    'museum':             { type: 'museum', type_name: 'Museum', type_aliases: [] },
    'gallery':            { type: 'gallery', type_name: 'Kunstgalerie', type_aliases: ['Galerie', 'Ausstellung'] },
    'attraction':         { type: 'attraction', type_name: 'Sehenswürdigkeit', type_aliases: ['Attraktion', 'Touristenattraktion'] },
    'viewpoint':          { type: 'viewpoint', type_name: 'Aussichtspunkt', type_aliases: ['Aussicht', 'Panorama'] },
    'information':        { type: 'information', type_name: 'Touristeninformation', type_aliases: ['Info', 'Tourist-Info', 'Fremdenverkehrsamt'] },
    'theme_park':         { type: 'theme_park', type_name: 'Freizeitpark', type_aliases: ['Vergnügungspark', 'Themenpark'] },
    'zoo':                { type: 'zoo', type_name: 'Zoo', type_aliases: ['Tierpark', 'Zoologischer Garten'] },
    'aquarium':           { type: 'aquarium', type_name: 'Aquarium', type_aliases: ['Meeresaquarium'] }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name: 'Park', type_aliases: ['Stadtpark', 'Grünanlage'] },
    'playground':         { type: 'playground', type_name: 'Spielplatz', type_aliases: ['Kinderspielplatz'] },
    'dog_park':           { type: 'dog_park', type_name: 'Hundeauslaufgebiet', type_aliases: ['Hundepark', 'Hundezone'] },
    'garden':             { type: 'garden', type_name: 'Garten', type_aliases: ['Botanischer Garten', 'Anlage'] },
    'nature_reserve':     { type: 'nature_reserve', type_name: 'Naturschutzgebiet', type_aliases: ['Naturreservat', 'Schutzgebiet'] },
    
    // Sports & Recreation
    'sports_centre':      { type: 'sports_centre', type_name: 'Sportzentrum', type_aliases: ['Sportanlage', 'Sportcomplex'] },
    'stadium':            { type: 'stadium', type_name: 'Stadion', type_aliases: ['Arena', 'Sportarena'] },
    'swimming_pool':      { type: 'swimming_pool', type_name: 'Schwimmbad', type_aliases: ['Freibad', 'Hallenbad', 'Aquapark'] },
    'fitness_centre':     { type: 'fitness_centre', type_name: 'Fitnesscenter', type_aliases: ['Fitnessstudio', 'Sportstudio'] },
    'pitch':              { type: 'pitch', type_name: 'Sportplatz', type_aliases: ['Spielfeld', 'Fußballplatz'] },
    'track':              { type: 'track', type_name: 'Laufbahn', type_aliases: ['Rennbahn', 'Tartanbahn'] },
    'golf_course':        { type: 'golf_course', type_name: 'Golfplatz', type_aliases: ['Golfanlage', 'Golfclub'] },
    'miniature_golf':     { type: 'miniature_golf', type_name: 'Minigolfanlage', type_aliases: ['Minigolf', 'Kleingolf'] },
    'ice_rink':           { type: 'ice_rink', type_name: 'Eisstadion', type_aliases: ['Eisbahn', 'Eislauffläche'] },
    'fishing':            { type: 'fishing', type_name: 'Angelgewässer', type_aliases: ['Angelplatz', 'Fischerei'] },
    
    // Entertainment
    'amusement_arcade':   { type: 'amusement_arcade', type_name: 'Spielhalle', type_aliases: ['Arcade', 'Spielautomaten'] },
    'adult_gaming_centre': { type: 'adult_gaming_centre', type_name: 'Spielkasino', type_aliases: ['Spielhalle', 'Casino'] },
    'beach_resort':       { type: 'beach_resort', type_name: 'Strandresort', type_aliases: ['Strand', 'Strandanlage'] },
    'bandstand':          { type: 'bandstand', type_name: 'Musikpavillon', type_aliases: ['Pavillon', 'Konzertmuschel'] },
    'dance':              { type: 'dance', type_name: 'Tanzstudio', type_aliases: ['Tanzsaal', 'Tanzschule'] },
    'water_park':         { type: 'water_park', type_name: 'Wasserpark', type_aliases: ['Aquapark', 'Freizeitbad'] },
    
    // Education & Community
    'summer_camp':        { type: 'summer_camp', type_name: 'Ferienlager', type_aliases: ['Sommercamp', 'Ferienkurs'] },
    'hackerspace':        { type: 'hackerspace', type_name: 'Hackerspace', type_aliases: ['Makerspace', 'Technikraum'] }
  },
  
  'building': {
    // Religious
    'chapel':             { type: 'chapel', type_name: 'Kapelle', type_aliases: ['Feldkapelle', 'Wegkapelle'] },
    'church':             { type: 'church', type_name: 'Kirche', type_aliases: ['Gotteshaus', 'Dom', 'Münster'] },
    'mosque':             { type: 'mosque', type_name: 'Moschee', type_aliases: ['Islamisches Zentrum'] },
    'temple':             { type: 'temple', type_name: 'Tempel', type_aliases: ['Heiligtum'] },
    'synagogue':          { type: 'synagogue', type_name: 'Synagoge', type_aliases: ['Jüdisches Zentrum'] },
    'shrine':             { type: 'shrine', type_name: 'Wegkapelle', type_aliases: ['Schrein', 'Heiligenschrein'] },
    
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Hotelgebäude', type_aliases: ['Hotel'] },
    
    // Commercial & Retail
    'commercial':         { type: 'commercial', type_name: 'Geschäftsgebäude', type_aliases: ['Bürogebäude', 'Gewerbegebäude'] },
    'retail':             { type: 'retail', type_name: 'Einzelhandelsgebäude', type_aliases: ['Laden', 'Geschäft'] },
    
    // Public & Government
    'civic':              { type: 'civic', type_name: 'Öffentliches Gebäude', type_aliases: ['Verwaltungsgebäude', 'Behördengebäude'] },
    'public':             { type: 'public', type_name: 'Öffentliches Gebäude', type_aliases: ['Staatsgebäude'] },
    
    // Education
    'school':             { type: 'school', type_name: 'Schulgebäude', type_aliases: ['Schule'] },
    'university':         { type: 'university', type_name: 'Universitätsgebäude', type_aliases: ['Universität', 'Hochschule'] },
    
    // Healthcare
    'hospital':           { type: 'hospital', type_name: 'Krankenhausgebäude', type_aliases: ['Krankenhaus'] },
    
    // Entertainment
    'stadium':            { type: 'stadium', type_name: 'Stadiongebäude', type_aliases: ['Stadion'] },
    
    // Industry
    'farm':               { type: 'farm', type_name: 'Wirtschaftsgebäude', type_aliases: ['Bauernhof', 'Scheune', 'Stall'] },
    
    // Transportation
    'train_station':      { type: 'train_station', type_name: 'Bahnhofsgebäude', type_aliases: ['Bahnhof', 'Bahnstation'] },
    'transportation':     { type: 'transportation', type_name: 'Verkehrsgebäude', type_aliases: ['Bahnhof', 'Verkehrsknotenpunkt'] }
  },
  
  'railway': {
    'station':            { type: 'railway_station', type_name: 'Bahnhof', type_aliases: ['Bahnstation', 'Haltepunkt'] },
    'light_rail':         { type: 'light_rail', type_name: 'Stadtbahn', type_aliases: ['S-Bahn', 'Straßenbahn', 'Niederflurbahn'] },
    'subway':             { type: 'subway', type_name: 'U-Bahn', type_aliases: ['Untergrundbahn', 'Metro'] },
    'tram':               { type: 'tram', type_name: 'Straßenbahn', type_aliases: ['Tram', 'Tramway'] }
  },
  
  'craft': {
    '*':                  { type: 'craft', type_name: 'Handwerksbetrieb', type_aliases: ['Handwerker', 'Werkstatt', 'Betrieb'] }
  },
  
  'emergency': {
    'ambulance_station':  { type: 'ambulance_station', type_name: 'Rettungswache', type_aliases: ['Krankenwache', 'Notarztstation'] }
  },
  
  'historic': {
    'archaeological_site': { type: 'archaeological_site', type_name: 'Archäologische Stätte', type_aliases: ['Ausgrabungsstätte', 'Ruinen', 'Fundstätte'] },
    'monument':           { type: 'monument', type_name: 'Denkmal', type_aliases: ['Monument', 'Mahnmal', 'Gedenkstätte'] }
  },
  
  'military': {
    '*':                  { type: 'military', type_name: 'Militäranlage', type_aliases: ['Kaserne', 'Militärbasis'] }
  },
  
  'natural': {
    'wood':               { type: 'wood', type_name: 'Wald', type_aliases: ['Forst', 'Gehölz'] },
    'water':              { type: 'water', type_name: 'Gewässer', type_aliases: ['See', 'Teich', 'Stausee'] },
    'glacier':            { type: 'glacier', type_name: 'Gletscher', type_aliases: ['Eisfeld', 'Firn'] },
    'beach':              { type: 'beach', type_name: 'Strand', type_aliases: ['Ufer', 'Küste'] }
  },
  
  'office': {
    '*':                  { type: 'office', type_name: 'Büro', type_aliases: ['Firmenbüro', 'Kanzlei'] }
  },
  
  'sport': {
    '*':                  { type: 'sport', type_name: 'Sportanlage', type_aliases: ['Sportstätte', 'Sportfeld'] },
    'american_football':  { type: 'american_football', type_name: 'American-Football-Feld', type_aliases: ['American Football'] },
    'australian_football': { type: 'australian_football', type_name: 'Australian-Football-Feld', type_aliases: ['AFL'] },
    'badminton':          { type: 'badminton', type_name: 'Badmintonhalle', type_aliases: ['Badminton'] },
    'baseball':           { type: 'baseball', type_name: 'Baseballfeld', type_aliases: ['Baseball'] },
    'basketball':         { type: 'basketball', type_name: 'Basketballplatz', type_aliases: ['Basketball'] },
    'beachvolleyball':    { type: 'beachvolleyball', type_name: 'Beachvolleyballfeld', type_aliases: ['Beachvolleyball'] },
    'billiards':          { type: 'billiards', type_name: 'Billardraum', type_aliases: ['Billard', 'Snooker'] },
    'canadian_football':  { type: 'canadian_football', type_name: 'Canadian-Football-Feld', type_aliases: ['CFL'] },
    'chess':              { type: 'chess', type_name: 'Schachklub', type_aliases: ['Schach', 'Schachverein'] },
    'cricket':            { type: 'cricket', type_name: 'Cricketfeld', type_aliases: ['Cricket'] },
    'dog_racing':         { type: 'dog_racing', type_name: 'Windhundrennbahn', type_aliases: ['Hunderennen'] },
    'field_hockey':       { type: 'field_hockey', type_name: 'Hockeyfeld', type_aliases: ['Feldhockey'] },
    'gaelic_games':       { type: 'gaelic_games', type_name: 'Gälisches Sportfeld', type_aliases: ['GAA'] },
    'horse_racing':       { type: 'horse_racing', type_name: 'Pferderennbahn', type_aliases: ['Rennbahn', 'Galoppbahn'] },
    'ice_hockey':         { type: 'ice_hockey', type_name: 'Eishockeystadion', type_aliases: ['Eishockey'] },
    'karting':            { type: 'karting', type_name: 'Kartbahn', type_aliases: ['Kartrennen', 'Go-Kart'] },
    'rc_car':             { type: 'rc_car', type_name: 'RC-Fahrzeugbahn', type_aliases: ['RC-Bahn', 'Modellautobahn'] },
    'rugby_league':       { type: 'rugby_league', type_name: 'Rugby-League-Feld', type_aliases: ['Rugby'] },
    'rugby_union':        { type: 'rugby_union', type_name: 'Rugby-Union-Feld', type_aliases: ['Rugby'] },
    'safety_training':    { type: 'safety_training', type_name: 'Sicherheitstrainingszentrum', type_aliases: ['Sicherheitstraining', 'Fahrsicherheitszentrum'] }
  }
};
