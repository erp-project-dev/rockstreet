/**
 * Historia principal: LOS FALSOS GUITARRISTAS.
 * Neon City está invadida por falsos ídolos del rock ("ídolos con pies de barro"): guitarristas que
 * juran ser leyendas, pero su técnica es falsa: limitados, sin lenguaje, sin toque, y no afinan el bend.
 *
 * EL PRODUCTOR es BLAK SOURCE: un guitarrista que se aburrió de tocar y se volvió productor.
 * Desde su disquera, DISCOS FACHADA, fabrica falsas estrellas con playback y trucos de estudio,
 * todo conectado a su CONSOLA MAESTRA.
 *
 * Objetivo de principio a fin: rescatar a los 3 miembros de LOS VOLTIOS y detener LA CORONACIÓN
 * en el Estadio, donde su estrella fabricada, CARLOS PARRILLA, será proclamado rey del rock.
 */

export const HERO_NAME = 'AXEL RIFF';
export const GUITAR_NAME = 'LA TRUENO';
export const BAND_NAME = 'LOS VOLTIOS';
export const VILLAIN_NAME = 'EL PRODUCTOR';
/** Identidad real del Productor (jefe de la misión 8). */
export const VILLAIN_REAL_NAME = 'BLAK SOURCE';
/** Su estrella fabricada: el falso guitarrista que será coronado (jefe final). */
export const MASTERPIECE_NAME = 'CARLOS PARRILLA';
/** Punks fanáticos que defienden a los falsos guitarristas (enemigos comunes). */
export const GANG_NAME = 'LOS FANÁTICOS';

export const MAIN_OBJECTIVE = 'Rescata a tu banda y detén la Coronación';

/** Pantallas de la intro, mostradas al empezar una nueva partida. */
export const INTRO_PAGES: string[] = [
  'NEON CITY, 1986.\n\nAntes, cada esquina sonaba a rock de verdad. Clubes llenos, amplis al máximo y guitarras con alma.',
  'Hoy la ciudad está invadida por FALSOS GUITARRISTAS.\n\nLlenan estadios, salen en todas las revistas y juran ser las grandes leyendas de la música.',
  'Pero son ídolos con pies de barro.\n\nSu técnica es falsa: limitados, sin lenguaje, sin toque... y ninguno afina el bend.',
  `Detrás de todos está ${VILLAIN_NAME}. Dicen que una vez fue guitarrista, pero se aburrió de tocar. Desde su disquera, DISCOS FACHADA, fabrica estrellas con playback y trucos de estudio, todo conectado a su CONSOLA MAESTRA.`,
  `Un truco no reemplaza al talento. Por eso anoche el Productor secuestró a ${BAND_NAME}: TAMBO en la batería, LOLA en el bajo y KEI en los teclados. Quiere copiar su toque.`,
  `En 10 noches celebrará LA CORONACIÓN en el Estadio. Su estrella fabricada, ${MASTERPIECE_NAME}, será proclamado rey del rock para siempre.`,
  `Eres ${HERO_NAME}. Tu guitarra, ${GUITAR_NAME}, solo responde a la técnica auténtica, y ningún truco de estudio la puede imitar.\n\nAfina. Sube el volumen. Demuéstrales cómo suena un bend de verdad.`,
];

/** Epílogo tras completar la misión 10. */
export const ENDING_PAGES: string[] = [
  `El último bend suena perfecto, afinado hasta la nota exacta. ${MASTERPIECE_NAME} no tiene un cuarto lick para responder.`,
  'La corona cae al suelo. La Consola Maestra bajo el escenario revienta en chispas y, por primera vez, todos escuchan cómo suena Carlos sin trucos.',
  'Uno a uno, los falsos guitarristas de la ciudad quedan expuestos. Detrás del playback no había nada.',
  `${BAND_NAME} vuelven a tocar juntos en el Estadio, y Neon City recuerda cómo suena el rock de verdad.`,
  'FIN.\n\nGracias por jugar ROCKSTREET.',
];
