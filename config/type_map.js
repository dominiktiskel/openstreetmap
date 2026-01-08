/**
 * OSM tag to POI type mapping with Polish names
 * Inspired by Nominatim's category/type system
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { type: 'type_string', type_name_pl: 'Polish Name' }
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
 */

module.exports = {
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name_pl: 'Przystanek autobusowy' },
    'bus_station':        { type: 'bus_station', type_name_pl: 'Dworzec autobusowy' },
    'ferry_terminal':     { type: 'ferry_terminal', type_name_pl: 'Terminal promowy' },
    'taxi':               { type: 'taxi', type_name_pl: 'Postój taksówek' },
    'parking':            { type: 'parking', type_name_pl: 'Parking' },
    'bicycle_parking':    { type: 'bicycle_parking', type_name_pl: 'Parking rowerowy' },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name_pl: 'Parking motocyklowy' },
    'charging_station':   { type: 'charging_station', type_name_pl: 'Stacja ładowania pojazdów elektrycznych' },
    'fuel':               { type: 'fuel', type_name_pl: 'Stacja paliw' },
    'car_rental':         { type: 'car_rental', type_name_pl: 'Wypożyczalnia samochodów' },
    'car_wash':           { type: 'car_wash', type_name_pl: 'Myjnia samochodowa' },
    
    // Religion & Culture
    'place_of_worship':   { type: 'place_of_worship', type_name_pl: 'Miejsce kultu religijnego' },
    'theatre':            { type: 'theatre', type_name_pl: 'Teatr' },
    'cinema':             { type: 'cinema', type_name_pl: 'Kino' },
    'arts_centre':        { type: 'arts_centre', type_name_pl: 'Centrum sztuki' },
    'library':            { type: 'library', type_name_pl: 'Biblioteka' },
    'community_centre':   { type: 'community_centre', type_name_pl: 'Dom kultury' },
    'social_centre':      { type: 'social_centre', type_name_pl: 'Ośrodek społeczny' },
    
    // Food & Drink
    'restaurant':         { type: 'restaurant', type_name_pl: 'Restauracja' },
    'fast_food':          { type: 'fast_food', type_name_pl: 'Bar szybkiej obsługi' },
    'cafe':               { type: 'cafe', type_name_pl: 'Kawiarnia' },
    'pub':                { type: 'pub', type_name_pl: 'Pub' },
    'bar':                { type: 'bar', type_name_pl: 'Bar' },
    'biergarten':         { type: 'biergarten', type_name_pl: 'Ogródek piwny' },
    'food_court':         { type: 'food_court', type_name_pl: 'Strefa gastronomiczna' },
    'ice_cream':          { type: 'ice_cream', type_name_pl: 'Lodziarnia' },
    
    // Education
    'school':             { type: 'school', type_name_pl: 'Szkoła' },
    'kindergarten':       { type: 'kindergarten', type_name_pl: 'Przedszkole' },
    'college':            { type: 'college', type_name_pl: 'Uczelnia wyższa' },
    'university':         { type: 'university', type_name_pl: 'Uniwersytet' },
    'driving_school':     { type: 'driving_school', type_name_pl: 'Ośrodek szkolenia kierowców' },
    
    // Healthcare
    'clinic':             { type: 'clinic', type_name_pl: 'Przychodnia' },
    'dentist':            { type: 'dentist', type_name_pl: 'Gabinet stomatologiczny' },
    'doctors':            { type: 'doctors', type_name_pl: 'Gabinet lekarski' },
    'hospital':           { type: 'hospital', type_name_pl: 'Szpital' },
    'pharmacy':           { type: 'pharmacy', type_name_pl: 'Apteka' },
    'veterinary':         { type: 'veterinary', type_name_pl: 'Lecznica weterinaryjna' },
    'nursing_home':       { type: 'nursing_home', type_name_pl: 'Dom opieki' },
    
    // Finance
    'atm':                { type: 'atm', type_name_pl: 'Bankomat' },
    'bank':               { type: 'bank', type_name_pl: 'Bank' },
    'bureau_de_change':   { type: 'bureau_de_change', type_name_pl: 'Kantor wymiany walut' },
    
    // Government & Public Services
    'police':             { type: 'police', type_name_pl: 'Posterunek policji' },
    'fire_station':       { type: 'fire_station', type_name_pl: 'Remiza strażacka' },
    'post_office':        { type: 'post_office', type_name_pl: 'Urząd pocztowy' },
    'post_box':           { type: 'post_box', type_name_pl: 'Skrzynka pocztowa' },
    'townhall':           { type: 'townhall', type_name_pl: 'Ratusz' },
    'courthouse':         { type: 'courthouse', type_name_pl: 'Sąd' },
    'embassy':            { type: 'embassy', type_name_pl: 'Ambasada' },
    'public_building':    { type: 'public_building', type_name_pl: 'Budynek użyteczności publicznej' },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name_pl: 'Toaleta publiczna' },
    'drinking_water':     { type: 'drinking_water', type_name_pl: 'Pitna woda' },
    'fountain':           { type: 'fountain', type_name_pl: 'Fontanna' },
    'recycling':          { type: 'recycling', type_name_pl: 'Punkt selektywnej zbiórki odpadów' },
    'waste_disposal':     { type: 'waste_disposal', type_name_pl: 'Punkt wywozu śmieci' },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name_pl: 'Targ' },
    'vending_machine':    { type: 'vending_machine', type_name_pl: 'Automat sprzedający' },
    'telephone':          { type: 'telephone', type_name_pl: 'Telefon publiczny' },
    'internet_cafe':      { type: 'internet_cafe', type_name_pl: 'Kawiarenka internetowa' },
    'coworking_space':    { type: 'coworking_space', type_name_pl: 'Przestrzeń coworkingowa' },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name_pl: 'Klub nocny' },
    'casino':             { type: 'casino', type_name_pl: 'Kasyno' },
    'gambling':           { type: 'gambling', type_name_pl: 'Miejsce hazardu' },
    
    // Recreation
    'gym':                { type: 'gym', type_name_pl: 'Siłownia' },
    'bbq':                { type: 'bbq', type_name_pl: 'Miejsce do grillowania' }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name_pl: 'Przystanek autobusowy' },
    'platform':           { type: 'platform', type_name_pl: 'Peron' },
    'rest_area':          { type: 'rest_area', type_name_pl: 'Miejsce odpoczynku' },
    'services':           { type: 'services', type_name_pl: 'Miejsce obsługi podróżnych' }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name_pl: 'Peron' },
    'station':            { type: 'station', type_name_pl: 'Stacja' },
    'stop_position':      { type: 'stop_position', type_name_pl: 'Pozycja przystanku' }
  },
  
  'shop': {
    'supermarket':        { type: 'supermarket', type_name_pl: 'Supermarket' },
    'convenience':        { type: 'convenience', type_name_pl: 'Sklep ogólnospożywczy' },
    'bakery':             { type: 'bakery', type_name_pl: 'Piekarnia' },
    'butcher':            { type: 'butcher', type_name_pl: 'Sklep mięsny' },
    'cheese':             { type: 'cheese', type_name_pl: 'Sklep z serami' },
    'chocolate':          { type: 'chocolate', type_name_pl: 'Sklep z czekoladą' },
    'beverages':          { type: 'beverages', type_name_pl: 'Sklep z napojami' },
    'alcohol':            { type: 'alcohol', type_name_pl: 'Sklep monopolowy' },
    'clothes':            { type: 'clothes', type_name_pl: 'Sklep odzieżowy' },
    'shoes':              { type: 'shoes', type_name_pl: 'Sklep obuwniczy' },
    'hairdresser':        { type: 'hairdresser', type_name_pl: 'Fryzjer' },
    'beauty':             { type: 'beauty', type_name_pl: 'Salon kosmetyczny' },
    'jewelry':            { type: 'jewelry', type_name_pl: 'Jubiler' },
    'books':              { type: 'books', type_name_pl: 'Księgarnia' },
    'florist':            { type: 'florist', type_name_pl: 'Kwiaciarnia' },
    'furniture':          { type: 'furniture', type_name_pl: 'Sklep meblowy' },
    'electronics':        { type: 'electronics', type_name_pl: 'Sklep z elektroniką' },
    'computer':           { type: 'computer', type_name_pl: 'Sklep komputerowy' },
    'mobile_phone':       { type: 'mobile_phone', type_name_pl: 'Sklep z telefonami' },
    'gift':               { type: 'gift', type_name_pl: 'Sklep z upominkami' },
    'toys':               { type: 'toys', type_name_pl: 'Sklep z zabawkami' },
    'sports':             { type: 'sports', type_name_pl: 'Sklep sportowy' },
    'bicycle':            { type: 'bicycle', type_name_pl: 'Sklep rowerowy' },
    'car':                { type: 'car', type_name_pl: 'Salon samochodowy' },
    'car_parts':          { type: 'car_parts', type_name_pl: 'Sklep z częściami samochodowymi' },
    'car_repair':         { type: 'car_repair', type_name_pl: 'Warsztat samochodowy' },
    'pet':                { type: 'pet', type_name_pl: 'Sklep zoologiczny' },
    'department_store':   { type: 'department_store', type_name_pl: 'Dom towarowy' },
    'mall':               { type: 'mall', type_name_pl: 'Centrum handlowe' },
    'kiosk':              { type: 'kiosk', type_name_pl: 'Kiosk' }
  },
  
  'tourism': {
    'hotel':              { type: 'hotel', type_name_pl: 'Hotel' },
    'motel':              { type: 'motel', type_name_pl: 'Motel' },
    'hostel':             { type: 'hostel', type_name_pl: 'Hostel' },
    'guest_house':        { type: 'guest_house', type_name_pl: 'Pensjonat' },
    'apartment':          { type: 'apartment', type_name_pl: 'Apartament' },
    'camp_site':          { type: 'camp_site', type_name_pl: 'Kemping' },
    'museum':             { type: 'museum', type_name_pl: 'Muzeum' },
    'gallery':            { type: 'gallery', type_name_pl: 'Galeria sztuki' },
    'attraction':         { type: 'attraction', type_name_pl: 'Atrakcja turystyczna' },
    'viewpoint':          { type: 'viewpoint', type_name_pl: 'Punkt widokowy' },
    'information':        { type: 'information', type_name_pl: 'Informacja turystyczna' },
    'theme_park':         { type: 'theme_park', type_name_pl: 'Park rozrywki' },
    'zoo':                { type: 'zoo', type_name_pl: 'Zoo' },
    'aquarium':           { type: 'aquarium', type_name_pl: 'Akwarium' }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name_pl: 'Park' },
    'playground':         { type: 'playground', type_name_pl: 'Plac zabaw' },
    'sports_centre':      { type: 'sports_centre', type_name_pl: 'Centrum sportowe' },
    'stadium':            { type: 'stadium', type_name_pl: 'Stadion' },
    'swimming_pool':      { type: 'swimming_pool', type_name_pl: 'Basen' },
    'fitness_centre':     { type: 'fitness_centre', type_name_pl: 'Centrum fitness' },
    'pitch':              { type: 'pitch', type_name_pl: 'Boisko sportowe' },
    'golf_course':        { type: 'golf_course', type_name_pl: 'Pole golfowe' },
    'garden':             { type: 'garden', type_name_pl: 'Ogród' },
    'nature_reserve':     { type: 'nature_reserve', type_name_pl: 'Rezerwat przyrody' }
  },
  
  'building': {
    'chapel':             { type: 'chapel', type_name_pl: 'Kaplica' },
    'church':             { type: 'church', type_name_pl: 'Kościół' },
    'mosque':             { type: 'mosque', type_name_pl: 'Meczet' },
    'temple':             { type: 'temple', type_name_pl: 'Świątynia' },
    'synagogue':          { type: 'synagogue', type_name_pl: 'Synagoga' },
    'shrine':             { type: 'shrine', type_name_pl: 'Kapliczka' }
  }
};

