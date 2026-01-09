/**
 * OSM tag to POI type mapping with Polish names and search aliases
 * Language: Polish (PL)
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { 
 *       type: 'type_string', 
 *       type_name: 'Polish Name',
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
 *       "type_name": "Przystanek autobusowy"
 *     }
 *   }
 * }
 * 
 * Search aliases allow users to find POIs using various Polish naming variants.
 */

module.exports = {
  'aeroway': {
    'aerodrome': {
      type: 'aerodrome',
      type_name: 'Lotnisko',
      type_aliases: ['Port lotniczy', 'Lądowisko']
    },
    'heliport': {
      type: 'heliport',
      type_name: 'Lądowisko dla helikopterów',
      type_aliases: ['Heliport']
    },
    'helipad': {
      type: 'helipad',
      type_name: 'Lądowisko helikopterowe',
      type_aliases: ['Helipad']
    },
    'aerodrome_gate': {
      type: 'aerodrome_gate',
      type_name: 'Bramka lotniskowa',
      type_aliases: ['Gate', 'Bramka']
    },
    'terminal': {
      type: 'terminal',
      type_name: 'Terminal lotniczy',
      type_aliases: ['Terminal']
    }
  },
  
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name: 'Przystanek autobusowy', type_aliases: ['Przystanek'] },
    'bus_station':        { type: 'bus_station', type_name: 'Dworzec autobusowy', type_aliases: ['Dworzec', 'Stacja autobusowa'] },
    'ferry_terminal':     { type: 'ferry_terminal', type_name: 'Terminal promowy', type_aliases: ['Prom', 'Terminal'] },
    'taxi':               { type: 'taxi', type_name: 'Postój taksówek', type_aliases: ['Taxi', 'Taksówka'] },
    'parking':            { type: 'parking', type_name: 'Parking', type_aliases: ['Parkowanie', 'Miejsce parkingowe'] },
    'bicycle_parking':    {
      type: 'bicycle_parking',
      type_name: 'Parking rowerowy',
      type_aliases: ['Stojak rowerowy', 'Parking dla rowerów']
    },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name: 'Parking motocyklowy', type_aliases: ['Parking dla motocykli'] },
    'charging_station':   {
      type: 'charging_station',
      type_name: 'Stacja ładowania pojazdów elektrycznych',
      type_aliases: ['Ładowarka', 'Punkt ładowania']
    },
    'fuel':               { type: 'fuel', type_name: 'Stacja paliw', type_aliases: ['Stacja benzynowa', 'Dystrybutor paliw', 'Benzyna'] },
    'car_rental':         { type: 'car_rental', type_name: 'Wypożyczalnia samochodów', type_aliases: ['Wynajem aut', 'Rent a car'] },
    'car_wash':           { type: 'car_wash', type_name: 'Myjnia samochodowa', type_aliases: ['Myjnia'] },
    
    // Religion & Culture
    'place_of_worship':   {
      type: 'place_of_worship',
      type_name: 'Kościół',
      type_aliases: ['Świątynia', 'Parafia', 'Kaplica', 'Miejsce kultu']
    },
    'theatre':            { type: 'theatre', type_name: 'Teatr', type_aliases: [] },
    'cinema':             { type: 'cinema', type_name: 'Kino', type_aliases: ['Multikino', 'Kino filmowe'] },
    'arts_centre':        { type: 'arts_centre', type_name: 'Centrum sztuki', type_aliases: ['Galeria', 'Dom kultury'] },
    'library':            { type: 'library', type_name: 'Biblioteka', type_aliases: [] },
    'community_centre':   { type: 'community_centre', type_name: 'Dom kultury', type_aliases: ['Świetlica', 'Centrum społeczne'] },
    'social_centre':      { type: 'social_centre', type_name: 'Ośrodek społeczny', type_aliases: ['Centrum społeczne'] },
    
    // Food & Drink
    'restaurant':         {
      type: 'restaurant',
      type_name: 'Restauracja',
      type_aliases: ['Lokal gastronomiczny', 'Jadłodajnia', 'Bar', 'Pub']
    },
    'fast_food':          {
      type: 'fast_food',
      type_name: 'Bar szybkiej obsługi',
      type_aliases: ['Fast food', 'Szybka obsługa', 'Restauracja', 'Bar', 'Pub']
    },
    'cafe':               { type: 'cafe', type_name: 'Kawiarnia', type_aliases: ['Cafe', 'Kafejka'] },
    'pub':                { type: 'pub', type_name: 'Pub', type_aliases: ['Piwiarnia', 'Pub', 'Bar', 'Restauracja'] },
    'bar':                { type: 'bar', type_name: 'Bar', type_aliases: ['Bar', 'Restauracja'] },
    'biergarten':         {
      type: 'biergarten',
      type_name: 'Ogródek piwny',
      type_aliases: ['Pijalnia piwa', 'Ogródek piwny', 'Bar', 'Pub', 'Restauracja']
    },
    'food_court':         {
      type: 'food_court',
      type_name: 'Strefa gastronomiczna',
      type_aliases: ['Food court', 'Strefa gastronomiczna', 'Bar', 'Pub', 'Restauracja']
    },
    'ice_cream':          { type: 'ice_cream', type_name: 'Lodziarnia', type_aliases: ['Lody'] },
    
    // Education
    'school':             {
      type: 'school',
      type_name: 'Szkoła',
      type_aliases: ['Szkoła podstawowa', 'Szkoła średnia', 'Placówka edukacyjna']
    },
    'kindergarten':       { type: 'kindergarten', type_name: 'Przedszkole', type_aliases: ['Żłobek'] },
    'college':            { type: 'college', type_name: 'Uczelnia wyższa', type_aliases: ['Kolegium'] },
    'university':         { type: 'university', type_name: 'Uniwersytet', type_aliases: ['Uczelnia', 'Akademia', 'Politechnika'] },
    'driving_school':     {
      type: 'driving_school',
      type_name: 'Ośrodek szkolenia kierowców',
      type_aliases: ['Kurs prawa jazdy', 'Szkoła jazdy']
    },
    
    // Healthcare
    'clinic':             { type: 'clinic', type_name: 'Przychodnia', type_aliases: ['Poradnia', 'Ośrodek zdrowia'] },
    'dentist':            { type: 'dentist', type_name: 'Gabinet stomatologiczny', type_aliases: ['Dentysta', 'Stomatolog'] },
    'doctors':            { type: 'doctors', type_name: 'Gabinet lekarski', type_aliases: ['Lekarz', 'Poradnia lekarska'] },
    'hospital':           { type: 'hospital', type_name: 'Szpital', type_aliases: ['Szpital miejski', 'Klinika'] },
    'pharmacy':           { type: 'pharmacy', type_name: 'Apteka', type_aliases: ['Punkt apteczny'] },
    'veterinary':         {
      type: 'veterinary',
      type_name: 'Lecznica weterinaryjna',
      type_aliases: ['Weterynarz', 'Gabinet weterynaryjny']
    },
    'nursing_home':       { type: 'nursing_home', type_name: 'Dom opieki', type_aliases: ['Dom seniora', 'Dom spokojnej starości'] },
    
    // Finance
    'atm':                { type: 'atm', type_name: 'Bankomat', type_aliases: ['Wpłatomat'] },
    'bank':               { type: 'bank', type_name: 'Bank', type_aliases: ['Oddział banku', 'Placówka bankowa'] },
    'bureau_de_change':   { type: 'bureau_de_change', type_name: 'Kantor wymiany walut', type_aliases: ['Kantor', 'Wymiana walut'] },
    
    // Government & Public Services
    'police':             { type: 'police', type_name: 'Posterunek policji', type_aliases: ['Policja', 'Komisariat'] },
    'fire_station':       { type: 'fire_station', type_name: 'Remiza strażacka', type_aliases: ['Straż pożarna', 'OSP'] },
    'post_office':        { type: 'post_office', type_name: 'Urząd pocztowy', type_aliases: ['Poczta'] },
    'post_box':           { type: 'post_box', type_name: 'Skrzynka pocztowa', type_aliases: [] },
    'townhall':           { type: 'townhall', type_name: 'Ratusz', type_aliases: ['Urząd miejski', 'Urząd gminy'] },
    'courthouse':         { type: 'courthouse', type_name: 'Sąd', type_aliases: ['Sąd rejonowy', 'Sąd okręgowy'] },
    'embassy':            { type: 'embassy', type_name: 'Ambasada', type_aliases: ['Konsulat'] },
    'public_building':    { type: 'public_building', type_name: 'Budynek użyteczności publicznej', type_aliases: [] },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name: 'Toaleta publiczna', type_aliases: ['Toaleta', 'WC', 'Ubikacja'] },
    'drinking_water':     { type: 'drinking_water', type_name: 'Pitna woda', type_aliases: ['Poidełko', 'Źródełko'] },
    'fountain':           { type: 'fountain', type_name: 'Fontanna', type_aliases: [] },
    'recycling':          {
      type: 'recycling',
      type_name: 'Punkt selektywnej zbiórki odpadów',
      type_aliases: ['Recycling', 'Segregacja śmieci']
    },
    'waste_disposal':     { type: 'waste_disposal', type_name: 'Punkt wywozu śmieci', type_aliases: ['Śmietnik'] },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name: 'Targ', type_aliases: ['Rynek', 'Bazar'] },
    'vending_machine':    { type: 'vending_machine', type_name: 'Automat sprzedający', type_aliases: ['Automat'] },
    'telephone':          { type: 'telephone', type_name: 'Telefon publiczny', type_aliases: ['Budka telefoniczna'] },
    'internet_cafe':      { type: 'internet_cafe', type_name: 'Kawiarenka internetowa', type_aliases: [] },
    'coworking_space':    { type: 'coworking_space', type_name: 'Przestrzeń coworkingowa', type_aliases: ['Coworking'] },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name: 'Klub nocny', type_aliases: ['Dyskoteka', 'Klub'] },
    'casino':             { type: 'casino', type_name: 'Kasyno', type_aliases: [] },
    'gambling':           { type: 'gambling', type_name: 'Miejsce hazardu', type_aliases: [] },
    
    // Recreation
    'gym':                { type: 'gym', type_name: 'Siłownia', type_aliases: ['Fitness', 'Sala fitness', 'Klub fitness'] },
    'bbq':                { type: 'bbq', type_name: 'Miejsce do grillowania', type_aliases: ['Grill', 'Miejsce grillowe'] }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name: 'Przystanek autobusowy', type_aliases: ['Przystanek'] },
    'platform':           { type: 'platform', type_name: 'Peron', type_aliases: [] },
    'rest_area':          { type: 'rest_area', type_name: 'Miejsce odpoczynku', type_aliases: ['MOP'] },
    'services':           { type: 'services', type_name: 'Miejsce obsługi podróżnych', type_aliases: ['MOP'] }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name: 'Peron', type_aliases: [] },
    'station':            { type: 'station', type_name: 'Stacja', type_aliases: ['Dworzec'] },
    'stop_position':      { type: 'stop_position', type_name: 'Pozycja przystanku', type_aliases: [] }
  },
  
  'shop': {
    'supermarket':        { type: 'supermarket', type_name: 'Supermarket', type_aliases: ['Market', 'Sklep spożywczy'] },
    'convenience':        { type: 'convenience', type_name: 'Sklep ogólnospożywczy', type_aliases: ['Sklep osiedlowy', 'Sklep spożywczy'] },
    'bakery':             { type: 'bakery', type_name: 'Piekarnia', type_aliases: ['Piekarz', 'Cukiernia'] },
    'butcher':            { type: 'butcher', type_name: 'Sklep mięsny', type_aliases: ['Rzeźnik', 'Masarnia'] },
    'cheese':             { type: 'cheese', type_name: 'Sklep z serami', type_aliases: [] },
    'chocolate':          { type: 'chocolate', type_name: 'Sklep z czekoladą', type_aliases: [] },
    'beverages':          { type: 'beverages', type_name: 'Sklep z napojami', type_aliases: [] },
    'alcohol':            { type: 'alcohol', type_name: 'Sklep monopolowy', type_aliases: ['Monopolowy', 'Alkohole'] },
    'clothes':            { type: 'clothes', type_name: 'Sklep odzieżowy', type_aliases: ['Odzież', 'Ubrania'] },
    'shoes':              { type: 'shoes', type_name: 'Sklep obuwniczy', type_aliases: ['Buty', 'Obuwie'] },
    'hairdresser':        { type: 'hairdresser', type_name: 'Fryzjer', type_aliases: ['Salon fryzjerski', 'Fryzjerstwo'] },
    'beauty':             { type: 'beauty', type_name: 'Salon kosmetyczny', type_aliases: ['Gabinet kosmetyczny', 'Kosmetyczka'] },
    'jewelry':            { type: 'jewelry', type_name: 'Jubiler', type_aliases: ['Biżuteria'] },
    'books':              { type: 'books', type_name: 'Księgarnia', type_aliases: ['Książki'] },
    'florist':            { type: 'florist', type_name: 'Kwiaciarnia', type_aliases: ['Kwiaty'] },
    'furniture':          { type: 'furniture', type_name: 'Sklep meblowy', type_aliases: ['Meble'] },
    'electronics':        { type: 'electronics', type_name: 'Sklep z elektroniką', type_aliases: ['Elektronika', 'RTV'] },
    'computer':           { type: 'computer', type_name: 'Sklep komputerowy', type_aliases: ['Komputery'] },
    'mobile_phone':       { type: 'mobile_phone', type_name: 'Sklep z telefonami', type_aliases: ['Telefony', 'GSM'] },
    'gift':               { type: 'gift', type_name: 'Sklep z upominkami', type_aliases: ['Upominki', 'Prezenty'] },
    'toys':               { type: 'toys', type_name: 'Sklep z zabawkami', type_aliases: ['Zabawki'] },
    'sports':             { type: 'sports', type_name: 'Sklep sportowy', type_aliases: ['Sport', 'Artykuły sportowe'] },
    'bicycle':            { type: 'bicycle', type_name: 'Sklep rowerowy', type_aliases: ['Rowery'] },
    'car':                { type: 'car', type_name: 'Salon samochodowy', type_aliases: ['Samochody', 'Dealer'] },
    'car_parts':          {
      type: 'car_parts',
      type_name: 'Sklep z częściami samochodowymi',
      type_aliases: ['Części samochodowe', 'Autoczęści']
    },
    'car_repair':         {
      type: 'car_repair',
      type_name: 'Warsztat samochodowy',
      type_aliases: ['Warsztat', 'Mechanik', 'Serwis samochodowy']
    },
    'pet':                { type: 'pet', type_name: 'Sklep zoologiczny', type_aliases: ['Zoo sklep', 'Karmy dla zwierząt'] },
    'department_store':   { type: 'department_store', type_name: 'Dom towarowy', type_aliases: [] },
    'mall':               { type: 'mall', type_name: 'Centrum handlowe', type_aliases: ['Galeria handlowa'] },
    'kiosk':              { type: 'kiosk', type_name: 'Kiosk', type_aliases: [] }
  },
  
  'tourism': {
    'hotel':              { type: 'hotel', type_name: 'Hotel', type_aliases: [] },
    'motel':              { type: 'motel', type_name: 'Motel', type_aliases: [] },
    'hostel':             { type: 'hostel', type_name: 'Hostel', type_aliases: ['Schronisko'] },
    'guest_house':        { type: 'guest_house', type_name: 'Pensjonat', type_aliases: ['Gościniec'] },
    'apartment':          { type: 'apartment', type_name: 'Apartament', type_aliases: [] },
    'camp_site':          { type: 'camp_site', type_name: 'Kemping', type_aliases: ['Pole namiotowe'] },
    'museum':             { type: 'museum', type_name: 'Muzeum', type_aliases: [] },
    'gallery':            { type: 'gallery', type_name: 'Galeria sztuki', type_aliases: ['Galeria'] },
    'attraction':         { type: 'attraction', type_name: 'Atrakcja turystyczna', type_aliases: ['Atrakcja'] },
    'viewpoint':          { type: 'viewpoint', type_name: 'Punkt widokowy', type_aliases: ['Widok'] },
    'information':        { type: 'information', type_name: 'Informacja turystyczna', type_aliases: ['Info', 'Punkt informacyjny'] },
    'theme_park':         { type: 'theme_park', type_name: 'Park rozrywki', type_aliases: ['Wesołe miasteczko'] },
    'zoo':                { type: 'zoo', type_name: 'Zoo', type_aliases: ['Ogród zoologiczny'] },
    'aquarium':           { type: 'aquarium', type_name: 'Akwarium', type_aliases: [] }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name: 'Park', type_aliases: ['Ogród publiczny', 'Zieleń miejska'] },
    'playground':         { type: 'playground', type_name: 'Plac zabaw', type_aliases: ['Plac dla dzieci', 'Ogródek zabaw'] },
    'sports_centre':      { type: 'sports_centre', type_name: 'Centrum sportowe', type_aliases: [] },
    'stadium':            { type: 'stadium', type_name: 'Stadion', type_aliases: [] },
    'swimming_pool':      { type: 'swimming_pool', type_name: 'Basen', type_aliases: ['Pływalnia', 'Aquapark'] },
    'fitness_centre':     { type: 'fitness_centre', type_name: 'Centrum fitness', type_aliases: ['Fitness', 'Siłownia'] },
    'pitch':              { type: 'pitch', type_name: 'Boisko sportowe', type_aliases: ['Boisko'] },
    'golf_course':        { type: 'golf_course', type_name: 'Pole golfowe', type_aliases: ['Golf'] },
    'garden':             { type: 'garden', type_name: 'Ogród', type_aliases: [] },
    'nature_reserve':     { type: 'nature_reserve', type_name: 'Rezerwat przyrody', type_aliases: ['Rezerwat'] }
  },
  
  'building': {
    'chapel':             { type: 'chapel', type_name: 'Kaplica', type_aliases: [] },
    'church':             { type: 'church', type_name: 'Kościół', type_aliases: ['Świątynia', 'Parafia'] },
    'mosque':             { type: 'mosque', type_name: 'Meczet', type_aliases: [] },
    'temple':             { type: 'temple', type_name: 'Świątynia', type_aliases: [] },
    'synagogue':          { type: 'synagogue', type_name: 'Synagoga', type_aliases: [] },
    'shrine':             { type: 'shrine', type_name: 'Kapliczka', type_aliases: [] }
  }
};
