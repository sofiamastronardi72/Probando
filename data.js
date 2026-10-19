// Datos iniciales. Se cargan solo la primera vez; después todo se edita desde la app.
// Las descripciones son propias (no copiadas de la app original).

const SEED_EXERCISES = [
  // Glúteo mayor
  { id: 'peso-muerto-mancuernas', name: 'Peso muerto con mancuernas', muscle: 'Glúteo mayor', equipment: 'Mancuernas',
    description: 'Pies al ancho de caderas, una mancuerna en cada mano. Rodillas apenas flexionadas y abdomen firme. Llevá la cadera hacia atrás bajando las mancuernas pegadas a las piernas con la espalda recta. Subí apretando glúteos.' },
  { id: 'sentadilla-lunge', name: 'Sentadilla con lunge alternando piernas', muscle: 'Glúteo mayor', equipment: 'Mancuernas',
    description: 'De pie, pies al ancho de hombros. Hacé una sentadilla llevando la cadera atrás y abajo. Al subir, da un paso atrás con una pierna y bajá a un lunge. Volvé al centro y alterná.' },
  { id: 'patada-hidrante', name: 'Patada de glúteo con hidrante', muscle: 'Glúteo mayor', equipment: 'Peso corporal',
    description: 'En cuatro apoyos, manos bajo hombros y rodillas bajo cadera. Abrí la rodilla hacia el costado (hidrante), volvé y extendé la pierna hacia atrás apretando el glúteo. Sin arquear la zona lumbar.' },
  { id: 'bridge-diamante-liga', name: 'Bridge en diamante con liga de tela', muscle: 'Glúteo mayor', equipment: 'Liga de tela',
    description: 'Boca arriba, plantas de los pies juntas y rodillas abiertas (diamante), liga sobre las rodillas. Elevá la cadera apretando glúteos y empujando las rodillas contra la liga. Bajá controlado.' },
  { id: 'bridge-brazos-extendidos', name: 'Bridge con brazos extendidos', muscle: 'Glúteo mayor', equipment: 'Peso corporal',
    description: 'Boca arriba, rodillas flexionadas y pies apoyados. Brazos extendidos hacia el techo. Elevá la cadera hasta alinear hombros, cadera y rodillas. Pausa arriba y bajá lento.' },
  { id: 'hip-thrust-banco', name: 'Hip thrust en banco con disco', muscle: 'Glúteo mayor', equipment: 'Banco + disco',
    description: 'Parte alta de la espalda apoyada en un banco y un disco sobre la cadera. Elevá la cadera apretando glúteos hasta que el torso quede paralelo al piso. Mentón hacia el pecho.' },
  { id: 'bulgara', name: 'Sentadilla búlgara', muscle: 'Glúteo mayor', equipment: 'Banco + mancuernas',
    description: 'Empeine de atrás apoyado en un banco. Bajá flexionando la pierna de adelante con el torso levemente inclinado. Empujá con el talón para subir.' },
  { id: 'step-up', name: 'Step up al banco', muscle: 'Glúteo mayor', equipment: 'Banco / escalón',
    description: 'Apoyá un pie completo sobre el banco y subí empujando con ese talón, sin impulsarte con la pierna de abajo. Bajá controlado.' },
  { id: 'bridge-una-pierna', name: 'Bridge a una pierna', muscle: 'Glúteo mayor', equipment: 'Peso corporal',
    description: 'Como el bridge común pero con una pierna extendida en el aire. Elevá la cadera sin que se incline hacia un lado.' },

  // Glúteo medio
  { id: 'side-kickback', name: 'Side glute kickback con mancuerna', muscle: 'Glúteo medio', equipment: 'Mancuerna',
    description: 'De costado en cuatro apoyos o de pie apoyada, con la mancuerna detrás de la rodilla. Llevá la pierna hacia atrás y hacia afuera en diagonal, apretando el costado del glúteo.' },
  { id: 'caminata-lateral', name: 'Caminata lateral con banda', muscle: 'Glúteo medio', equipment: 'Banda',
    description: 'Banda sobre las rodillas o tobillos, media sentadilla. Da pasos laterales manteniendo tensión en la banda y las rodillas hacia afuera.' },
  { id: 'clamshell', name: 'Clamshell con banda', muscle: 'Glúteo medio', equipment: 'Banda',
    description: 'Acostada de lado, rodillas flexionadas y banda sobre ellas. Con los pies juntos, abrí la rodilla de arriba sin rotar la cadera hacia atrás.' },
  { id: 'abduccion-lateral', name: 'Abducción de pierna acostada de lado', muscle: 'Glúteo medio', equipment: 'Peso corporal / tobillera',
    description: 'Acostada de lado con las piernas extendidas. Elevá la pierna de arriba con el pie apuntando levemente hacia abajo. Bajá lento.' },

  // Cuádriceps
  { id: 'wall-sit-peso', name: 'Wall sit con peso en piernas', muscle: 'Cuádriceps', equipment: 'Mancuerna / disco',
    description: 'Espalda apoyada en la pared, rodillas a 90° y un peso sobre los muslos. Sostené la posición respirando normal.' },
  { id: 'sentadilla-goblet', name: 'Sentadilla goblet', muscle: 'Cuádriceps', equipment: 'Mancuerna / kettlebell',
    description: 'Sostené una mancuerna contra el pecho. Bajá en sentadilla con el pecho alto y las rodillas siguiendo la línea de los pies.' },
  { id: 'zancada-adelante', name: 'Zancada hacia adelante', muscle: 'Cuádriceps', equipment: 'Mancuernas',
    description: 'Da un paso largo hacia adelante y bajá hasta que ambas rodillas queden cerca de 90°. Empujá para volver.' },

  // Isquiotibiales
  { id: 'estiramiento-tren-inferior', name: 'Estiramiento de 2 poses (tren inferior)', muscle: 'Isquiotibiales', equipment: 'Ninguno',
    description: 'Pose 1: sentada con una pierna extendida, inclinate hacia el pie con la espalda larga. Pose 2: figura 4 (tobillo sobre la rodilla contraria) acostada. 30 segundos por lado en cada pose.' },
  { id: 'peso-muerto-una-pierna', name: 'Peso muerto rumano a una pierna', muscle: 'Isquiotibiales', equipment: 'Mancuerna',
    description: 'Parada sobre una pierna, inclinate hacia adelante llevando la otra pierna hacia atrás, cadera alineada. Volvé apretando glúteo e isquios.' },
  { id: 'curl-fitball', name: 'Curl femoral con fitball', muscle: 'Isquiotibiales', equipment: 'Fitball',
    description: 'Boca arriba con los talones sobre la pelota y la cadera elevada. Traé la pelota hacia vos flexionando las rodillas, sin bajar la cadera.' },
];

// Rutina del martes (Casa), según la app original.
const SEED_TUESDAY = [
  ['peso-muerto-mancuernas', '3', '12 reps'],
  ['sentadilla-lunge', '3', '8 reps cada lado'],
  ['side-kickback', '3', '12 reps por pierna'],
  ['patada-hidrante', '3', '12 reps por pierna'],
  ['bridge-diamante-liga', '3', '12 reps'],
  ['bridge-brazos-extendidos', '3', '12 reps'],
  ['wall-sit-peso', '3', '1 minuto'],
  ['estiramiento-tren-inferior', '1', '1 minuto completo'],
];
