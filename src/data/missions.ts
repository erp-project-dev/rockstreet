import type { PowerId } from './upgrades';

export type BandMember = 'TAMBO' | 'LOLA' | 'KEI';

export interface MissionDef {
  id: number; // 1..10
  name: string;
  location: string;
  /** Posición del nodo en el mapa (coordenadas de pantalla 1920x1080). */
  mapPos: { x: number; y: number };
  /** Lore mostrado en el briefing antes de jugar. */
  lore: string;
  objective: string;
  /** Jefe: un falso guitarrista. */
  boss: string;
  /** Su defecto musical (lo que delata que es un falso). */
  bossFlaw: string;
  /** Texto mostrado al completar la misión. */
  outro: string;
  /** Recompensa fija al completar la misión (además del dinero recogido). */
  reward: number;
  /** Poder que se desbloquea al completarla. */
  unlocksPower?: PowerId;
  /** Miembro de la banda rescatado al completarla. */
  rescues?: BandMember;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    name: 'El Garage',
    location: 'Barrio Sur',
    mapPos: { x: 230, y: 630 },
    lore: 'Los Fanáticos están destrozando tu garage, donde ensaya la banda. Los manda Sid "Tres Acordes", el falso guitarrista del barrio, que presume de ser el padre del punk.',
    objective: 'Echa a los fanáticos y derrota a Sid "Tres Acordes".',
    boss: 'SID "TRES ACORDES"',
    bossFlaw: 'Limitado: solo sabe tres acordes, y son robados.',
    outro: 'Sid cae y suelta un nombre: "El Amplificador". El club del callejón es donde el Productor presenta a sus falsas estrellas.',
    reward: 150,
  },
  {
    id: 2,
    name: 'Callejón del Club',
    location: 'Club El Amplificador',
    mapPos: { x: 330, y: 395 },
    lore: 'El Amplificador era el mejor club de Neon City. Ahora su estrella es El Rey del Playback: llena la sala cada noche sin tocar una sola nota en vivo.',
    objective: 'Llega al escenario y desenchufa al Rey del Playback.',
    boss: 'EL REY DEL PLAYBACK',
    bossFlaw: 'No toca nada en vivo: todo es una cinta.',
    outro: 'Sin su cinta, el Rey se queda mudo frente a todos. Al tocar en ese escenario, La Trueno despierta un nuevo poder: FEEDBACK. En el camerino hay un ticket del Pixel Palace.',
    reward: 200,
    unlocksPower: 'feedback',
  },
  {
    id: 3,
    name: 'Salón Arcade',
    location: 'Pixel Palace',
    mapPos: { x: 640, y: 585 },
    lore: 'Tambo está encerrado en el Pixel Palace. Lo vigila Shredder Sin Alma, un falso virtuoso que toca a mil notas por segundo sin que ninguna diga nada.',
    objective: 'Rescata a TAMBO y vence a Shredder Sin Alma.',
    boss: 'SHREDDER SIN ALMA',
    bossFlaw: 'Mucha velocidad, cero sentimiento.',
    outro: 'TAMBO está libre. "El Productor quería copiar mi groove, pero el groove no se graba en una consola", dice. "Se llevaron a Lola a la disquería Vinilo Negro."',
    reward: 250,
    rescues: 'TAMBO',
  },
  {
    id: 4,
    name: 'La Disquería',
    location: 'Vinilo Negro',
    mapPos: { x: 945, y: 445 },
    lore: 'En Vinilo Negro están cambiando los discos de las leyendas reales por grabaciones de falsos guitarristas. Lo dirige La Reina del Bend Desafinado, que nunca llega a la nota.',
    objective: 'Salva los vinilos originales y derrota a la Reina.',
    boss: 'LA REINA DEL BEND DESAFINADO',
    bossFlaw: 'Sus bends nunca llegan a la nota.',
    outro: 'Entre los vinilos rescatados hay un disco dorado de una leyenda real. Al escucharlo, La Trueno aprende el SOLO DE GUITARRA. Lola no estaba aquí: la llevaron por el metro.',
    reward: 300,
    unlocksPower: 'solo',
  },
  {
    id: 5,
    name: 'Línea 86',
    location: 'Metro de Neon City',
    mapPos: { x: 1230, y: 650 },
    lore: 'El último tren de la Línea 86 va lleno de fanáticos rumbo al estudio del Productor. Pose Maestro viaja en el vagón VIP: pura imagen y cero técnica.',
    objective: 'Recorre los vagones y desenmascara a Pose Maestro.',
    boss: 'POSE MAESTRO',
    bossFlaw: 'Pura imagen: la guitarra ni siquiera está enchufada.',
    outro: 'Pose Maestro queda en ridículo en plena pose. El tren se detiene en la estación Estudio, donde las luces de grabación están encendidas.',
    reward: 350,
  },
  {
    id: 6,
    name: 'El Estudio',
    location: 'Estudio del Productor',
    mapPos: { x: 650, y: 290 },
    lore: 'El Productor obliga a Lola a grabar sus líneas de bajo para que El Clon las copie nota por nota. El Clon repite todo, pero no tiene ni una idea propia.',
    objective: 'Rescata a LOLA y destruye las cintas copiadas.',
    boss: 'EL CLON',
    bossFlaw: 'Copia solos ajenos sin lenguaje propio.',
    outro: 'LOLA está libre. "El Clon podía repetir cada nota, pero no sabía por qué la tocaba." Kei está en DISCOS FACHADA, la disquera del Productor, al otro lado de la autopista.',
    reward: 400,
    rescues: 'LOLA',
  },
  {
    id: 7,
    name: 'La Autopista',
    location: 'Autopista Neón',
    mapPos: { x: 1460, y: 550 },
    lore: 'La única ruta a DISCOS FACHADA es la Autopista Neón. La controla Volumen Máximo, un falso guitarrista que tapa su falta de toque con más ruido que nadie.',
    objective: 'Cruza la autopista y baja el volumen a Volumen Máximo.',
    boss: 'VOLUMEN MÁXIMO',
    bossFlaw: 'Esconde su falta de toque detrás del ruido.',
    outro: 'Sin ruido que lo cubra, Volumen Máximo queda expuesto en silencio. Al final de la autopista brilla el letrero de DISCOS FACHADA.',
    reward: 450,
  },
  {
    id: 8,
    name: 'La Disquera',
    location: 'Discos Fachada',
    mapPos: { x: 1500, y: 365 },
    lore: 'Kei está prisionera en DISCOS FACHADA. Aquí despacha el Productor en persona: BLAK SOURCE, un guitarrista que se aburrió de tocar y se volvió productor. Chullo, bigote y lentes redondos. Ya no toca: solo da órdenes desde su consola.',
    objective: 'Rescata a KEI y desenchufa la consola de Blak Source.',
    boss: 'BLAK SOURCE',
    bossFlaw: 'Se aburrió de la guitarra: ahora solo produce.',
    outro: 'KEI está libre y LOS VOLTIOS vuelven a estar juntos. Blak Source se ríe desde el suelo: "Llegas tarde. Mi estrella ya está lista. La Coronación sigue." Su estrella ensaya en la Academia.',
    reward: 500,
    rescues: 'KEI',
  },
  {
    id: 9,
    name: 'La Academia',
    location: 'Academia del Método',
    mapPos: { x: 1090, y: 245 },
    lore: 'En la Academia del Método, los falsos aprenden a sonar "correcto". El profesor estrella es ALEX ESCALANDER: toca todo en el orden en que aparecen las escalas, solo arpegios básicos... y no conoce las séptimas.',
    objective: 'Cruza la Academia y vence a Alex Escalander.',
    boss: 'ALEX ESCALANDER',
    bossFlaw: 'Toca las escalas en orden y no conoce las séptimas.',
    outro: 'Alex intenta una séptima y se le enredan los dedos. Entre sus partituras aparece el programa de la Coronación: el nuevo rey del rock será CARLOS PARRILLA.',
    reward: 600,
  },
  {
    id: 10,
    name: 'La Coronación',
    location: 'Estadio Neon City',
    mapPos: { x: 1730, y: 220 },
    lore: 'Esta es la noche. CARLOS PARRILLA, la estrella fabricada del Productor, espera la corona sobre el escenario, con la Consola Maestra zumbando debajo. Hizo toda su carrera con 3 licks: siempre los mismos recursos. Toda la ciudad está mirando.',
    objective: 'Derrota a CARLOS PARRILLA y detén la Coronación.',
    boss: 'CARLOS PARRILLA',
    bossFlaw: 'Hizo su carrera con 3 licks: siempre los mismos recursos.',
    outro: 'Carlos Parrilla cae. La Coronación se cancela para siempre.',
    reward: 1000,
  },
];

export const getMission = (id: number): MissionDef => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Misión ${id} no existe`);
  return m;
};
