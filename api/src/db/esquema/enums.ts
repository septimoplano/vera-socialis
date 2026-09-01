import { pgEnum } from 'drizzle-orm/pg-core';

export const rolUsuario = pgEnum('rol_usuario', ['persona', 'empresa', 'admin']);
export const estadoCuenta = pgEnum('estado_cuenta', [
  'pendiente_verificacion',
  'activa',
  'suspendida',
]);
export const estadoVerificacion = pgEnum('estado_verificacion', [
  'pendiente',
  'aprobada',
  'rechazada',
]);
export const estadoSolicitud = pgEnum('estado_solicitud', ['pendiente', 'aceptada', 'rechazada']);
export const origenConexion = pgEnum('origen_conexion', ['referido', 'solicitud']);

/** Perfil = solo conexiones. Mundial = foro por categoría (spec §2.5). */
export const ambitoPublicacion = pgEnum('ambito_publicacion', ['perfil', 'mundial']);
export const estadoPublicacion = pgEnum('estado_publicacion', ['visible', 'bajada']);

/** Clasificación IA, invisible para el autor (doctrina spec §2.6). */
export const sentimiento = pgEnum('sentimiento', ['pendiente', 'positivo', 'neutro', 'negativo']);
export const signoReaccion = pgEnum('signo_reaccion', ['positivo', 'negativo']);

export const tipoMensaje = pgEnum('tipo_mensaje', ['texto', 'archivo', 'audio', 'ubicacion']);

export const tipoEventoScore = pgEnum('tipo_evento_score', [
  'comentario_emitido',
  'reaccion_mensaje',
  'conexion_nueva',
  'conversacion_sostenida',
  'mencion',
  'publicacion',
  'penalizacion_categoria',
  'penalizacion_moderacion',
]);

export const tipoNotificacion = pgEnum('tipo_notificacion', [
  'comentario',
  'mencion',
  'solicitud_conexion',
  'conexion_aceptada',
  'mensaje',
  'guardado',
  'sistema',
]);

export const tipoBuzon = pgEnum('tipo_buzon', ['bug', 'sugerencia']);
export const estadoBuzon = pgEnum('estado_buzon', ['abierto', 'en_revision', 'cerrado']);
export const estadoTicket = pgEnum('estado_ticket', ['abierto', 'en_proceso', 'resuelto']);
export const estadoVotacion = pgEnum('estado_votacion', ['borrador', 'abierta', 'cerrada']);

export const segmentoEmpresa = pgEnum('segmento_empresa', ['chica', 'mediana', 'grande']);

/** Piezas que VERA intercala: propaganda cada 30 posts y videos del stop scrolling. */
export const tipoPieza = pgEnum('tipo_pieza', ['propaganda', 'video_stop_scroll']);
