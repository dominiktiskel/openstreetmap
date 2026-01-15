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
  'aerialway': {
    '*':                  { type: 'aerialway', type_name: 'Kolej linowa', type_aliases: ['Kolejka linowa', 'Wyciąg', 'Gondola'] }
  },
  
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
    'parking_space':      { type: 'parking_space', type_name: 'Miejsce parkingowe', type_aliases: ['Miejsce postojowe', 'Parking'] },
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
    'planetarium':        { type: 'planetarium', type_name: 'Planetarium', type_aliases: ['Obserwatorium'] },
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
    
    // Healthcare & Social Services
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
    'social_facility':    { type: 'social_facility', type_name: 'Ośrodek pomocy społecznej', type_aliases: ['Pomoc społeczna', 'OPS'] },
    
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
    'ranger_station':     { type: 'ranger_station', type_name: 'Posterunek straży leśnej', type_aliases: ['Straż leśna', 'Leśniczówka'] },
    'register_office':    { type: 'register_office', type_name: 'Urząd stanu cywilnego', type_aliases: ['USC', 'Urząd cywilny'] },
    
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
    
    // Recreation & Sports
    'dojo':               { type: 'dojo', type_name: 'Dojo', type_aliases: ['Sala treningowa sztuk walki', 'Klub sztuk walki'] },
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
    'station':            { type: 'station', type_name: 'Dworzec', type_aliases: ['Stacja'] },
    'stop_position':      { type: 'stop_position', type_name: 'Pozycja przystanku', type_aliases: [] }
  },
  
  'shop': {
    // Food & Groceries
    'supermarket':        { type: 'supermarket', type_name: 'Supermarket', type_aliases: ['Market', 'Sklep spożywczy'] },
    'convenience':        { type: 'convenience', type_name: 'Sklep ogólnospożywczy', type_aliases: ['Sklep osiedlowy', 'Sklep spożywczy'] },
    'bakery':             { type: 'bakery', type_name: 'Piekarnia', type_aliases: ['Piekarz', 'Cukiernia'] },
    'butcher':            { type: 'butcher', type_name: 'Sklep mięsny', type_aliases: ['Rzeźnik', 'Masarnia'] },
    'cheese':             { type: 'cheese', type_name: 'Sklep z serami', type_aliases: ['Sery'] },
    'chocolate':          { type: 'chocolate', type_name: 'Sklep z czekoladą', type_aliases: ['Czekolada'] },
    'coffee':             { type: 'coffee', type_name: 'Sklep z kawą', type_aliases: ['Kawa', 'Palarnia kawy'] },
    'deli':               { type: 'deli', type_name: 'Delikatesy', type_aliases: ['Deli'] },
    'greengrocer':        { type: 'greengrocer', type_name: 'Warzywniak', type_aliases: ['Owoce i warzywa', 'Sklep owocowo-warzywny'] },
    'seafood':            { type: 'seafood', type_name: 'Sklep rybny', type_aliases: ['Ryby', 'Owoce morza'] },
    'beverages':          { type: 'beverages', type_name: 'Sklep z napojami', type_aliases: ['Napoje'] },
    'alcohol':            { type: 'alcohol', type_name: 'Sklep monopolowy', type_aliases: ['Monopolowy', 'Alkohole'] },
    
    // Fashion & Personal Care
    'clothes':            { type: 'clothes', type_name: 'Sklep odzieżowy', type_aliases: ['Odzież', 'Ubrania'] },
    'shoes':              { type: 'shoes', type_name: 'Sklep obuwniczy', type_aliases: ['Buty', 'Obuwie'] },
    'hairdresser':        { type: 'hairdresser', type_name: 'Fryzjer', type_aliases: ['Salon fryzjerski', 'Fryzjerstwo'] },
    'beauty':             { type: 'beauty', type_name: 'Salon kosmetyczny', type_aliases: ['Gabinet kosmetyczny', 'Kosmetyczka'] },
    'jewelry':            { type: 'jewelry', type_name: 'Jubiler', type_aliases: ['Biżuteria'] },
    'tailor':             { type: 'tailor', type_name: 'Krawiec', type_aliases: ['Krawiectwo', 'Poprawki odzieży'] },
    
    // General Retail
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
    'kiosk':              { type: 'kiosk', type_name: 'Kiosk', type_aliases: [] },
    
    // Services
    'copyshop':           { type: 'copyshop', type_name: 'Kserokopiarka', type_aliases: ['Punkt kserograficzny', 'Druk'] },
    'dry_cleaning':       { type: 'dry_cleaning', type_name: 'Pralnia chemiczna', type_aliases: ['Pralnia', 'Czyszczenie'] },
    
    // Healthcare
    'chemist':            { type: 'chemist', type_name: 'Drogeria', type_aliases: ['Kosmetyki', 'Apteka'] },
    'medical_supply':     { type: 'medical_supply', type_name: 'Sklep medyczny', type_aliases: ['Sprzęt medyczny', 'Artykuły medyczne'] },
    'optician':           { type: 'optician', type_name: 'Optyk', type_aliases: ['Okulary', 'Salon optyczny'] }
  },
  
  'tourism': {
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Hotel', type_aliases: [] },
    'motel':              { type: 'motel', type_name: 'Motel', type_aliases: [] },
    'hostel':             { type: 'hostel', type_name: 'Hostel', type_aliases: ['Schronisko'] },
    'guest_house':        { type: 'guest_house', type_name: 'Pensjonat', type_aliases: ['Gościniec'] },
    'apartment':          { type: 'apartment', type_name: 'Apartament', type_aliases: [] },
    'chalet':             { type: 'chalet', type_name: 'Chalet', type_aliases: ['Domek górski', 'Szalet'] },
    'alpine_hut':         { type: 'alpine_hut', type_name: 'Schronisko górskie', type_aliases: ['Schronisko wysokogórskie', 'Chata górska'] },
    'wilderness_hut':     { type: 'wilderness_hut', type_name: 'Chatka leśna', type_aliases: ['Schronienie', 'Szałas'] },
    'camp_site':          { type: 'camp_site', type_name: 'Kemping', type_aliases: ['Pole namiotowe'] },
    'caravan_site':       { type: 'caravan_site', type_name: 'Kemping dla przyczep', type_aliases: ['Parking dla kamperów', 'Pole kempingowe'] },
    
    // Attractions & Information
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
    'dog_park':           { type: 'dog_park', type_name: 'Wybieg dla psów', type_aliases: ['Park dla psów', 'Psie miejsce'] },
    'garden':             { type: 'garden', type_name: 'Ogród', type_aliases: ['Ogród botaniczny'] },
    'nature_reserve':     { type: 'nature_reserve', type_name: 'Rezerwat przyrody', type_aliases: ['Rezerwat'] },
    
    // Sports & Recreation
    'sports_centre':      { type: 'sports_centre', type_name: 'Centrum sportowe', type_aliases: ['Ośrodek sportowy'] },
    'stadium':            { type: 'stadium', type_name: 'Stadion', type_aliases: ['Arena sportowa'] },
    'swimming_pool':      { type: 'swimming_pool', type_name: 'Basen', type_aliases: ['Pływalnia', 'Aquapark'] },
    'fitness_centre':     { type: 'fitness_centre', type_name: 'Centrum fitness', type_aliases: ['Fitness', 'Siłownia'] },
    'pitch':              { type: 'pitch', type_name: 'Boisko sportowe', type_aliases: ['Boisko'] },
    'track':              { type: 'track', type_name: 'Tor', type_aliases: ['Tor biegowy', 'Tor wyścigowy'] },
    'golf_course':        { type: 'golf_course', type_name: 'Pole golfowe', type_aliases: ['Golf'] },
    'miniature_golf':     { type: 'miniature_golf', type_name: 'Golf miniaturowy', type_aliases: ['Mini golf'] },
    'ice_rink':           { type: 'ice_rink', type_name: 'Lodowisko', type_aliases: ['Ślizgawka'] },
    'fishing':            { type: 'fishing', type_name: 'Łowisko', type_aliases: ['Miejsce wędkarskie', 'Wędkarstwo'] },
    
    // Entertainment
    'amusement_arcade':   { type: 'amusement_arcade', type_name: 'Salon gier', type_aliases: ['Automaty', 'Flipery'] },
    'adult_gaming_centre': { type: 'adult_gaming_centre', type_name: 'Salon gier hazardowych', type_aliases: ['Kasyno', 'Automaty'] },
    'beach_resort':       { type: 'beach_resort', type_name: 'Ośrodek plażowy', type_aliases: ['Plaża', 'Resort'] },
    'bandstand':          { type: 'bandstand', type_name: 'Muszla koncertowa', type_aliases: ['Estrada', 'Scena'] },
    'dance':              { type: 'dance', type_name: 'Sala taneczna', type_aliases: ['Tańce', 'Studio tańca'] },
    'water_park':         { type: 'water_park', type_name: 'Park wodny', type_aliases: ['Aquapark', 'Wodny park rozrywki'] },
    
    // Education & Community
    'summer_camp':        { type: 'summer_camp', type_name: 'Obóz letni', type_aliases: ['Kolonia', 'Obóz wakacyjny'] },
    'hackerspace':        { type: 'hackerspace', type_name: 'Hackerspace', type_aliases: ['Przestrzeń dla hackerów', 'Makerspace'] }
  },
  
  'building': {
    // Religious
    'chapel':             { type: 'chapel', type_name: 'Kaplica', type_aliases: [] },
    'church':             { type: 'church', type_name: 'Kościół', type_aliases: ['Świątynia', 'Parafia'] },
    'mosque':             { type: 'mosque', type_name: 'Meczet', type_aliases: [] },
    'temple':             { type: 'temple', type_name: 'Świątynia', type_aliases: [] },
    'synagogue':          { type: 'synagogue', type_name: 'Synagoga', type_aliases: [] },
    'shrine':             { type: 'shrine', type_name: 'Kapliczka', type_aliases: [] },
    
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Budynek hotelowy', type_aliases: ['Hotel'] },
    
    // Commercial & Retail
    'commercial':         { type: 'commercial', type_name: 'Budynek komercyjny', type_aliases: ['Budynek biurowy', 'Biurowiec'] },
    'retail':             { type: 'retail', type_name: 'Budynek handlowy', type_aliases: ['Sklep', 'Centrum handlowe'] },
    
    // Public & Government
    'civic':              { type: 'civic', type_name: 'Budynek użyteczności publicznej', type_aliases: ['Budynek publiczny', 'Obiekt publiczny'] },
    'public':             { type: 'public', type_name: 'Budynek publiczny', type_aliases: ['Obiekt publiczny'] },
    
    // Education
    'school':             { type: 'school', type_name: 'Budynek szkolny', type_aliases: ['Szkoła'] },
    'university':         { type: 'university', type_name: 'Budynek uniwersytecki', type_aliases: ['Uniwersytet', 'Uczelnia'] },
    
    // Healthcare
    'hospital':           { type: 'hospital', type_name: 'Budynek szpitalny', type_aliases: ['Szpital'] },
    
    // Entertainment
    'stadium':            { type: 'stadium', type_name: 'Stadion', type_aliases: ['Arena sportowa'] },
    
    // Industry
    'farm':               { type: 'farm', type_name: 'Budynek gospodarczy', type_aliases: ['Gospodarstwo', 'Stodoła', 'Obora'] },
    
    // Transportation
    'train_station':      { type: 'train_station', type_name: 'Dworzec kolejowy', type_aliases: ['Dworzec', 'Stacja kolejowa'] },
    'transportation':     { type: 'transportation', type_name: 'Dworzec', type_aliases: ['Stacja', 'Węzeł komunikacyjny'] }
  },
  
  'railway': {
    'station':            { type: 'railway_station', type_name: 'Stacja kolejowa', type_aliases: ['Dworzec', 'Stacja'] },
    'light_rail':         { type: 'light_rail', type_name: 'Kolej lekka', type_aliases: ['Lekka kolej miejska', 'Tramwaj'] },
    'subway':             { type: 'subway', type_name: 'Metro', type_aliases: ['Kolej podziemna'] },
    'tram':               { type: 'tram', type_name: 'Tramwaj', type_aliases: ['Linia tramwajowa'] }
  },
  
  'craft': {
    '*':                  { type: 'craft', type_name: 'Rzemiosło', type_aliases: ['Warsztat rzemieślniczy', 'Rzemieślnik'] }
  },
  
  'emergency': {
    'ambulance_station':  { type: 'ambulance_station', type_name: 'Stacja pogotowia', type_aliases: ['Pogotowie ratunkowe', 'Karetka'] }
  },
  
  'historic': {
    'archaeological_site': { type: 'archaeological_site', type_name: 'Stanowisko archeologiczne', type_aliases: ['Wykopaliska', 'Ruiny', 'Miejsce archeologiczne'] },
    'monument':           { type: 'monument', type_name: 'Pomnik', type_aliases: ['Monument', 'Zabytek'] }
  },
  
  'military': {
    '*':                  { type: 'military', type_name: 'Obiekt wojskowy', type_aliases: ['Baza wojskowa', 'Jednostka wojskowa'] }
  },
  
  'natural': {
    'wood':               { type: 'wood', type_name: 'Las', type_aliases: ['Bór', 'Puszcza'] },
    'water':              { type: 'water', type_name: 'Zbiornik wodny', type_aliases: ['Jezioro', 'Staw', 'Zalew'] },
    'glacier':            { type: 'glacier', type_name: 'Lodowiec', type_aliases: ['Pole lodowe'] },
    'beach':              { type: 'beach', type_name: 'Plaża', type_aliases: ['Wybrzeże', 'Brzeg'] }
  },
  
  'office': {
    '*':                  { type: 'office', type_name: 'Biuro', type_aliases: ['Biuro firmowe', 'Kancelaria'] }
  },
  
  'sport': {
    '*':                  { type: 'sport', type_name: 'Obiekt sportowy', type_aliases: ['Obiekt sportowy', 'Miejsce sportowe'] },
    'american_football':  { type: 'american_football', type_name: 'Boisko futbolu amerykańskiego', type_aliases: ['Futbol amerykański'] },
    'australian_football': { type: 'australian_football', type_name: 'Boisko futbolu australijskiego', type_aliases: ['AFL'] },
    'badminton':          { type: 'badminton', type_name: 'Kort do badmintona', type_aliases: ['Badminton'] },
    'baseball':           { type: 'baseball', type_name: 'Boisko baseballowe', type_aliases: ['Baseball'] },
    'basketball':         { type: 'basketball', type_name: 'Boisko do koszykówki', type_aliases: ['Koszykówka'] },
    'beachvolleyball':    { type: 'beachvolleyball', type_name: 'Boisko do siatkówki plażowej', type_aliases: ['Siatkówka plażowa'] },
    'billiards':          { type: 'billiards', type_name: 'Sala bilardowa', type_aliases: ['Bilard', 'Snooker'] },
    'canadian_football':  { type: 'canadian_football', type_name: 'Boisko futbolu kanadyjskiego', type_aliases: ['CFL'] },
    'chess':              { type: 'chess', type_name: 'Miejsce do gry w szachy', type_aliases: ['Klub szachowy', 'Szachy'] },
    'cricket':            { type: 'cricket', type_name: 'Boisko do krykieta', type_aliases: ['Krykiet'] },
    'dog_racing':         { type: 'dog_racing', type_name: 'Tor wyścigów psich', type_aliases: ['Wyścigi chartów'] },
    'field_hockey':       { type: 'field_hockey', type_name: 'Boisko do hokeja na trawie', type_aliases: ['Hokej na trawie'] },
    'gaelic_games':       { type: 'gaelic_games', type_name: 'Boisko do gier gaelickich', type_aliases: ['GAA'] },
    'horse_racing':       { type: 'horse_racing', type_name: 'Tor wyścigów konnych', type_aliases: ['Hipodrom', 'Wyścigi konne'] },
    'ice_hockey':         { type: 'ice_hockey', type_name: 'Lodowisko hokejowe', type_aliases: ['Hokej na lodzie'] },
    'karting':            { type: 'karting', type_name: 'Tor kartingowy', type_aliases: ['Karting', 'Gokarty'] },
    'rc_car':             { type: 'rc_car', type_name: 'Tor dla modeli RC', type_aliases: ['Tor RC'] },
    'rugby_league':       { type: 'rugby_league', type_name: 'Boisko rugby league', type_aliases: ['Rugby'] },
    'rugby_union':        { type: 'rugby_union', type_name: 'Boisko rugby union', type_aliases: ['Rugby'] },
    'safety_training':    { type: 'safety_training', type_name: 'Ośrodek szkolenia BHP', type_aliases: ['Szkolenie bezpieczeństwa'] }
  }
};
