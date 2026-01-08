/**
 * OSM tag to POI type mapping with Polish names and search aliases
 * Inspired by Nominatim's category/type system
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { 
 *       type: 'type_string', 
 *       type_name_pl: 'Polish Name',
 *       type_aliases_pl: ['Alias1', 'Alias2']  // Search variants
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
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name_pl: 'Przystanek autobusowy', type_aliases_pl: ['Przystanek'] },
    'bus_station':        { type: 'bus_station', type_name_pl: 'Dworzec autobusowy', type_aliases_pl: ['Dworzec', 'Stacja autobusowa'] },
    'ferry_terminal':     { type: 'ferry_terminal', type_name_pl: 'Terminal promowy', type_aliases_pl: ['Prom', 'Terminal'] },
    'taxi':               { type: 'taxi', type_name_pl: 'Postój taksówek', type_aliases_pl: ['Taxi', 'Taksówka'] },
    'parking':            { type: 'parking', type_name_pl: 'Parking', type_aliases_pl: ['Parkowanie', 'Miejsce parkingowe'] },
    'bicycle_parking':    { type: 'bicycle_parking', type_name_pl: 'Parking rowerowy', type_aliases_pl: ['Stojak rowerowy', 'Parking dla rowerów'] },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name_pl: 'Parking motocyklowy', type_aliases_pl: ['Parking dla motocykli'] },
    'charging_station':   { type: 'charging_station', type_name_pl: 'Stacja ładowania pojazdów elektrycznych', type_aliases_pl: ['Ładowarka', 'Punkt ładowania'] },
    'fuel':               { type: 'fuel', type_name_pl: 'Stacja paliw', type_aliases_pl: ['Stacja benzynowa', 'Dystrybutor paliw', 'Benzyna'] },
    'car_rental':         { type: 'car_rental', type_name_pl: 'Wypożyczalnia samochodów', type_aliases_pl: ['Wynajem aut', 'Rent a car'] },
    'car_wash':           { type: 'car_wash', type_name_pl: 'Myjnia samochodowa', type_aliases_pl: ['Myjnia'] },
    
    // Religion & Culture
    'place_of_worship':   { type: 'place_of_worship', type_name_pl: 'Kościół', type_aliases_pl: ['Świątynia', 'Parafia', 'Kaplica', 'Miejsce kultu'] },
    'theatre':            { type: 'theatre', type_name_pl: 'Teatr', type_aliases_pl: [] },
    'cinema':             { type: 'cinema', type_name_pl: 'Kino', type_aliases_pl: ['Multikino', 'Kino filmowe'] },
    'arts_centre':        { type: 'arts_centre', type_name_pl: 'Centrum sztuki', type_aliases_pl: ['Galeria', 'Dom kultury'] },
    'library':            { type: 'library', type_name_pl: 'Biblioteka', type_aliases_pl: [] },
    'community_centre':   { type: 'community_centre', type_name_pl: 'Dom kultury', type_aliases_pl: ['Świetlica', 'Centrum społeczne'] },
    'social_centre':      { type: 'social_centre', type_name_pl: 'Ośrodek społeczny', type_aliases_pl: ['Centrum społeczne'] },
    
    // Food & Drink
    'restaurant':         { type: 'restaurant', type_name_pl: 'Restauracja', type_aliases_pl: ['Lokal gastronomiczny', 'Jadłodajnia'] },
    'fast_food':          { type: 'fast_food', type_name_pl: 'Bar szybkiej obsługi', type_aliases_pl: ['Fast food', 'Szybka obsługa'] },
    'cafe':               { type: 'cafe', type_name_pl: 'Kawiarnia', type_aliases_pl: ['Cafe', 'Kafejka'] },
    'pub':                { type: 'pub', type_name_pl: 'Pub', type_aliases_pl: ['Piwiarnia'] },
    'bar':                { type: 'bar', type_name_pl: 'Bar', type_aliases_pl: [] },
    'biergarten':         { type: 'biergarten', type_name_pl: 'Ogródek piwny', type_aliases_pl: ['Pijalnia piwa'] },
    'food_court':         { type: 'food_court', type_name_pl: 'Strefa gastronomiczna', type_aliases_pl: ['Food court'] },
    'ice_cream':          { type: 'ice_cream', type_name_pl: 'Lodziarnia', type_aliases_pl: ['Lody'] },
    
    // Education
    'school':             { type: 'school', type_name_pl: 'Szkoła', type_aliases_pl: ['Szkoła podstawowa', 'Szkoła średnia', 'Placówka edukacyjna'] },
    'kindergarten':       { type: 'kindergarten', type_name_pl: 'Przedszkole', type_aliases_pl: ['Żłobek'] },
    'college':            { type: 'college', type_name_pl: 'Uczelnia wyższa', type_aliases_pl: ['Kolegium'] },
    'university':         { type: 'university', type_name_pl: 'Uniwersytet', type_aliases_pl: ['Uczelnia', 'Akademia', 'Politechnika'] },
    'driving_school':     { type: 'driving_school', type_name_pl: 'Ośrodek szkolenia kierowców', type_aliases_pl: ['Kurs prawa jazdy', 'Szkoła jazdy'] },
    
    // Healthcare
    'clinic':             { type: 'clinic', type_name_pl: 'Przychodnia', type_aliases_pl: ['Poradnia', 'Ośrodek zdrowia'] },
    'dentist':            { type: 'dentist', type_name_pl: 'Gabinet stomatologiczny', type_aliases_pl: ['Dentysta', 'Stomatolog'] },
    'doctors':            { type: 'doctors', type_name_pl: 'Gabinet lekarski', type_aliases_pl: ['Lekarz', 'Poradnia lekarska'] },
    'hospital':           { type: 'hospital', type_name_pl: 'Szpital', type_aliases_pl: ['Szpital miejski', 'Klinika'] },
    'pharmacy':           { type: 'pharmacy', type_name_pl: 'Apteka', type_aliases_pl: ['Punkt apteczny'] },
    'veterinary':         { type: 'veterinary', type_name_pl: 'Lecznica weterinaryjna', type_aliases_pl: ['Weterynarz', 'Gabinet weterynaryjny'] },
    'nursing_home':       { type: 'nursing_home', type_name_pl: 'Dom opieki', type_aliases_pl: ['Dom seniora', 'Dom spokojnej starości'] },
    
    // Finance
    'atm':                { type: 'atm', type_name_pl: 'Bankomat', type_aliases_pl: ['Wpłatomat'] },
    'bank':               { type: 'bank', type_name_pl: 'Bank', type_aliases_pl: ['Oddział banku', 'Placówka bankowa'] },
    'bureau_de_change':   { type: 'bureau_de_change', type_name_pl: 'Kantor wymiany walut', type_aliases_pl: ['Kantor', 'Wymiana walut'] },
    
    // Government & Public Services
    'police':             { type: 'police', type_name_pl: 'Posterunek policji', type_aliases_pl: ['Policja', 'Komisariat'] },
    'fire_station':       { type: 'fire_station', type_name_pl: 'Remiza strażacka', type_aliases_pl: ['Straż pożarna', 'OSP'] },
    'post_office':        { type: 'post_office', type_name_pl: 'Urząd pocztowy', type_aliases_pl: ['Poczta'] },
    'post_box':           { type: 'post_box', type_name_pl: 'Skrzynka pocztowa', type_aliases_pl: [] },
    'townhall':           { type: 'townhall', type_name_pl: 'Ratusz', type_aliases_pl: ['Urząd miejski', 'Urząd gminy'] },
    'courthouse':         { type: 'courthouse', type_name_pl: 'Sąd', type_aliases_pl: ['Sąd rejonowy', 'Sąd okręgowy'] },
    'embassy':            { type: 'embassy', type_name_pl: 'Ambasada', type_aliases_pl: ['Konsulat'] },
    'public_building':    { type: 'public_building', type_name_pl: 'Budynek użyteczności publicznej', type_aliases_pl: [] },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name_pl: 'Toaleta publiczna', type_aliases_pl: ['Toaleta', 'WC', 'Ubikacja'] },
    'drinking_water':     { type: 'drinking_water', type_name_pl: 'Pitna woda', type_aliases_pl: ['Poidełko', 'Źródełko'] },
    'fountain':           { type: 'fountain', type_name_pl: 'Fontanna', type_aliases_pl: [] },
    'recycling':          { type: 'recycling', type_name_pl: 'Punkt selektywnej zbiórki odpadów', type_aliases_pl: ['Recycling', 'Segregacja śmieci'] },
    'waste_disposal':     { type: 'waste_disposal', type_name_pl: 'Punkt wywozu śmieci', type_aliases_pl: ['Śmietnik'] },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name_pl: 'Targ', type_aliases_pl: ['Rynek', 'Bazar'] },
    'vending_machine':    { type: 'vending_machine', type_name_pl: 'Automat sprzedający', type_aliases_pl: ['Automat'] },
    'telephone':          { type: 'telephone', type_name_pl: 'Telefon publiczny', type_aliases_pl: ['Budka telefoniczna'] },
    'internet_cafe':      { type: 'internet_cafe', type_name_pl: 'Kawiarenka internetowa', type_aliases_pl: [] },
    'coworking_space':    { type: 'coworking_space', type_name_pl: 'Przestrzeń coworkingowa', type_aliases_pl: ['Coworking'] },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name_pl: 'Klub nocny', type_aliases_pl: ['Dyskoteka', 'Klub'] },
    'casino':             { type: 'casino', type_name_pl: 'Kasyno', type_aliases_pl: [] },
    'gambling':           { type: 'gambling', type_name_pl: 'Miejsce hazardu', type_aliases_pl: [] },
    
    // Recreation
    'gym':                { type: 'gym', type_name_pl: 'Siłownia', type_aliases_pl: ['Fitness', 'Sala fitness', 'Klub fitness'] },
    'bbq':                { type: 'bbq', type_name_pl: 'Miejsce do grillowania', type_aliases_pl: ['Grill', 'Miejsce grillowe'] }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name_pl: 'Przystanek autobusowy', type_aliases_pl: ['Przystanek'] },
    'platform':           { type: 'platform', type_name_pl: 'Peron', type_aliases_pl: [] },
    'rest_area':          { type: 'rest_area', type_name_pl: 'Miejsce odpoczynku', type_aliases_pl: ['MOP'] },
    'services':           { type: 'services', type_name_pl: 'Miejsce obsługi podróżnych', type_aliases_pl: ['MOP'] }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name_pl: 'Peron', type_aliases_pl: [] },
    'station':            { type: 'station', type_name_pl: 'Stacja', type_aliases_pl: ['Dworzec'] },
    'stop_position':      { type: 'stop_position', type_name_pl: 'Pozycja przystanku', type_aliases_pl: [] }
  },
  
  'shop': {
    'supermarket':        { type: 'supermarket', type_name_pl: 'Supermarket', type_aliases_pl: ['Market', 'Sklep spożywczy'] },
    'convenience':        { type: 'convenience', type_name_pl: 'Sklep ogólnospożywczy', type_aliases_pl: ['Sklep osiedlowy', 'Sklep spożywczy'] },
    'bakery':             { type: 'bakery', type_name_pl: 'Piekarnia', type_aliases_pl: ['Piekarz', 'Cukiernia'] },
    'butcher':            { type: 'butcher', type_name_pl: 'Sklep mięsny', type_aliases_pl: ['Rzeźnik', 'Masarnia'] },
    'cheese':             { type: 'cheese', type_name_pl: 'Sklep z serami', type_aliases_pl: [] },
    'chocolate':          { type: 'chocolate', type_name_pl: 'Sklep z czekoladą', type_aliases_pl: [] },
    'beverages':          { type: 'beverages', type_name_pl: 'Sklep z napojami', type_aliases_pl: [] },
    'alcohol':            { type: 'alcohol', type_name_pl: 'Sklep monopolowy', type_aliases_pl: ['Monopolowy', 'Alkohole'] },
    'clothes':            { type: 'clothes', type_name_pl: 'Sklep odzieżowy', type_aliases_pl: ['Odzież', 'Ubrania'] },
    'shoes':              { type: 'shoes', type_name_pl: 'Sklep obuwniczy', type_aliases_pl: ['Buty', 'Obuwie'] },
    'hairdresser':        { type: 'hairdresser', type_name_pl: 'Fryzjer', type_aliases_pl: ['Salon fryzjerski', 'Fryzjerstwo'] },
    'beauty':             { type: 'beauty', type_name_pl: 'Salon kosmetyczny', type_aliases_pl: ['Gabinet kosmetyczny', 'Kosmetyczka'] },
    'jewelry':            { type: 'jewelry', type_name_pl: 'Jubiler', type_aliases_pl: ['Biżuteria'] },
    'books':              { type: 'books', type_name_pl: 'Księgarnia', type_aliases_pl: ['Książki'] },
    'florist':            { type: 'florist', type_name_pl: 'Kwiaciarnia', type_aliases_pl: ['Kwiaty'] },
    'furniture':          { type: 'furniture', type_name_pl: 'Sklep meblowy', type_aliases_pl: ['Meble'] },
    'electronics':        { type: 'electronics', type_name_pl: 'Sklep z elektroniką', type_aliases_pl: ['Elektronika', 'RTV'] },
    'computer':           { type: 'computer', type_name_pl: 'Sklep komputerowy', type_aliases_pl: ['Komputery'] },
    'mobile_phone':       { type: 'mobile_phone', type_name_pl: 'Sklep z telefonami', type_aliases_pl: ['Telefony', 'GSM'] },
    'gift':               { type: 'gift', type_name_pl: 'Sklep z upominkami', type_aliases_pl: ['Upominki', 'Prezenty'] },
    'toys':               { type: 'toys', type_name_pl: 'Sklep z zabawkami', type_aliases_pl: ['Zabawki'] },
    'sports':             { type: 'sports', type_name_pl: 'Sklep sportowy', type_aliases_pl: ['Sport', 'Artykuły sportowe'] },
    'bicycle':            { type: 'bicycle', type_name_pl: 'Sklep rowerowy', type_aliases_pl: ['Rowery'] },
    'car':                { type: 'car', type_name_pl: 'Salon samochodowy', type_aliases_pl: ['Samochody', 'Dealer'] },
    'car_parts':          { type: 'car_parts', type_name_pl: 'Sklep z częściami samochodowymi', type_aliases_pl: ['Części samochodowe', 'Autoczęści'] },
    'car_repair':         { type: 'car_repair', type_name_pl: 'Warsztat samochodowy', type_aliases_pl: ['Warsztat', 'Mechanik', 'Serwis samochodowy'] },
    'pet':                { type: 'pet', type_name_pl: 'Sklep zoologiczny', type_aliases_pl: ['Zoo sklep', 'Karmy dla zwierząt'] },
    'department_store':   { type: 'department_store', type_name_pl: 'Dom towarowy', type_aliases_pl: [] },
    'mall':               { type: 'mall', type_name_pl: 'Centrum handlowe', type_aliases_pl: ['Galeria handlowa'] },
    'kiosk':              { type: 'kiosk', type_name_pl: 'Kiosk', type_aliases_pl: [] }
  },
  
  'tourism': {
    'hotel':              { type: 'hotel', type_name_pl: 'Hotel', type_aliases_pl: [] },
    'motel':              { type: 'motel', type_name_pl: 'Motel', type_aliases_pl: [] },
    'hostel':             { type: 'hostel', type_name_pl: 'Hostel', type_aliases_pl: ['Schronisko'] },
    'guest_house':        { type: 'guest_house', type_name_pl: 'Pensjonat', type_aliases_pl: ['Gościniec'] },
    'apartment':          { type: 'apartment', type_name_pl: 'Apartament', type_aliases_pl: [] },
    'camp_site':          { type: 'camp_site', type_name_pl: 'Kemping', type_aliases_pl: ['Pole namiotowe'] },
    'museum':             { type: 'museum', type_name_pl: 'Muzeum', type_aliases_pl: [] },
    'gallery':            { type: 'gallery', type_name_pl: 'Galeria sztuki', type_aliases_pl: ['Galeria'] },
    'attraction':         { type: 'attraction', type_name_pl: 'Atrakcja turystyczna', type_aliases_pl: ['Atrakcja'] },
    'viewpoint':          { type: 'viewpoint', type_name_pl: 'Punkt widokowy', type_aliases_pl: ['Widok'] },
    'information':        { type: 'information', type_name_pl: 'Informacja turystyczna', type_aliases_pl: ['Info', 'Punkt informacyjny'] },
    'theme_park':         { type: 'theme_park', type_name_pl: 'Park rozrywki', type_aliases_pl: ['Wesołe miasteczko'] },
    'zoo':                { type: 'zoo', type_name_pl: 'Zoo', type_aliases_pl: ['Ogród zoologiczny'] },
    'aquarium':           { type: 'aquarium', type_name_pl: 'Akwarium', type_aliases_pl: [] }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name_pl: 'Park', type_aliases_pl: ['Ogród publiczny', 'Zieleń miejska'] },
    'playground':         { type: 'playground', type_name_pl: 'Plac zabaw', type_aliases_pl: ['Plac dla dzieci', 'Ogródek zabaw'] },
    'sports_centre':      { type: 'sports_centre', type_name_pl: 'Centrum sportowe', type_aliases_pl: [] },
    'stadium':            { type: 'stadium', type_name_pl: 'Stadion', type_aliases_pl: [] },
    'swimming_pool':      { type: 'swimming_pool', type_name_pl: 'Basen', type_aliases_pl: ['Pływalnia', 'Aquapark'] },
    'fitness_centre':     { type: 'fitness_centre', type_name_pl: 'Centrum fitness', type_aliases_pl: ['Fitness', 'Siłownia'] },
    'pitch':              { type: 'pitch', type_name_pl: 'Boisko sportowe', type_aliases_pl: ['Boisko'] },
    'golf_course':        { type: 'golf_course', type_name_pl: 'Pole golfowe', type_aliases_pl: ['Golf'] },
    'garden':             { type: 'garden', type_name_pl: 'Ogród', type_aliases_pl: [] },
    'nature_reserve':     { type: 'nature_reserve', type_name_pl: 'Rezerwat przyrody', type_aliases_pl: ['Rezerwat'] }
  },
  
  'building': {
    'chapel':             { type: 'chapel', type_name_pl: 'Kaplica', type_aliases_pl: [] },
    'church':             { type: 'church', type_name_pl: 'Kościół', type_aliases_pl: ['Świątynia', 'Parafia'] },
    'mosque':             { type: 'mosque', type_name_pl: 'Meczet', type_aliases_pl: [] },
    'temple':             { type: 'temple', type_name_pl: 'Świątynia', type_aliases_pl: [] },
    'synagogue':          { type: 'synagogue', type_name_pl: 'Synagoga', type_aliases_pl: [] },
    'shrine':             { type: 'shrine', type_name_pl: 'Kapliczka', type_aliases_pl: [] }
  }
};
