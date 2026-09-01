/**
 * Valores iniciales de la config remota — spec §3.
 *
 * Este archivo es la SEMILLA y la documentación de cada parámetro, no la fuente
 * de verdad en runtime: el código siempre lee la tabla `remote_config`, que el
 * panel admin puede ajustar sin deploy. Cambiar un número acá solo afecta a una
 * base nueva o a un reseed.
 */

export interface DefinicionParametro {
  clave: string;
  valor: unknown;
  descripcion: string;
  /** true = no se puede editar ni desde el panel admin (doctrina spec §11). */
  esDoctrina: boolean;
}

export const PARAMETROS: DefinicionParametro[] = [
  {
    clave: 'STOP_SCROLL_STEPS_MIN',
    valor: [2, 10, 30],
    descripcion:
      'Minutos de scroll acumulado en la sesión para cada aviso de stop scrolling; después del último se repite cada 30 min.',
    esDoctrina: false,
  },
  {
    clave: 'STOP_VIDEO_S',
    valor: 30,
    descripcion: 'Duración del video obligatorio del stop scrolling, en segundos.',
    esDoctrina: false,
  },
  {
    clave: 'STOP_SCROLL_EXISTE',
    valor: true,
    descripcion:
      'DOCTRINA: el stop scrolling siempre existe. Solo se puede ver el video o salir de la app.',
    esDoctrina: true,
  },
  {
    clave: 'PROPAGANDA_EVERY_POSTS',
    valor: 30,
    descripcion:
      'Cada cuántas publicaciones del contenido mundial se intercala una pieza de concientización de VERA.',
    esDoctrina: false,
  },
  {
    clave: 'RAFAGA_VENTANA_MIN',
    valor: 10,
    descripcion: 'Ventana en minutos para contar aperturas seguidas de la app.',
    esDoctrina: false,
  },
  {
    clave: 'RAFAGA_APERTURAS',
    valor: 3,
    descripcion:
      'Número de aperturas dentro de la ventana que disparan el aviso de ráfaga ansiosa.',
    esDoctrina: false,
  },
  {
    clave: 'RAFAGA_REBOTE_S',
    valor: 15,
    descripcion: 'Estancia más corta que esto cuenta como rebote.',
    esDoctrina: false,
  },
  {
    clave: 'RAFAGA_EXISTE',
    valor: true,
    descripcion:
      'DOCTRINA: la ráfaga ansiosa siempre avisa con un ejercicio de autoregulación, sin culpa y sin bloquear.',
    esDoctrina: true,
  },
  {
    clave: 'RAFAGA_RESPIRACION',
    valor: { inhalarS: 4, exhalarS: 6 },
    descripcion: 'Ejercicio de autoregulación de la ráfaga ansiosa: respiración 4-6.',
    esDoctrina: false,
  },
  {
    clave: 'BAN_CATEGORIA_HORAS',
    valor: 72,
    descripcion: 'Horas de ban de posteo por publicar en una categoría incorrecta.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_COMENTARIO_POS',
    valor: 2,
    descripcion: 'Delta de social score por emitir un comentario clasificado como positivo.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_COMENTARIO_NEG',
    valor: -3,
    descripcion: 'Delta de social score por emitir un comentario clasificado como negativo.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_REACCION_POS',
    valor: 1,
    descripcion: 'Delta por reaccionar positivamente a un mensaje de chat.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_REACCION_NEG',
    valor: -2,
    descripcion: 'Delta por reaccionar negativamente a un mensaje de chat.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_TOPE_DIARIO',
    valor: 20,
    descripcion: 'Máximo valor absoluto de cambio de score que un usuario puede acumular por día.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_PAR_TOPE_DIA',
    valor: 3,
    descripcion:
      'Máximo de eventos que puntúan entre el mismo par de usuarios por día. Freno anti-colusión.',
    esDoctrina: false,
  },
  {
    clave: 'SCORE_CLASIFICACION_INVISIBLE',
    valor: true,
    descripcion:
      'DOCTRINA: quien comenta o reacciona nunca ve cómo se clasificó su interacción, ni la otra persona sabe que fue reaccionada.',
    esDoctrina: true,
  },
  {
    clave: 'NIVELES_UMBRAL',
    valor: [0, 50, 200, 600, 1500],
    descripcion: 'Umbrales de score para cada nivel cualitativo mostrado en el perfil.',
    esDoctrina: false,
  },
  {
    clave: 'SIN_LIKES',
    valor: true,
    descripcion:
      'DOCTRINA: no existen likes, contadores rojos, streaks ni badges de FOMO. La interacción es el comentario.',
    esDoctrina: true,
  },
  {
    clave: 'SIN_ALGORITMO_RECOMENDACION',
    valor: true,
    descripcion:
      'DOCTRINA: el contenido se ordena cronológicamente dentro de la categoría que el usuario elige. No hay recomendador.',
    esDoctrina: true,
  },
  {
    clave: 'PUBLICIDAD_SOLO_EMPRESAS',
    valor: true,
    descripcion: 'DOCTRINA: la única categoría con publicidad es Empresas.',
    esDoctrina: true,
  },
];

/** Nombres de los niveles, en el mismo orden que NIVELES_UMBRAL. */
export const NIVELES = ['Inicial', 'En crecimiento', 'Confiable', 'Ejemplar', 'Referente'] as const;

export function obtenerParametro(clave: string): DefinicionParametro {
  const parametro = PARAMETROS.find((p) => p.clave === clave);
  if (!parametro) throw new Error(`Parámetro desconocido: ${clave}`);
  return parametro;
}
