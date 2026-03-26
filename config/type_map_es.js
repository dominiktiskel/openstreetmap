/**
 * OSM tag to POI type mapping with Spanish names and search aliases
 * Language: Spanish (ES)
 * 
 * Structure:
 * {
 *   'osm_key': {
 *     'osm_value': { 
 *       type: 'type_string', 
 *       type_name: 'Spanish Name',
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
 *       "type_name": "Parada de autobús"
 *     }
 *   }
 * }
 * 
 * Search aliases allow users to find POIs using various Spanish naming variants.
 */

module.exports = {
  'aerialway': {
    '*':                  { type: 'aerialway', type_name: 'Teleférico', type_aliases: ['Telecabina', 'Telesilla', 'Gondola'] }
  },
  
  'aeroway': {
    'aerodrome': {
      type: 'aerodrome',
      type_name: 'Aeropuerto',
      type_aliases: ['Aeródromo', 'Campo de aviación', 'Pista de aterrizaje']
    },
    'heliport': {
      type: 'heliport',
      type_name: 'Helipuerto',
      type_aliases: ['Aeropuerto de helicópteros']
    },
    'helipad': {
      type: 'helipad',
      type_name: 'Helipuerto',
      type_aliases: ['Pista de helicópteros']
    },
    'aerodrome_gate': {
      type: 'aerodrome_gate',
      type_name: 'Puerta de embarque',
      type_aliases: ['Gate', 'Puerta']
    },
    'terminal': {
      type: 'terminal',
      type_name: 'Terminal aérea',
      type_aliases: ['Terminal', 'Terminal de aeropuerto']
    }
  },
  
  'amenity': {
    // Transportation
    'bus_stop':           { type: 'bus_stop', type_name: 'Parada de autobús', type_aliases: ['Parada', 'Estación de autobús'] },
    'bus_station':        { type: 'bus_station', type_name: 'Estación de autobuses', type_aliases: ['Terminal de autobuses', 'Estación'] },
    'ferry_terminal':     { type: 'ferry_terminal', type_name: 'Terminal de ferry', type_aliases: ['Ferry', 'Puerto de ferry'] },
    'taxi':               { type: 'taxi', type_name: 'Parada de taxi', type_aliases: ['Taxi', 'Sitio de taxi'] },
    'parking':            { type: 'parking', type_name: 'Estacionamiento', type_aliases: ['Aparcamiento', 'Parking', 'Garaje'] },
    'parking_space':      { type: 'parking_space', type_name: 'Plaza de aparcamiento', type_aliases: ['Plaza de parking', 'Espacio de estacionamiento'] },
    'bicycle_parking':    {
      type: 'bicycle_parking',
      type_name: 'Aparcamiento para bicicletas',
      type_aliases: ['Soporte de bicicletas', 'Bicicletero']
    },
    'motorcycle_parking': { type: 'motorcycle_parking', type_name: 'Aparcamiento de motos', type_aliases: ['Estacionamiento de motos'] },
    'charging_station':   {
      type: 'charging_station',
      type_name: 'Punto de carga eléctrica',
      type_aliases: ['Cargador eléctrico', 'Estación de carga']
    },
    'fuel':               { type: 'fuel', type_name: 'Gasolinera', type_aliases: ['Estación de servicio', 'Surtidor de combustible'] },
    'car_rental':         { type: 'car_rental', type_name: 'Alquiler de coches', type_aliases: ['Renta de autos', 'Rent a car'] },
    'car_wash':           { type: 'car_wash', type_name: 'Lavado de coches', type_aliases: ['Car wash', 'Autolavado'] },
    
    // Religion & Culture
    'place_of_worship':   {
      type: 'place_of_worship',
      type_name: 'Lugar de culto',
      type_aliases: ['Iglesia', 'Templo', 'Capilla', 'Santuario']
    },
    'theatre':            { type: 'theatre', type_name: 'Teatro', type_aliases: ['Casa de teatro'] },
    'cinema':             { type: 'cinema', type_name: 'Cine', type_aliases: ['Sala de cine', 'Cinematógrafo'] },
    'arts_centre':        { type: 'arts_centre', type_name: 'Centro de artes', type_aliases: ['Galería de arte', 'Casa de cultura'] },
    'library':            { type: 'library', type_name: 'Biblioteca', type_aliases: ['Biblioteca pública'] },
    'planetarium':        { type: 'planetarium', type_name: 'Planetario', type_aliases: ['Observatorio'] },
    'community_centre':   { type: 'community_centre', type_name: 'Centro comunitario', type_aliases: ['Casa del pueblo', 'Centro social'] },
    'social_centre':      { type: 'social_centre', type_name: 'Centro social', type_aliases: ['Centro comunitario'] },
    
    // Food & Drink
    'restaurant':         {
      type: 'restaurant',
      type_name: 'Restaurante',
      type_aliases: ['Comedor', 'Fonda', 'Mesón', 'Asador']
    },
    'fast_food':          {
      type: 'fast_food',
      type_name: 'Comida rápida',
      type_aliases: ['Fast food', 'Hamburguesería', 'Bocatería']
    },
    'cafe':               { type: 'cafe', type_name: 'Cafetería', type_aliases: ['Café', 'Bar'] },
    'pub':                { type: 'pub', type_name: 'Pub', type_aliases: ['Bar', 'Taberna', 'Bodega'] },
    'bar':                { type: 'bar', type_name: 'Bar', type_aliases: ['Coctelería', 'Lounge'] },
    'biergarten':         {
      type: 'biergarten',
      type_name: 'Jardín de cerveza',
      type_aliases: ['Terraza', 'Bar al aire libre']
    },
    'food_court':         {
      type: 'food_court',
      type_name: 'Patio de comidas',
      type_aliases: ['Food court', 'Zona de restaurantes']
    },
    'ice_cream':          { type: 'ice_cream', type_name: 'Heladería', type_aliases: ['Gelatería', 'Helados'] },
    
    // Education
    'school':             {
      type: 'school',
      type_name: 'Colegio',
      type_aliases: ['Escuela', 'Escuela primaria', 'Instituto', 'Centro educativo']
    },
    'kindergarten':       { type: 'kindergarten', type_name: 'Guardería', type_aliases: ['Jardín de infancia', 'Kínder', 'Preescolar'] },
    'college':            { type: 'college', type_name: 'Escuela universitaria', type_aliases: ['Colegio universitario'] },
    'university':         { type: 'university', type_name: 'Universidad', type_aliases: ['Facultad', 'Campus', 'Instituto superior'] },
    'driving_school':     {
      type: 'driving_school',
      type_name: 'Autoescuela',
      type_aliases: ['Escuela de conducción', 'Escuela de manejo']
    },
    
    // Healthcare & Social Services
    'clinic':             { type: 'clinic', type_name: 'Clínica', type_aliases: ['Centro de salud', 'Policlínica', 'Ambulatorio'] },
    'dentist':            { type: 'dentist', type_name: 'Clínica dental', type_aliases: ['Dentista', 'Odontólogo'] },
    'doctors':            { type: 'doctors', type_name: 'Consulta médica', type_aliases: ['Médico', 'Ambulatorio'] },
    'hospital':           { type: 'hospital', type_name: 'Hospital', type_aliases: ['Clínica', 'Centro hospitalario'] },
    'pharmacy':           { type: 'pharmacy', type_name: 'Farmacia', type_aliases: [] },
    'veterinary':         {
      type: 'veterinary',
      type_name: 'Clínica veterinaria',
      type_aliases: ['Veterinario', 'Hospital veterinario']
    },
    'nursing_home':       { type: 'nursing_home', type_name: 'Residencia de ancianos', type_aliases: ['Asilo', 'Geriátrico'] },
    'social_facility':    { type: 'social_facility', type_name: 'Servicios sociales', type_aliases: ['Centro de servicios sociales'] },
    
    // Finance
    'atm':                { type: 'atm', type_name: 'Cajero automático', type_aliases: ['ATM', 'Cajero'] },
    'bank':               { type: 'bank', type_name: 'Banco', type_aliases: ['Sucursal bancaria', 'Entidad bancaria'] },
    'bureau_de_change':   { type: 'bureau_de_change', type_name: 'Casa de cambio', type_aliases: ['Cambio de divisas', 'Cambio de moneda'] },
    
    // Government & Public Services
    'police':             { type: 'police', type_name: 'Comisaría', type_aliases: ['Policía', 'Puesto de policía'] },
    'fire_station':       { type: 'fire_station', type_name: 'Parque de bomberos', type_aliases: ['Bomberos', 'Cuartel de bomberos'] },
    'post_office':        { type: 'post_office', type_name: 'Oficina de correos', type_aliases: ['Correos', 'Oficina postal'] },
    'post_box':           { type: 'post_box', type_name: 'Buzón de correos', type_aliases: ['Buzón'] },
    'townhall':           { type: 'townhall', type_name: 'Ayuntamiento', type_aliases: ['Municipio', 'Alcaldía', 'Casa consistorial'] },
    'courthouse':         { type: 'courthouse', type_name: 'Juzgado', type_aliases: ['Tribunal', 'Palacio de justicia'] },
    'embassy':            { type: 'embassy', type_name: 'Embajada', type_aliases: ['Consulado', 'Misión diplomática'] },
    'public_building':    { type: 'public_building', type_name: 'Edificio público', type_aliases: ['Edificio gubernamental'] },
    'ranger_station':     { type: 'ranger_station', type_name: 'Puesto de guardabosques', type_aliases: ['Guardería forestal', 'Parque natural'] },
    'register_office':    { type: 'register_office', type_name: 'Registro civil', type_aliases: ['Registro', 'Juzgado de paz'] },
    
    // Public Facilities
    'toilets':            { type: 'toilets', type_name: 'Aseos públicos', type_aliases: ['Baño', 'WC', 'Servicio', 'Lavabo'] },
    'drinking_water':     { type: 'drinking_water', type_name: 'Agua potable', type_aliases: ['Fuente de agua', 'Fuente potable'] },
    'fountain':           { type: 'fountain', type_name: 'Fuente', type_aliases: ['Surtidor', 'Fuente ornamental'] },
    'recycling':          {
      type: 'recycling',
      type_name: 'Punto de reciclaje',
      type_aliases: ['Reciclaje', 'Contenedor de reciclaje']
    },
    'waste_disposal':     { type: 'waste_disposal', type_name: 'Punto de residuos', type_aliases: ['Vertedero', 'Basura'] },
    
    // Retail & Services
    'marketplace':        { type: 'marketplace', type_name: 'Mercado', type_aliases: ['Mercadillo', 'Plaza de mercado', 'Bazar'] },
    'vending_machine':    { type: 'vending_machine', type_name: 'Máquina expendedora', type_aliases: ['Máquina automática', 'Vending'] },
    'telephone':          { type: 'telephone', type_name: 'Teléfono público', type_aliases: ['Cabina telefónica'] },
    'internet_cafe':      { type: 'internet_cafe', type_name: 'Cibercafé', type_aliases: ['Café internet'] },
    'coworking_space':    { type: 'coworking_space', type_name: 'Espacio de coworking', type_aliases: ['Coworking', 'Oficina compartida'] },
    
    // Entertainment & Nightlife
    'nightclub':          { type: 'nightclub', type_name: 'Club nocturno', type_aliases: ['Discoteca', 'Club', 'Disco'] },
    'casino':             { type: 'casino', type_name: 'Casino', type_aliases: ['Sala de juego'] },
    'gambling':           { type: 'gambling', type_name: 'Sala de apuestas', type_aliases: ['Sala de juegos', 'Bingo'] },
    
    // Recreation & Sports
    'dojo':               { type: 'dojo', type_name: 'Dojo', type_aliases: ['Escuela de artes marciales', 'Gimnasio de artes marciales'] },
    'gym':                { type: 'gym', type_name: 'Gimnasio', type_aliases: ['Centro deportivo', 'Fitness', 'Sala de musculación'] },
    'bbq':                { type: 'bbq', type_name: 'Zona de barbacoa', type_aliases: ['Barbacoa', 'Parrilla'] }
  },
  
  'highway': {
    'bus_stop':           { type: 'bus_stop', type_name: 'Parada de autobús', type_aliases: ['Parada'] },
    'platform':           { type: 'platform', type_name: 'Andén', type_aliases: ['Parada'] },
    'rest_area':          { type: 'rest_area', type_name: 'Área de descanso', type_aliases: ['Área de servicio', 'Parada de camino'] },
    'services':           { type: 'services', type_name: 'Área de servicio', type_aliases: ['Gasolinera de autopista', 'Área de descanso'] }
  },
  
  'public_transport': {
    'platform':           { type: 'platform', type_name: 'Andén', type_aliases: ['Parada'] },
    'station':            { type: 'station', type_name: 'Estación', type_aliases: ['Terminal'] },
    'stop_position':      { type: 'stop_position', type_name: 'Parada', type_aliases: [] }
  },
  
  'shop': {
    // Food & Groceries
    'supermarket':        { type: 'supermarket', type_name: 'Supermercado', type_aliases: ['Súper', 'Tienda de alimentación'] },
    'convenience':        { type: 'convenience', type_name: 'Tienda de conveniencia', type_aliases: ['Colmado', 'Alimentación'] },
    'bakery':             { type: 'bakery', type_name: 'Panadería', type_aliases: ['Pastelería', 'Confitería'] },
    'butcher':            { type: 'butcher', type_name: 'Carnicería', type_aliases: ['Charcutería'] },
    'cheese':             { type: 'cheese', type_name: 'Quesería', type_aliases: ['Tienda de quesos'] },
    'chocolate':          { type: 'chocolate', type_name: 'Chocolatería', type_aliases: ['Bombonería', 'Tienda de chocolate'] },
    'coffee':             { type: 'coffee', type_name: 'Tienda de café', type_aliases: ['Cafetería', 'Tostadero de café'] },
    'deli':               { type: 'deli', type_name: 'Charcutería', type_aliases: ['Delicatessen', 'Ultramarinos'] },
    'greengrocer':        { type: 'greengrocer', type_name: 'Frutería', type_aliases: ['Verdulería', 'Frutas y verduras'] },
    'seafood':            { type: 'seafood', type_name: 'Pescadería', type_aliases: ['Marisquería', 'Pescado y marisco'] },
    'beverages':          { type: 'beverages', type_name: 'Tienda de bebidas', type_aliases: ['Bebidas', 'Bodega'] },
    'alcohol':            { type: 'alcohol', type_name: 'Licorería', type_aliases: ['Bodega', 'Vinoteca', 'Bebidas alcohólicas'] },
    
    // Fashion & Personal Care
    'clothes':            { type: 'clothes', type_name: 'Tienda de ropa', type_aliases: ['Boutique', 'Moda', 'Ropa'] },
    'shoes':              { type: 'shoes', type_name: 'Zapatería', type_aliases: ['Calzado'] },
    'hairdresser':        { type: 'hairdresser', type_name: 'Peluquería', type_aliases: ['Salón de peluquería', 'Barbería'] },
    'beauty':             { type: 'beauty', type_name: 'Salón de belleza', type_aliases: ['Centro de estética', 'Estética'] },
    'jewelry':            { type: 'jewelry', type_name: 'Joyería', type_aliases: ['Bisutería', 'Joyero'] },
    'tailor':             { type: 'tailor', type_name: 'Sastrería', type_aliases: ['Modista', 'Arreglos de ropa'] },
    
    // General Retail
    'books':              { type: 'books', type_name: 'Librería', type_aliases: ['Libros', 'Papelería'] },
    'florist':            { type: 'florist', type_name: 'Floristería', type_aliases: ['Flores', 'Floristería'] },
    'furniture':          { type: 'furniture', type_name: 'Tienda de muebles', type_aliases: ['Mueblería', 'Decoración'] },
    'electronics':        { type: 'electronics', type_name: 'Tienda de electrónica', type_aliases: ['Electrónica', 'Tecnología'] },
    'computer':           { type: 'computer', type_name: 'Tienda de informática', type_aliases: ['Informática', 'Ordenadores'] },
    'mobile_phone':       { type: 'mobile_phone', type_name: 'Tienda de telefonía', type_aliases: ['Telefonía móvil', 'Móviles'] },
    'gift':               { type: 'gift', type_name: 'Tienda de regalos', type_aliases: ['Regalos', 'Souvenirs'] },
    'toys':               { type: 'toys', type_name: 'Juguetería', type_aliases: ['Juguetes'] },
    'sports':             { type: 'sports', type_name: 'Tienda de deportes', type_aliases: ['Artículos deportivos', 'Deportes'] },
    'bicycle':            { type: 'bicycle', type_name: 'Tienda de bicicletas', type_aliases: ['Bicicletas', 'Ciclos'] },
    'car':                { type: 'car', type_name: 'Concesionario de coches', type_aliases: ['Concesionario', 'Distribuidor de autos'] },
    'car_parts':          {
      type: 'car_parts',
      type_name: 'Tienda de recambios',
      type_aliases: ['Recambios de coches', 'Repuestos de autos']
    },
    'car_repair':         {
      type: 'car_repair',
      type_name: 'Taller mecánico',
      type_aliases: ['Taller de coches', 'Mecánico', 'Garaje']
    },
    'pet':                { type: 'pet', type_name: 'Tienda de mascotas', type_aliases: ['Tienda de animales', 'Perrería'] },
    'department_store':   { type: 'department_store', type_name: 'Grandes almacenes', type_aliases: ['Almacén', 'Tienda por departamentos'] },
    'mall':               { type: 'mall', type_name: 'Centro comercial', type_aliases: ['Shopping', 'Mall'] },
    'kiosk':              { type: 'kiosk', type_name: 'Kiosco', type_aliases: ['Quiosco', 'Puesto de prensa'] },
    
    // Services
    'copyshop':           { type: 'copyshop', type_name: 'Copistería', type_aliases: ['Imprenta', 'Servicio de impresión'] },
    'dry_cleaning':       { type: 'dry_cleaning', type_name: 'Tintorería', type_aliases: ['Lavandería', 'Limpieza en seco'] },
    
    // Healthcare
    'chemist':            { type: 'chemist', type_name: 'Droguería', type_aliases: ['Perfumería', 'Farmacia'] },
    'medical_supply':     { type: 'medical_supply', type_name: 'Tienda de material médico', type_aliases: ['Ortopedia', 'Material sanitario'] },
    'optician':           { type: 'optician', type_name: 'Óptica', type_aliases: ['Gafas', 'Centro de visión'] }
  },
  
  'tourism': {
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Hotel', type_aliases: ['Posada', 'Alojamiento'] },
    'motel':              { type: 'motel', type_name: 'Motel', type_aliases: ['Hotel de carretera'] },
    'hostel':             { type: 'hostel', type_name: 'Albergue', type_aliases: ['Hostal', 'Posada juvenil'] },
    'guest_house':        { type: 'guest_house', type_name: 'Casa de huéspedes', type_aliases: ['Pensión', 'Bed and Breakfast'] },
    'apartment':          { type: 'apartment', type_name: 'Apartamento turístico', type_aliases: ['Apartamento', 'Piso de alquiler'] },
    'chalet':             { type: 'chalet', type_name: 'Chalet', type_aliases: ['Casa de montaña', 'Refugio'] },
    'alpine_hut':         { type: 'alpine_hut', type_name: 'Refugio de montaña', type_aliases: ['Cabaña alpina', 'Refugio alpino'] },
    'wilderness_hut':     { type: 'wilderness_hut', type_name: 'Cabaña en el bosque', type_aliases: ['Refugio', 'Choza'] },
    'camp_site':          { type: 'camp_site', type_name: 'Camping', type_aliases: ['Campamento', 'Zona de acampada'] },
    'caravan_site':       { type: 'caravan_site', type_name: 'Área para caravanas', type_aliases: ['Autocaravanas', 'Camping para caravanas'] },
    
    // Attractions & Information
    'museum':             { type: 'museum', type_name: 'Museo', type_aliases: [] },
    'gallery':            { type: 'gallery', type_name: 'Galería de arte', type_aliases: ['Galería', 'Exposición'] },
    'attraction':         { type: 'attraction', type_name: 'Atracción turística', type_aliases: ['Atracción', 'Punto de interés'] },
    'viewpoint':          { type: 'viewpoint', type_name: 'Mirador', type_aliases: ['Punto panorámico', 'Mirador panorámico'] },
    'information':        { type: 'information', type_name: 'Información turística', type_aliases: ['Info', 'Oficina de turismo'] },
    'theme_park':         { type: 'theme_park', type_name: 'Parque temático', type_aliases: ['Parque de atracciones'] },
    'zoo':                { type: 'zoo', type_name: 'Zoo', type_aliases: ['Zoológico', 'Parque zoológico'] },
    'aquarium':           { type: 'aquarium', type_name: 'Acuario', type_aliases: ['Oceanario'] }
  },
  
  'leisure': {
    'park':               { type: 'park', type_name: 'Parque', type_aliases: ['Parque público', 'Zona verde'] },
    'playground':         { type: 'playground', type_name: 'Parque infantil', type_aliases: ['Zona de juegos', 'Área de juegos'] },
    'dog_park':           { type: 'dog_park', type_name: 'Zona para perros', type_aliases: ['Parque para perros', 'Canódromo'] },
    'garden':             { type: 'garden', type_name: 'Jardín', type_aliases: ['Jardín botánico'] },
    'nature_reserve':     { type: 'nature_reserve', type_name: 'Reserva natural', type_aliases: ['Parque natural', 'Reserva'] },
    
    // Sports & Recreation
    'sports_centre':      { type: 'sports_centre', type_name: 'Centro deportivo', type_aliases: ['Polideportivo', 'Instalaciones deportivas'] },
    'stadium':            { type: 'stadium', type_name: 'Estadio', type_aliases: ['Recinto deportivo', 'Arena'] },
    'swimming_pool':      { type: 'swimming_pool', type_name: 'Piscina', type_aliases: ['Pisci', 'Parque acuático'] },
    'fitness_centre':     { type: 'fitness_centre', type_name: 'Centro de fitness', type_aliases: ['Gimnasio', 'Sala de musculación'] },
    'pitch':              { type: 'pitch', type_name: 'Campo de deporte', type_aliases: ['Campo de juego', 'Cancha'] },
    'track':              { type: 'track', type_name: 'Pista', type_aliases: ['Pista de atletismo', 'Pista de carreras'] },
    'golf_course':        { type: 'golf_course', type_name: 'Campo de golf', type_aliases: ['Club de golf'] },
    'miniature_golf':     { type: 'miniature_golf', type_name: 'Minigolf', type_aliases: ['Golf en miniatura'] },
    'ice_rink':           { type: 'ice_rink', type_name: 'Pista de hielo', type_aliases: ['Pista de patinaje sobre hielo'] },
    'fishing':            { type: 'fishing', type_name: 'Zona de pesca', type_aliases: ['Coto de pesca', 'Pescadero'] },
    
    // Entertainment
    'amusement_arcade':   { type: 'amusement_arcade', type_name: 'Salón de juegos recreativos', type_aliases: ['Arcade', 'Salón recreativo'] },
    'adult_gaming_centre': { type: 'adult_gaming_centre', type_name: 'Sala de juegos para adultos', type_aliases: ['Casino', 'Bingo'] },
    'beach_resort':       { type: 'beach_resort', type_name: 'Resort de playa', type_aliases: ['Playa', 'Complejo de playa'] },
    'bandstand':          { type: 'bandstand', type_name: 'Quiosco de música', type_aliases: ['Pabellón de música', 'Escenario'] },
    'dance':              { type: 'dance', type_name: 'Sala de baile', type_aliases: ['Academia de baile', 'Estudio de danza'] },
    'water_park':         { type: 'water_park', type_name: 'Parque acuático', type_aliases: ['Aquapark', 'Parque de agua'] },
    
    // Education & Community
    'summer_camp':        { type: 'summer_camp', type_name: 'Campamento de verano', type_aliases: ['Campamento', 'Colonia de verano'] },
    'hackerspace':        { type: 'hackerspace', type_name: 'Hackerspace', type_aliases: ['Makerspace', 'Espacio tecnológico'] }
  },
  
  'building': {
    // Religious
    'chapel':             { type: 'chapel', type_name: 'Capilla', type_aliases: ['Ermita'] },
    'church':             { type: 'church', type_name: 'Iglesia', type_aliases: ['Catedral', 'Basílica', 'Parroquia'] },
    'mosque':             { type: 'mosque', type_name: 'Mezquita', type_aliases: ['Centro islámico'] },
    'temple':             { type: 'temple', type_name: 'Templo', type_aliases: ['Lugar de culto'] },
    'synagogue':          { type: 'synagogue', type_name: 'Sinagoga', type_aliases: ['Templo judío'] },
    'shrine':             { type: 'shrine', type_name: 'Santuario', type_aliases: ['Ermita', 'Capilla'] },
    
    // Accommodation
    'hotel':              { type: 'hotel', type_name: 'Edificio de hotel', type_aliases: ['Hotel'] },
    
    // Commercial & Retail
    'commercial':         { type: 'commercial', type_name: 'Edificio comercial', type_aliases: ['Oficinas', 'Local comercial'] },
    'retail':             { type: 'retail', type_name: 'Edificio de tiendas', type_aliases: ['Local de comercio', 'Tienda'] },
    
    // Public & Government
    'civic':              { type: 'civic', type_name: 'Edificio cívico', type_aliases: ['Edificio público', 'Municipal'] },
    'public':             { type: 'public', type_name: 'Edificio público', type_aliases: ['Edificio gubernamental'] },
    
    // Education
    'school':             { type: 'school', type_name: 'Edificio escolar', type_aliases: ['Colegio', 'Escuela'] },
    'university':         { type: 'university', type_name: 'Edificio universitario', type_aliases: ['Universidad', 'Facultad'] },
    
    // Healthcare
    'hospital':           { type: 'hospital', type_name: 'Edificio de hospital', type_aliases: ['Hospital'] },
    
    // Entertainment
    'stadium':            { type: 'stadium', type_name: 'Estadio', type_aliases: ['Recinto deportivo'] },
    
    // Industry
    'farm':               { type: 'farm', type_name: 'Edificio agrícola', type_aliases: ['Granja', 'Granero', 'Corral'] },
    
    // Transportation
    'train_station':      { type: 'train_station', type_name: 'Estación de tren', type_aliases: ['Estación de ferrocarril', 'Apeadero'] },
    'transportation':     { type: 'transportation', type_name: 'Estación de transporte', type_aliases: ['Terminal', 'Nodo de transporte'] }
  },
  
  'railway': {
    'station':            { type: 'railway_station', type_name: 'Estación de ferrocarril', type_aliases: ['Estación de tren', 'Apeadero'] },
    'light_rail':         { type: 'light_rail', type_name: 'Tren ligero', type_aliases: ['Tranvía', 'Metro ligero'] },
    'subway':             { type: 'subway', type_name: 'Metro', type_aliases: ['Subterráneo', 'Tren subterráneo'] },
    'tram':               { type: 'tram', type_name: 'Tranvía', type_aliases: ['Tren urbano'] }
  },
  
  'craft': {
    '*':                  { type: 'craft', type_name: 'Artesanía', type_aliases: ['Taller artesanal', 'Artesano'] }
  },
  
  'emergency': {
    'ambulance_station':  { type: 'ambulance_station', type_name: 'Base de ambulancias', type_aliases: ['Estación de emergencias', 'Centro de urgencias'] }
  },
  
  'historic': {
    'archaeological_site': { type: 'archaeological_site', type_name: 'Yacimiento arqueológico', type_aliases: ['Excavación', 'Ruinas', 'Sitio arqueológico'] },
    'monument':           { type: 'monument', type_name: 'Monumento', type_aliases: ['Monumento histórico', 'Memorial'] }
  },
  
  'military': {
    '*':                  { type: 'military', type_name: 'Instalación militar', type_aliases: ['Base militar', 'Cuartel'] }
  },
  
  'natural': {
    'wood':               { type: 'wood', type_name: 'Bosque', type_aliases: ['Foresta', 'Selva'] },
    'water':              { type: 'water', type_name: 'Masa de agua', type_aliases: ['Lago', 'Embalse', 'Estanque'] },
    'glacier':            { type: 'glacier', type_name: 'Glaciar', type_aliases: ['Campo de hielo'] },
    'beach':              { type: 'beach', type_name: 'Playa', type_aliases: ['Costa', 'Litoral'] }
  },
  
  'office': {
    '*':                  { type: 'office', type_name: 'Oficina', type_aliases: ['Despacho', 'Empresa'] }
  },
  
  'sport': {
    '*':                  { type: 'sport', type_name: 'Instalación deportiva', type_aliases: ['Complejo deportivo', 'Campo deportivo'] },
    'american_football':  { type: 'american_football', type_name: 'Campo de fútbol americano', type_aliases: ['Fútbol americano'] },
    'australian_football': { type: 'australian_football', type_name: 'Campo de fútbol australiano', type_aliases: ['AFL'] },
    'badminton':          { type: 'badminton', type_name: 'Pista de bádminton', type_aliases: ['Bádminton'] },
    'baseball':           { type: 'baseball', type_name: 'Campo de béisbol', type_aliases: ['Béisbol'] },
    'basketball':         { type: 'basketball', type_name: 'Cancha de baloncesto', type_aliases: ['Baloncesto', 'Basketball'] },
    'beachvolleyball':    { type: 'beachvolleyball', type_name: 'Pista de vóley playa', type_aliases: ['Vóley playa'] },
    'billiards':          { type: 'billiards', type_name: 'Sala de billar', type_aliases: ['Billar', 'Snooker'] },
    'canadian_football':  { type: 'canadian_football', type_name: 'Campo de fútbol canadiense', type_aliases: ['CFL'] },
    'chess':              { type: 'chess', type_name: 'Club de ajedrez', type_aliases: ['Ajedrez'] },
    'cricket':            { type: 'cricket', type_name: 'Campo de cricket', type_aliases: ['Cricket'] },
    'dog_racing':         { type: 'dog_racing', type_name: 'Canódromo', type_aliases: ['Carreras de galgos'] },
    'field_hockey':       { type: 'field_hockey', type_name: 'Campo de hockey hierba', type_aliases: ['Hockey hierba'] },
    'gaelic_games':       { type: 'gaelic_games', type_name: 'Campo de juegos gaélicos', type_aliases: ['GAA'] },
    'horse_racing':       { type: 'horse_racing', type_name: 'Hipódromo', type_aliases: ['Carreras de caballos', 'Pista de caballos'] },
    'ice_hockey':         { type: 'ice_hockey', type_name: 'Pista de hockey sobre hielo', type_aliases: ['Hockey hielo'] },
    'karting':            { type: 'karting', type_name: 'Circuito de karting', type_aliases: ['Karting', 'Karts'] },
    'rc_car':             { type: 'rc_car', type_name: 'Pista de coches RC', type_aliases: ['Pista RC', 'Radiocontrol'] },
    'rugby_league':       { type: 'rugby_league', type_name: 'Campo de rugby liga', type_aliases: ['Rugby'] },
    'rugby_union':        { type: 'rugby_union', type_name: 'Campo de rugby unión', type_aliases: ['Rugby'] },
    'safety_training':    { type: 'safety_training', type_name: 'Centro de formación en seguridad', type_aliases: ['Seguridad vial', 'Formación en seguridad'] }
  }
};
