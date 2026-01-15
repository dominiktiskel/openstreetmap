/**
 * OSM tag to POI type mapping with English names and search aliases
 * Language: English (EN)
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { 
 *       type: 'type_string', 
 *       type_name: 'English Name',
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
 *       "type_name": "Bus Stop"
 *     }
 *   }
 * }
 * 
 * Search aliases allow users to find POIs using various English naming variants.
 */

module.exports = {
  'aeroway': {
    'aerodrome': {
      type: 'aerodrome',
      type_name: 'Airport',
      type_aliases: ['Aerodrome', 'Airfield', 'Landing Strip']
    },
    'heliport': {
      type: 'heliport',
      type_name: 'Heliport',
      type_aliases: ['Helicopter Landing']
    },
    'helipad': {
      type: 'helipad',
      type_name: 'Helipad',
      type_aliases: ['Helicopter Pad']
    },
    'aerodrome_gate': {
      type: 'aerodrome_gate',
      type_name: 'Airport Gate',
      type_aliases: ['Gate', 'Boarding Gate']
    },
    'terminal': {
      type: 'terminal',
      type_name: 'Airport Terminal',
      type_aliases: ['Terminal']
    }
  },
  
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name: 'Bus Stop', type_aliases: ['Stop', 'Transit Stop'] },
    'bus_station':        { type: 'bus_station', type_name: 'Bus Station', type_aliases: ['Bus Terminal', 'Coach Station'] },
    'ferry_terminal':     { type: 'ferry_terminal', type_name: 'Ferry Terminal', type_aliases: ['Ferry', 'Boat Terminal'] },
    'taxi':               { type: 'taxi', type_name: 'Taxi Stand', type_aliases: ['Taxi', 'Cab Stand'] },
    'parking':            { type: 'parking', type_name: 'Parking', type_aliases: ['Car Park', 'Parking Lot'] },
    'bicycle_parking':    { type: 'bicycle_parking', type_name: 'Bicycle Parking', type_aliases: ['Bike Rack', 'Cycle Parking'] },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name: 'Motorcycle Parking', type_aliases: ['Motorbike Parking'] },
    'charging_station':   {
      type: 'charging_station',
      type_name: 'Electric Vehicle Charging Station',
      type_aliases: ['Charger', 'EV Charging']
    },
    'fuel':               { type: 'fuel', type_name: 'Gas Station', type_aliases: ['Petrol Station', 'Fuel Station', 'Service Station'] },
    'car_rental':         { type: 'car_rental', type_name: 'Car Rental', type_aliases: ['Car Hire', 'Rent a Car'] },
    'car_wash':           { type: 'car_wash', type_name: 'Car Wash', type_aliases: ['Auto Wash'] },
    
    // Religion & Culture
    'place_of_worship':   {
      type: 'place_of_worship',
      type_name: 'Place of Worship',
      type_aliases: ['Church', 'Temple', 'Chapel', 'Sanctuary']
    },
    'theatre':            { type: 'theatre', type_name: 'Theatre', type_aliases: ['Theater', 'Playhouse'] },
    'cinema':             { type: 'cinema', type_name: 'Cinema', type_aliases: ['Movie Theater', 'Theater'] },
    'arts_centre':        { type: 'arts_centre', type_name: 'Arts Center', type_aliases: ['Art Gallery', 'Cultural Center'] },
    'library':            { type: 'library', type_name: 'Library', type_aliases: ['Public Library'] },
    'community_centre':   { type: 'community_centre', type_name: 'Community Center', type_aliases: ['Community Hall', 'Social Center'] },
    'social_centre':      { type: 'social_centre', type_name: 'Social Center', type_aliases: ['Community Center'] },
    
    // Food & Drink
    'restaurant':         { type: 'restaurant', type_name: 'Restaurant', type_aliases: ['Dining', 'Eatery', 'Diner'] },
    'fast_food':          { type: 'fast_food', type_name: 'Fast Food', type_aliases: ['Quick Service', 'Fast Food Restaurant'] },
    'cafe':               { type: 'cafe', type_name: 'Cafe', type_aliases: ['Coffee Shop', 'Coffeehouse'] },
    'pub':                { type: 'pub', type_name: 'Pub', type_aliases: ['Bar', 'Tavern', 'Public House'] },
    'bar':                { type: 'bar', type_name: 'Bar', type_aliases: ['Cocktail Bar', 'Lounge'] },
    'biergarten':         { type: 'biergarten', type_name: 'Beer Garden', type_aliases: ['Outdoor Bar', 'Garden Bar'] },
    'food_court':         { type: 'food_court', type_name: 'Food Court', type_aliases: ['Dining Area'] },
    'ice_cream':          { type: 'ice_cream', type_name: 'Ice Cream Shop', type_aliases: ['Ice Cream Parlor', 'Gelato'] },
    
    // Education
    'school':             {
      type: 'school',
      type_name: 'School',
      type_aliases: ['Elementary School', 'High School', 'Educational Facility']
    },
    'kindergarten':       { type: 'kindergarten', type_name: 'Kindergarten', type_aliases: ['Preschool', 'Nursery'] },
    'college':            { type: 'college', type_name: 'College', type_aliases: ['Higher Education'] },
    'university':         { type: 'university', type_name: 'University', type_aliases: ['College', 'Higher Education', 'Academy'] },
    'driving_school':     { type: 'driving_school', type_name: 'Driving School', type_aliases: ['Drivers Education', 'Driving Course'] },
    
    // Healthcare
    'clinic':             { type: 'clinic', type_name: 'Clinic', type_aliases: ['Medical Clinic', 'Health Center'] },
    'dentist':            { type: 'dentist', type_name: 'Dentist', type_aliases: ['Dental Clinic', 'Dental Office'] },
    'doctors':            { type: 'doctors', type_name: 'Doctor Office', type_aliases: ['Physician', 'Medical Practice'] },
    'hospital':           { type: 'hospital', type_name: 'Hospital', type_aliases: ['Medical Center', 'Emergency Hospital'] },
    'pharmacy':           { type: 'pharmacy', type_name: 'Pharmacy', type_aliases: ['Drugstore', 'Chemist'] },
    'veterinary':         { type: 'veterinary', type_name: 'Veterinary Clinic', type_aliases: ['Vet', 'Animal Hospital'] },
    'nursing_home':       { type: 'nursing_home', type_name: 'Nursing Home', type_aliases: ['Care Home', 'Retirement Home'] },
    
    // Finance
    'atm':                { type: 'atm', type_name: 'ATM', type_aliases: ['Cash Machine', 'Automated Teller'] },
    'bank':               { type: 'bank', type_name: 'Bank', type_aliases: ['Bank Branch', 'Financial Institution'] },
    'bureau_de_change':   {
      type: 'bureau_de_change',
      type_name: 'Currency Exchange',
      type_aliases: ['Money Exchange', 'Bureau de Change']
    },
    
    // Government & Public Services
    'police':             { type: 'police', type_name: 'Police Station', type_aliases: ['Police', 'Law Enforcement'] },
    'fire_station':       { type: 'fire_station', type_name: 'Fire Station', type_aliases: ['Fire Department', 'Firehouse'] },
    'post_office':        { type: 'post_office', type_name: 'Post Office', type_aliases: ['Mail Office', 'Postal Service'] },
    'post_box':           { type: 'post_box', type_name: 'Post Box', type_aliases: ['Mailbox', 'Letter Box'] },
    'townhall':           { type: 'townhall', type_name: 'Town Hall', type_aliases: ['City Hall', 'Municipal Building'] },
    'courthouse':         { type: 'courthouse', type_name: 'Courthouse', type_aliases: ['Court', 'Judicial Building'] },
    'embassy':            { type: 'embassy', type_name: 'Embassy', type_aliases: ['Consulate', 'Diplomatic Mission'] },
    'public_building':    { type: 'public_building', type_name: 'Public Building', type_aliases: ['Government Building'] },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name: 'Public Restroom', type_aliases: ['Toilet', 'WC', 'Bathroom', 'Restroom'] },
    'drinking_water':     { type: 'drinking_water', type_name: 'Drinking Water', type_aliases: ['Water Fountain', 'Water Source'] },
    'fountain':           { type: 'fountain', type_name: 'Fountain', type_aliases: ['Water Feature'] },
    'recycling':          { type: 'recycling', type_name: 'Recycling Center', type_aliases: ['Recycling', 'Waste Sorting'] },
    'waste_disposal':     { type: 'waste_disposal', type_name: 'Waste Disposal', type_aliases: ['Garbage', 'Trash'] },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name: 'Market', type_aliases: ['Marketplace', 'Bazaar', 'Farmers Market'] },
    'vending_machine':    { type: 'vending_machine', type_name: 'Vending Machine', type_aliases: ['Automat'] },
    'telephone':          { type: 'telephone', type_name: 'Public Telephone', type_aliases: ['Phone Booth', 'Payphone'] },
    'internet_cafe':      { type: 'internet_cafe', type_name: 'Internet Cafe', type_aliases: ['Cyber Cafe'] },
    'coworking_space':    { type: 'coworking_space', type_name: 'Coworking Space', type_aliases: ['Coworking', 'Shared Office'] },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name: 'Nightclub', type_aliases: ['Club', 'Disco'] },
    'casino':             { type: 'casino', type_name: 'Casino', type_aliases: ['Gaming'] },
    'gambling':           { type: 'gambling', type_name: 'Gambling Venue', type_aliases: ['Gaming'] },
    
    // Recreation
    'gym':                { type: 'gym', type_name: 'Gym', type_aliases: ['Fitness Center', 'Health Club', 'Fitness Club'] },
    'bbq':                { type: 'bbq', type_name: 'BBQ Area', type_aliases: ['Barbecue', 'Grill Area'] }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name: 'Bus Stop', type_aliases: ['Stop', 'Transit Stop'] },
    'platform':           { type: 'platform', type_name: 'Platform', type_aliases: ['Transit Platform'] },
    'rest_area':          { type: 'rest_area', type_name: 'Rest Area', type_aliases: ['Rest Stop', 'Service Area'] },
    'services':           { type: 'services', type_name: 'Highway Services', type_aliases: ['Service Area', 'Rest Stop'] }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name: 'Platform', type_aliases: ['Transit Platform'] },
    'station':            { type: 'station', type_name: 'Station', type_aliases: ['Transit Station'] },
    'stop_position':      { type: 'stop_position', type_name: 'Stop Position', type_aliases: [] }
  },
  
  'shop': {
    'supermarket':        { type: 'supermarket', type_name: 'Supermarket', type_aliases: ['Grocery Store', 'Food Market'] },
    'convenience':        { type: 'convenience', type_name: 'Convenience Store', type_aliases: ['Corner Store', 'Mini Market'] },
    'bakery':             { type: 'bakery', type_name: 'Bakery', type_aliases: ['Bakeshop', 'Patisserie'] },
    'butcher':            { type: 'butcher', type_name: 'Butcher', type_aliases: ['Meat Shop', 'Butcher Shop'] },
    'cheese':             { type: 'cheese', type_name: 'Cheese Shop', type_aliases: ['Cheese Store'] },
    'chocolate':          { type: 'chocolate', type_name: 'Chocolate Shop', type_aliases: ['Chocolatier'] },
    'beverages':          { type: 'beverages', type_name: 'Beverage Store', type_aliases: ['Drinks Shop'] },
    'alcohol':            { type: 'alcohol', type_name: 'Liquor Store', type_aliases: ['Wine Shop', 'Spirits'] },
    'clothes':            { type: 'clothes', type_name: 'Clothing Store', type_aliases: ['Apparel', 'Fashion Store'] },
    'shoes':              { type: 'shoes', type_name: 'Shoe Store', type_aliases: ['Footwear', 'Shoes'] },
    'hairdresser':        { type: 'hairdresser', type_name: 'Hairdresser', type_aliases: ['Hair Salon', 'Barber'] },
    'beauty':             { type: 'beauty', type_name: 'Beauty Salon', type_aliases: ['Beauty Parlor', 'Spa'] },
    'jewelry':            { type: 'jewelry', type_name: 'Jewelry Store', type_aliases: ['Jeweler', 'Jewellery'] },
    'books':              { type: 'books', type_name: 'Bookstore', type_aliases: ['Book Shop', 'Books'] },
    'florist':            { type: 'florist', type_name: 'Florist', type_aliases: ['Flower Shop', 'Flowers'] },
    'furniture':          { type: 'furniture', type_name: 'Furniture Store', type_aliases: ['Furniture'] },
    'electronics':        { type: 'electronics', type_name: 'Electronics Store', type_aliases: ['Electronics', 'Tech Store'] },
    'computer':           { type: 'computer', type_name: 'Computer Store', type_aliases: ['Computers', 'PC Shop'] },
    'mobile_phone':       { type: 'mobile_phone', type_name: 'Mobile Phone Store', type_aliases: ['Cell Phone', 'Phone Shop'] },
    'gift':               { type: 'gift', type_name: 'Gift Shop', type_aliases: ['Gifts', 'Souvenir Shop'] },
    'toys':               { type: 'toys', type_name: 'Toy Store', type_aliases: ['Toys', 'Toy Shop'] },
    'sports':             { type: 'sports', type_name: 'Sports Store', type_aliases: ['Sporting Goods', 'Sports Equipment'] },
    'bicycle':            { type: 'bicycle', type_name: 'Bicycle Shop', type_aliases: ['Bike Shop', 'Cycles'] },
    'car':                { type: 'car', type_name: 'Car Dealership', type_aliases: ['Auto Dealer', 'Car Sales'] },
    'car_parts':          { type: 'car_parts', type_name: 'Auto Parts Store', type_aliases: ['Car Parts', 'Auto Accessories'] },
    'car_repair':         { type: 'car_repair', type_name: 'Auto Repair Shop', type_aliases: ['Garage', 'Mechanic', 'Car Service'] },
    'pet':                { type: 'pet', type_name: 'Pet Store', type_aliases: ['Pet Shop', 'Pet Supplies'] },
    'department_store':   { type: 'department_store', type_name: 'Department Store', type_aliases: ['Large Store'] },
    'mall':               { type: 'mall', type_name: 'Shopping Mall', type_aliases: ['Shopping Center', 'Mall'] },
    'kiosk':              { type: 'kiosk', type_name: 'Kiosk', type_aliases: ['Newsstand'] }
  },
  
  'tourism': {
    'hotel':              { type: 'hotel', type_name: 'Hotel', type_aliases: ['Inn', 'Lodging'] },
    'motel':              { type: 'motel', type_name: 'Motel', type_aliases: ['Motor Lodge'] },
    'hostel':             { type: 'hostel', type_name: 'Hostel', type_aliases: ['Backpackers'] },
    'guest_house':        { type: 'guest_house', type_name: 'Guest House', type_aliases: ['B&B', 'Bed and Breakfast'] },
    'apartment':          { type: 'apartment', type_name: 'Apartment', type_aliases: ['Vacation Rental'] },
    'camp_site':          { type: 'camp_site', type_name: 'Campground', type_aliases: ['Camping', 'Campsite'] },
    'museum':             { type: 'museum', type_name: 'Museum', type_aliases: ['Gallery'] },
    'gallery':            { type: 'gallery', type_name: 'Art Gallery', type_aliases: ['Gallery', 'Exhibition'] },
    'attraction':         { type: 'attraction', type_name: 'Tourist Attraction', type_aliases: ['Attraction', 'Landmark'] },
    'viewpoint':          { type: 'viewpoint', type_name: 'Viewpoint', type_aliases: ['Scenic View', 'Lookout'] },
    'information':        { type: 'information', type_name: 'Tourist Information', type_aliases: ['Info', 'Visitor Center'] },
    'theme_park':         { type: 'theme_park', type_name: 'Theme Park', type_aliases: ['Amusement Park'] },
    'zoo':                { type: 'zoo', type_name: 'Zoo', type_aliases: ['Zoological Garden', 'Animal Park'] },
    'aquarium':           { type: 'aquarium', type_name: 'Aquarium', type_aliases: ['Marine Center'] }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name: 'Park', type_aliases: ['Public Park', 'Green Space'] },
    'playground':         { type: 'playground', type_name: 'Playground', type_aliases: ['Play Area', 'Children\'s Playground'] },
    'sports_centre':      { type: 'sports_centre', type_name: 'Sports Center', type_aliases: ['Sports Complex'] },
    'stadium':            { type: 'stadium', type_name: 'Stadium', type_aliases: ['Sports Stadium'] },
    'swimming_pool':      { type: 'swimming_pool', type_name: 'Swimming Pool', type_aliases: ['Pool', 'Aquatic Center'] },
    'fitness_centre':     { type: 'fitness_centre', type_name: 'Fitness Center', type_aliases: ['Gym', 'Health Club'] },
    'pitch':              { type: 'pitch', type_name: 'Sports Field', type_aliases: ['Playing Field', 'Pitch'] },
    'golf_course':        { type: 'golf_course', type_name: 'Golf Course', type_aliases: ['Golf Club'] },
    'garden':             { type: 'garden', type_name: 'Garden', type_aliases: ['Botanical Garden'] },
    'nature_reserve':     { type: 'nature_reserve', type_name: 'Nature Reserve', type_aliases: ['Reserve', 'Wildlife Area'] }
  },
  
  'building': {
    'chapel':             { type: 'chapel', type_name: 'Chapel', type_aliases: ['Small Church'] },
    'church':             { type: 'church', type_name: 'Church', type_aliases: ['Place of Worship', 'Cathedral'] },
    'mosque':             { type: 'mosque', type_name: 'Mosque', type_aliases: ['Islamic Center'] },
    'temple':             { type: 'temple', type_name: 'Temple', type_aliases: ['Place of Worship'] },
    'synagogue':          { type: 'synagogue', type_name: 'Synagogue', type_aliases: ['Jewish Temple'] },
    'shrine':             { type: 'shrine', type_name: 'Shrine', type_aliases: ['Sacred Site'] },
    
    // Transportation
    'train_station':      { type: 'train_station', type_name: 'Train Station', type_aliases: ['Railway Station', 'Station'] },
    'transportation':     { type: 'transportation', type_name: 'Transportation Station', type_aliases: ['Transit Station', 'Station'] }
  },
  
  'railway': {
    'station':            { type: 'railway_station', type_name: 'Railway Station', type_aliases: ['Train Station', 'Station'] }
  }
};
