// Datos iniciales. Se cargan solo la primera vez; después todo se edita desde la app.
// Las descripciones son propias (no copiadas de la app original). Donde no estaba
// segura de cómo es el ejercicio, quedó vacía para completarla desde "Editar".

const SEED_EXERCISES = [
  // ---- Programa Gym, semana 1 ----
  // Lunes
  { id: 'ballerina-pump', name: 'Ballerina pump con liga de tela', muscle: 'Glúteo medio', equipment: 'Liga de tela', description: '' },
  { id: 'leg-extension-v', name: 'Leg extension en V al final', muscle: 'Cuádriceps (Vasto medial)', equipment: 'Máquina de extensión', description: '' },
  { id: 'leg-press-separadas', name: 'Leg press piernas separadas', muscle: 'Glúteo mayor', equipment: 'Prensa',
    description: 'Pies altos y más abiertos que el ancho de caderas en la plataforma, puntas levemente hacia afuera. Bajá controlado hasta donde la cadera no se despegue del respaldo y empujá con los talones.' },
  { id: 'pantorrilla-leg-press', name: 'Pantorrilla leg press', muscle: 'Pantorrillas (Gastrocnemio)', equipment: 'Prensa',
    description: 'En la prensa con las piernas casi extendidas, apoyá solo la parte delantera de los pies en el borde de la plataforma. Empujá con las puntas estirando los tobillos y volvé lento.' },
  { id: 'femoral-polea-acostada', name: 'Femoral unilateral acostada en polea', muscle: 'Isquiotibiales (Bíceps femoral)', equipment: 'Polea + tobillera',
    description: 'Boca abajo frente a la polea baja con la tobillera puesta. Flexioná la rodilla llevando el talón hacia el glúteo sin despegar la cadera del piso. Bajá controlado.' },
  { id: 'adductor-88', name: 'Adductor serie 88', muscle: 'Aductor mayor', equipment: 'Máquina de aductores', description: '' },
  { id: 'farmer-walk', name: 'Farmer walk', muscle: 'Antebrazos (Flexores)', equipment: 'Mancuernas pesadas',
    description: 'Una mancuerna pesada en cada mano, brazos al costado. Caminá con pasos cortos, hombros atrás y abajo, abdomen firme y sin inclinarte.' },

  // Martes
  { id: 'peso-muerto-mancuernas', name: 'Peso muerto con mancuernas', muscle: 'Glúteo mayor', equipment: 'Mancuernas',
    description: 'Pies al ancho de caderas, una mancuerna en cada mano. Rodillas apenas flexionadas y abdomen firme. Llevá la cadera hacia atrás bajando las mancuernas pegadas a las piernas con la espalda recta. Subí apretando glúteos.' },
  { id: 'sentadilla-lunge', name: 'Sentadilla con lunge alternando piernas', muscle: 'Glúteo mayor', equipment: 'Mancuernas',
    description: 'De pie, pies al ancho de hombros. Hacé una sentadilla llevando la cadera atrás y abajo. Al subir, da un paso atrás con una pierna y bajá a un lunge. Volvé al centro y alterná.' },
  { id: 'side-kickback', name: 'Side glute kickback con mancuerna', muscle: 'Glúteo medio', equipment: 'Mancuerna',
    description: 'Con la mancuerna detrás de la rodilla, llevá la pierna hacia atrás y hacia afuera en diagonal, apretando el costado del glúteo.' },
  { id: 'patada-hidrante', name: 'Patada de glúteo con hidrante', muscle: 'Glúteo mayor', equipment: 'Peso corporal',
    description: 'En cuatro apoyos, manos bajo hombros y rodillas bajo cadera. Abrí la rodilla hacia el costado (hidrante), volvé y extendé la pierna hacia atrás apretando el glúteo. Sin arquear la zona lumbar.' },
  { id: 'bridge-diamante-liga', name: 'Bridge en diamante con liga de tela', muscle: 'Glúteo mayor', equipment: 'Liga de tela',
    description: 'Boca arriba, plantas de los pies juntas y rodillas abiertas (diamante), liga sobre las rodillas. Elevá la cadera apretando glúteos y empujando las rodillas contra la liga. Bajá controlado.' },
  { id: 'bridge-brazos-extendidos', name: 'Bridge con brazos extendidos', muscle: 'Glúteo mayor', equipment: 'Peso corporal',
    description: 'Boca arriba, rodillas flexionadas y pies apoyados. Brazos extendidos hacia el techo. Elevá la cadera hasta alinear hombros, cadera y rodillas. Pausa arriba y bajá lento.' },
  { id: 'wall-sit-peso', name: 'Wall sit con peso en piernas', muscle: 'Cuádriceps (Recto femoral)', equipment: 'Mancuerna / disco',
    description: 'Espalda apoyada en la pared, rodillas a 90° y un peso sobre los muslos. Sostené la posición respirando normal.' },
  { id: 'estiramiento-tren-inferior', name: 'Estiramiento de 2 poses (tren inferior)', muscle: 'Isquiotibiales (Bíceps femoral)', equipment: 'Ninguno',
    description: 'Dos posturas de estiramiento para piernas y glúteos, sosteniendo cada una sin rebotes y respirando profundo.' },

  // Miércoles
  { id: 'jumping-jack-mancuernas', name: 'Jumping jack con mancuernas', muscle: 'Deltoide lateral', equipment: 'Mancuernas livianas', description: '' },
  { id: 'latpull-barra', name: 'LatPull con barra de polea', muscle: 'Espalda (Dorsal ancho)', equipment: 'Polea alta + barra',
    description: 'Sentada en la máquina, agarre más ancho que los hombros. Llevá la barra hacia la parte alta del pecho bajando los codos hacia las costillas, pecho alto. Subí controlado.' },
  { id: 'pull-polea-triceps', name: 'Pull en polea', muscle: 'Tríceps braquial', equipment: 'Polea', description: '' },
  { id: 'lat-pull-up-mancuernas', name: 'Lat pull up con mancuernas', muscle: 'Deltoide posterior', equipment: 'Mancuernas', description: '' },
  { id: 'rotacion-externa-hombro', name: 'Rotación externa del hombro con mancuerna', muscle: 'Deltoide posterior', equipment: 'Mancuerna liviana',
    description: 'Codo pegado al cuerpo y flexionado a 90°. Girá el antebrazo hacia afuera sin despegar el codo, y volvé lento. Peso liviano.' },
  { id: 'hold-mancuerna-pierna', name: 'Hold con mancuerna y pierna arriba', muscle: 'Abdominales (Recto abdominal)', equipment: 'Mancuerna', description: '' },
  { id: 'abs-around', name: 'Abs around con mancuernas', muscle: 'Abdominales (Recto abdominal)', equipment: 'Mancuerna', description: '' },
  { id: 'plancha-elevacion-brazos', name: 'Plancha con elevación de brazos frontales', muscle: 'Transverso abdominal', equipment: 'Peso corporal',
    description: 'En plancha alta, manos bajo hombros. Elevá un brazo extendido hacia adelante sin que la cadera rote. Alterná.' },

  // Jueves
  { id: 'caminata-squat', name: 'Caminata squat', muscle: 'Glúteo medio', equipment: 'Banda (opcional)', description: '' },
  { id: 'side-to-side-squat', name: 'Side to side squat', muscle: 'Aductor mayor', equipment: 'Peso corporal / mancuerna',
    description: 'Pies bien abiertos. Llevá el peso hacia una pierna flexionándola mientras la otra queda extendida, y pasá al otro lado sin subir del todo.' },
  { id: 'leg-extension-maquina', name: 'Leg extension en máquina', muscle: 'Cuádriceps (Recto femoral)', equipment: 'Máquina de extensión',
    description: 'Sentada con la espalda apoyada y el rodillo sobre los tobillos. Extendé las rodillas hasta casi estirarlas, pausa arriba y bajá lento.' },
  { id: 'polea-arriba', name: 'Polea arriba', muscle: 'Glúteo mayor', equipment: 'Polea + tobillera', description: '' },
  { id: 'patada-gluteo-polea', name: 'Patada de glúteos recta en polea', muscle: 'Glúteo mayor', equipment: 'Polea + tobillera',
    description: 'Frente a la polea baja con la tobillera, torso levemente inclinado. Llevá la pierna estirada hacia atrás apretando el glúteo, sin arquear la espalda.' },
  { id: 'extension-polea-lateral', name: 'Extensión en polea lateral', muscle: 'Glúteo medio', equipment: 'Polea + tobillera', description: '' },
  { id: 'hip-thrust-maquina', name: 'Hip thrust en máquina', muscle: 'Glúteo mayor', equipment: 'Máquina de hip thrust',
    description: 'Espalda alta apoyada y cinturón sobre la cadera. Elevá la cadera apretando glúteos hasta quedar alineada, mentón hacia el pecho. "Chiquititos": repeticiones cortas arriba, sin bajar del todo.' },

  // Viernes
  { id: 'plancha-lateral-cadera', name: 'Plancha lateral con descenso de cadera', muscle: 'Oblicuos externos', equipment: 'Peso corporal',
    description: 'En plancha lateral sobre el antebrazo. Bajá la cadera unos centímetros hacia el piso y volvé a subirla. Hacé todas de un lado y cambiá.' },
  { id: 'elevacion-frontal-liga', name: 'Elevación frontal con liga', muscle: 'Deltoide anterior', equipment: 'Liga',
    description: 'Pisá la liga y tomala con la mano. Elevá el brazo estirado hacia adelante hasta la altura del hombro y bajá lento.' },
  { id: 'remo-liga', name: 'Remo con liga', muscle: 'Espalda (Dorsal ancho)', equipment: 'Liga',
    description: 'Liga anclada adelante. Tirá llevando el codo hacia atrás pegado al cuerpo y juntá el omóplato. Volvé controlado.' },
  { id: 'vuelos-laterales', name: 'Vuelos laterales con mancuernas', muscle: 'Deltoide lateral', equipment: 'Mancuernas',
    description: 'De pie, mancuernas al costado. Elevá los brazos hacia los lados con los codos apenas flexionados hasta la altura de los hombros. Bajá lento.' },
  { id: 'complejo-press-disco', name: 'Complejo de press y rotación con disco', muscle: 'Pecho (Pectoral mayor)', equipment: 'Disco', description: '' },
  { id: 'bear-plank-toque', name: 'Bear plank toque de hombro', muscle: 'Transverso abdominal', equipment: 'Peso corporal',
    description: 'En cuatro apoyos con las rodillas elevadas unos centímetros del piso. Tocá el hombro contrario con una mano sin mover la cadera. Alterná.' },
  { id: 'plancha-lateral-bosu', name: 'Plancha lateral con crunch en Bosu', muscle: 'Oblicuos externos', equipment: 'Bosu', description: '' },
  { id: 'giro-ruso-disco', name: 'Giro ruso con disco', muscle: 'Oblicuos externos', equipment: 'Disco',
    description: 'Sentada con el torso inclinado hacia atrás y los pies apoyados o elevados. Girá el torso llevando el disco de un lado al otro.' },

  // ---- Alternativas para "Cambiar" ----
  { id: 'hip-thrust-banco', name: 'Hip thrust en banco con disco', muscle: 'Glúteo mayor', equipment: 'Banco + disco',
    description: 'Parte alta de la espalda apoyada en un banco y un disco sobre la cadera. Elevá la cadera apretando glúteos hasta que el torso quede paralelo al piso.' },
  { id: 'bulgara', name: 'Sentadilla búlgara', muscle: 'Glúteo mayor', equipment: 'Banco + mancuernas',
    description: 'Empeine de atrás apoyado en un banco. Bajá flexionando la pierna de adelante con el torso levemente inclinado. Empujá con el talón para subir.' },
  { id: 'step-up', name: 'Step up al banco', muscle: 'Glúteo mayor', equipment: 'Banco / escalón',
    description: 'Apoyá un pie completo sobre el banco y subí empujando con ese talón, sin impulsarte con la pierna de abajo. Bajá controlado.' },
  { id: 'caminata-lateral', name: 'Caminata lateral con banda', muscle: 'Glúteo medio', equipment: 'Banda',
    description: 'Banda sobre las rodillas o tobillos, media sentadilla. Da pasos laterales manteniendo tensión en la banda.' },
  { id: 'abductores-maquina', name: 'Abductores en máquina', muscle: 'Glúteo medio', equipment: 'Máquina de abductores',
    description: 'Sentada con la espalda apoyada. Abrí las piernas contra la resistencia, pausa afuera y cerrá lento.' },
  { id: 'sentadilla-goblet', name: 'Sentadilla goblet', muscle: 'Cuádriceps', equipment: 'Mancuerna / kettlebell',
    description: 'Sostené una mancuerna contra el pecho. Bajá en sentadilla con el pecho alto y las rodillas siguiendo la línea de los pies.' },
  { id: 'curl-femoral-maquina', name: 'Curl femoral en máquina', muscle: 'Isquiotibiales', equipment: 'Máquina',
    description: 'Acostada boca abajo o sentada según la máquina. Flexioná las rodillas llevando el rodillo hacia los glúteos y volvé lento.' },
  { id: 'remo-polea-baja', name: 'Remo en polea baja', muscle: 'Espalda (Dorsal ancho)', equipment: 'Polea',
    description: 'Sentada, pecho alto. Tirá del agarre hacia el abdomen llevando los codos atrás y juntando omóplatos.' },
  { id: 'triceps-cuerda', name: 'Extensión de tríceps con cuerda', muscle: 'Tríceps braquial', equipment: 'Polea alta + cuerda',
    description: 'Codos pegados al cuerpo. Extendé los brazos hacia abajo separando la cuerda al final. Volvé sin despegar los codos.' },
  { id: 'dead-bug', name: 'Dead bug', muscle: 'Transverso abdominal', equipment: 'Peso corporal',
    description: 'Boca arriba, brazos al techo y rodillas a 90°. Extendé brazo y pierna contrarios sin despegar la zona lumbar del piso. Alterná.' },
];

// Programa Gym: una entrada por semana; cada semana tiene los días 1 (lunes) a 5 (viernes).
// Cada ejercicio: [id, series, repeticiones].
const SEED_GYM_WEEKS = [
  { // Semana 1
    1: [
      ['ballerina-pump', '3', '12 reps por pierna'],
      ['leg-extension-v', '3', '20 reps'],
      ['leg-press-separadas', '3', '20 reps'],
      ['pantorrilla-leg-press', '3', '20 reps'],
      ['femoral-polea-acostada', '3', '12 reps por pierna'],
      ['adductor-88', '4', '8-8'],
      ['farmer-walk', '', 'Al menos 50 pasos'],
    ],
    2: [
      ['peso-muerto-mancuernas', '3', '12 reps'],
      ['sentadilla-lunge', '3', '8 reps cada lado'],
      ['side-kickback', '3', '12 reps por pierna'],
      ['patada-hidrante', '3', '12 reps por pierna'],
      ['bridge-diamante-liga', '3', '12 reps por pierna'],
      ['bridge-brazos-extendidos', '3', '12 reps'],
      ['wall-sit-peso', '3', '1 minuto'],
      ['estiramiento-tren-inferior', '', '1 minuto completo'],
    ],
    3: [
      ['jumping-jack-mancuernas', '3', '25 reps'],
      ['latpull-barra', '3', '15 reps'],
      ['pull-polea-triceps', '3', '15 reps por brazo'],
      ['lat-pull-up-mancuernas', '3', '15 reps'],
      ['rotacion-externa-hombro', '3', '10 reps por brazo'],
      ['hold-mancuerna-pierna', '3', '45-60 seg'],
      ['abs-around', '3', '12 vueltas'],
      ['plancha-elevacion-brazos', '3', '10 por brazo'],
    ],
    4: [
      ['caminata-squat', '3', '10 reps por pierna'],
      ['side-to-side-squat', '3', '8 reps cada lado'],
      ['leg-extension-maquina', '3', '12 reps'],
      ['polea-arriba', '3', 'Al fallo por pierna'],
      ['patada-gluteo-polea', '3', '15 reps por pierna'],
      ['extension-polea-lateral', '', ''],
      ['hip-thrust-maquina', '3', '12 reps + 10 chiquititos al final de cada serie'],
    ],
    5: [
      ['plancha-lateral-cadera', '3', '10 reps'],
      ['elevacion-frontal-liga', '3', '12 reps por brazo'],
      ['remo-liga', '3', '12 reps por brazo'],
      ['vuelos-laterales', '3', '12 reps'],
      ['complejo-press-disco', '5', ''],
      ['bear-plank-toque', '3', '12 reps'],
      ['plancha-lateral-bosu', '3', '12 reps'],
      ['giro-ruso-disco', '3', '12 reps por lado'],
    ],
  },
];

const SEED_GYM_START = '2026-10-19';
const SEED_GYM_TOTAL_WEEKS = 7;
