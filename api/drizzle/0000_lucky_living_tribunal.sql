CREATE TYPE "public"."ambito_publicacion" AS ENUM('perfil', 'mundial');--> statement-breakpoint
CREATE TYPE "public"."estado_buzon" AS ENUM('abierto', 'en_revision', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."estado_cuenta" AS ENUM('pendiente_verificacion', 'activa', 'suspendida');--> statement-breakpoint
CREATE TYPE "public"."estado_publicacion" AS ENUM('visible', 'bajada');--> statement-breakpoint
CREATE TYPE "public"."estado_solicitud" AS ENUM('pendiente', 'aceptada', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."estado_ticket" AS ENUM('abierto', 'en_proceso', 'resuelto');--> statement-breakpoint
CREATE TYPE "public"."estado_verificacion" AS ENUM('pendiente', 'aprobada', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."estado_votacion" AS ENUM('borrador', 'abierta', 'cerrada');--> statement-breakpoint
CREATE TYPE "public"."origen_conexion" AS ENUM('referido', 'solicitud');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('persona', 'empresa', 'admin');--> statement-breakpoint
CREATE TYPE "public"."segmento_empresa" AS ENUM('chica', 'mediana', 'grande');--> statement-breakpoint
CREATE TYPE "public"."sentimiento" AS ENUM('pendiente', 'positivo', 'neutro', 'negativo');--> statement-breakpoint
CREATE TYPE "public"."signo_reaccion" AS ENUM('positivo', 'negativo');--> statement-breakpoint
CREATE TYPE "public"."tipo_buzon" AS ENUM('bug', 'sugerencia');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_score" AS ENUM('comentario_emitido', 'reaccion_mensaje', 'conexion_nueva', 'conversacion_sostenida', 'mencion', 'publicacion', 'penalizacion_categoria', 'penalizacion_moderacion');--> statement-breakpoint
CREATE TYPE "public"."tipo_mensaje" AS ENUM('texto', 'archivo', 'audio', 'ubicacion');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacion" AS ENUM('comentario', 'mencion', 'solicitud_conexion', 'conexion_aceptada', 'mensaje', 'guardado', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."tipo_pieza" AS ENUM('propaganda', 'video_stop_scroll');--> statement-breakpoint
CREATE TABLE "codigos_referido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"emisor_id" uuid NOT NULL,
	"usado_por" uuid,
	"usado_en" timestamp with time zone,
	"expira_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credenciales_webauthn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"clave_publica" text NOT NULL,
	"contador" integer DEFAULT 0 NOT NULL,
	"transportes" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"usado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"razon_social" text NOT NULL,
	"segmento" "segmento_empresa" NOT NULL,
	"sitio_web" text,
	"suscripcion_activa" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_usuario" text NOT NULL,
	"nombre" text NOT NULL,
	"bio" text,
	"foto_r2_key" text,
	"banner_r2_key" text,
	"rol" "rol_usuario" DEFAULT 'persona' NOT NULL,
	"estado" "estado_cuenta" DEFAULT 'pendiente_verificacion' NOT NULL,
	"es_humano_verificado" boolean DEFAULT false NOT NULL,
	"verificado_en" timestamp with time zone,
	"perfil_publico" boolean DEFAULT true NOT NULL,
	"score_actual" integer DEFAULT 0 NOT NULL,
	"referido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"selfie_r2_key" text,
	"resultado_algoritmo" jsonb,
	"estado" "estado_verificacion" DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" text,
	"revisado_por" uuid,
	"revisado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conexiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_menor" uuid NOT NULL,
	"usuario_mayor" uuid NOT NULL,
	"origen" "origen_conexion" DEFAULT 'solicitud' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitudes_conexion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emisor_id" uuid NOT NULL,
	"receptor_id" uuid NOT NULL,
	"estado" "estado_solicitud" DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resuelto_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bans_posteo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"publicacion_id" uuid,
	"hasta" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"es_empresas" boolean DEFAULT false NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"sentimiento" "sentimiento" DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardados" (
	"usuario_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardados_usuario_id_publicacion_id_pk" PRIMARY KEY("usuario_id","publicacion_id")
);
--> statement-breakpoint
CREATE TABLE "menciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publicacion_id" uuid,
	"comentario_id" uuid,
	"mencionado_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piezas_concientizacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_pieza" NOT NULL,
	"titulo" text NOT NULL,
	"texto" text,
	"media_r2_key" text,
	"duracion_s" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publicaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autor_id" uuid NOT NULL,
	"ambito" "ambito_publicacion" NOT NULL,
	"categoria_id" uuid,
	"texto" text NOT NULL,
	"media" jsonb,
	"estado" "estado_publicacion" DEFAULT 'visible' NOT NULL,
	"motivo_baja" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claves_dispositivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"clave_publica" text NOT NULL,
	"etiqueta_dispositivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"revocado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_mensaje_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"tipo" "tipo_mensaje" DEFAULT 'texto' NOT NULL,
	"ciphertext" text NOT NULL,
	"nonce" text NOT NULL,
	"media_r2_key" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"entregado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participantes_conversacion" (
	"conversacion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"es_iniciador" text,
	"leido_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participantes_conversacion_conversacion_id_usuario_id_pk" PRIMARY KEY("conversacion_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "reacciones_mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensaje_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"signo" "signo_reaccion" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niveles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orden" integer NOT NULL,
	"nombre" text NOT NULL,
	"umbral" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"contraparte_id" uuid,
	"tipo" "tipo_evento_score" NOT NULL,
	"delta_bruto" integer NOT NULL,
	"delta_aplicado" integer NOT NULL,
	"tope_aplicado" text,
	"referencia_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_notificacion" NOT NULL,
	"texto" text NOT NULL,
	"detalle" text,
	"actor_id" uuid,
	"destino_seccion" text NOT NULL,
	"destino_id" uuid,
	"leida" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"inicio_en" timestamp with time zone DEFAULT now() NOT NULL,
	"fin_en" timestamp with time zone,
	"segundos_scroll" integer DEFAULT 0 NOT NULL,
	"stops_mostrados" integer DEFAULT 0 NOT NULL,
	"fue_rebote" boolean DEFAULT false NOT NULL,
	"rafaga_detectada" boolean DEFAULT false NOT NULL,
	"resumen" jsonb
);
--> statement-breakpoint
CREATE TABLE "vistas_categoria" (
	"usuario_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"vistas" integer DEFAULT 0 NOT NULL,
	"ultima_vista_en" timestamp with time zone,
	CONSTRAINT "vistas_categoria_usuario_id_categoria_id_pk" PRIMARY KEY("usuario_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "buzon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_buzon" NOT NULL,
	"texto" text NOT NULL,
	"estado" "estado_buzon" DEFAULT 'abierto' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opciones_votacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"votacion_id" uuid NOT NULL,
	"texto" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"asunto" text NOT NULL,
	"texto" text NOT NULL,
	"estado" "estado_ticket" DEFAULT 'abierto' NOT NULL,
	"respuesta" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resuelto_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "votaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"estado" "estado_votacion" DEFAULT 'abierta' NOT NULL,
	"creado_por" uuid,
	"abre_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cierra_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"votacion_id" uuid NOT NULL,
	"opcion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remote_config" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"descripcion" text NOT NULL,
	"es_doctrina" boolean DEFAULT false NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codigos_referido" ADD CONSTRAINT "codigos_referido_emisor_id_usuarios_id_fk" FOREIGN KEY ("emisor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigos_referido" ADD CONSTRAINT "codigos_referido_usado_por_usuarios_id_fk" FOREIGN KEY ("usado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credenciales_webauthn" ADD CONSTRAINT "credenciales_webauthn_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificaciones" ADD CONSTRAINT "verificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificaciones" ADD CONSTRAINT "verificaciones_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conexiones" ADD CONSTRAINT "conexiones_usuario_menor_usuarios_id_fk" FOREIGN KEY ("usuario_menor") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conexiones" ADD CONSTRAINT "conexiones_usuario_mayor_usuarios_id_fk" FOREIGN KEY ("usuario_mayor") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_conexion" ADD CONSTRAINT "solicitudes_conexion_emisor_id_usuarios_id_fk" FOREIGN KEY ("emisor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_conexion" ADD CONSTRAINT "solicitudes_conexion_receptor_id_usuarios_id_fk" FOREIGN KEY ("receptor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bans_posteo" ADD CONSTRAINT "bans_posteo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bans_posteo" ADD CONSTRAINT "bans_posteo_publicacion_id_publicaciones_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicaciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_publicacion_id_publicaciones_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardados" ADD CONSTRAINT "guardados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardados" ADD CONSTRAINT "guardados_publicacion_id_publicaciones_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menciones" ADD CONSTRAINT "menciones_publicacion_id_publicaciones_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menciones" ADD CONSTRAINT "menciones_comentario_id_comentarios_id_fk" FOREIGN KEY ("comentario_id") REFERENCES "public"."comentarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menciones" ADD CONSTRAINT "menciones_mencionado_id_usuarios_id_fk" FOREIGN KEY ("mencionado_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claves_dispositivo" ADD CONSTRAINT "claves_dispositivo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participantes_conversacion" ADD CONSTRAINT "participantes_conversacion_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participantes_conversacion" ADD CONSTRAINT "participantes_conversacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reacciones_mensaje" ADD CONSTRAINT "reacciones_mensaje_mensaje_id_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."mensajes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reacciones_mensaje" ADD CONSTRAINT "reacciones_mensaje_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_eventos" ADD CONSTRAINT "score_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_eventos" ADD CONSTRAINT "score_eventos_contraparte_id_usuarios_id_fk" FOREIGN KEY ("contraparte_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_app" ADD CONSTRAINT "sesiones_app_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistas_categoria" ADD CONSTRAINT "vistas_categoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistas_categoria" ADD CONSTRAINT "vistas_categoria_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buzon" ADD CONSTRAINT "buzon_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opciones_votacion" ADD CONSTRAINT "opciones_votacion_votacion_id_votaciones_id_fk" FOREIGN KEY ("votacion_id") REFERENCES "public"."votaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votaciones" ADD CONSTRAINT "votaciones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos" ADD CONSTRAINT "votos_votacion_id_votaciones_id_fk" FOREIGN KEY ("votacion_id") REFERENCES "public"."votaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos" ADD CONSTRAINT "votos_opcion_id_opciones_votacion_id_fk" FOREIGN KEY ("opcion_id") REFERENCES "public"."opciones_votacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos" ADD CONSTRAINT "votos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "codigos_referido_codigo_idx" ON "codigos_referido" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "codigos_referido_emisor_idx" ON "codigos_referido" USING btree ("emisor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credenciales_webauthn_credential_id_idx" ON "credenciales_webauthn" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "credenciales_webauthn_usuario_idx" ON "credenciales_webauthn" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_token_hash_idx" ON "sesiones" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_idx" ON "sesiones" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_nombre_usuario_idx" ON "usuarios" USING btree ("nombre_usuario");--> statement-breakpoint
CREATE INDEX "usuarios_estado_idx" ON "usuarios" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "verificaciones_estado_idx" ON "verificaciones" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "conexiones_par_idx" ON "conexiones" USING btree ("usuario_menor","usuario_mayor");--> statement-breakpoint
CREATE INDEX "conexiones_menor_idx" ON "conexiones" USING btree ("usuario_menor");--> statement-breakpoint
CREATE INDEX "conexiones_mayor_idx" ON "conexiones" USING btree ("usuario_mayor");--> statement-breakpoint
CREATE UNIQUE INDEX "solicitudes_par_idx" ON "solicitudes_conexion" USING btree ("emisor_id","receptor_id");--> statement-breakpoint
CREATE INDEX "solicitudes_receptor_idx" ON "solicitudes_conexion" USING btree ("receptor_id","estado");--> statement-breakpoint
CREATE INDEX "bans_posteo_usuario_idx" ON "bans_posteo" USING btree ("usuario_id","hasta");--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "comentarios_publicacion_idx" ON "comentarios" USING btree ("publicacion_id","creado_en");--> statement-breakpoint
CREATE INDEX "comentarios_autor_idx" ON "comentarios" USING btree ("autor_id","creado_en");--> statement-breakpoint
CREATE INDEX "menciones_mencionado_idx" ON "menciones" USING btree ("mencionado_id","creado_en");--> statement-breakpoint
CREATE INDEX "piezas_tipo_idx" ON "piezas_concientizacion" USING btree ("tipo","activa","orden");--> statement-breakpoint
CREATE INDEX "publicaciones_autor_idx" ON "publicaciones" USING btree ("autor_id","creado_en");--> statement-breakpoint
CREATE INDEX "publicaciones_categoria_idx" ON "publicaciones" USING btree ("categoria_id","estado","creado_en");--> statement-breakpoint
CREATE INDEX "publicaciones_ambito_idx" ON "publicaciones" USING btree ("ambito","creado_en");--> statement-breakpoint
CREATE INDEX "claves_dispositivo_usuario_idx" ON "claves_dispositivo" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "mensajes_conversacion_idx" ON "mensajes" USING btree ("conversacion_id","creado_en");--> statement-breakpoint
CREATE INDEX "participantes_usuario_idx" ON "participantes_conversacion" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reacciones_mensaje_unica_idx" ON "reacciones_mensaje" USING btree ("mensaje_id","usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "niveles_orden_idx" ON "niveles" USING btree ("orden");--> statement-breakpoint
CREATE INDEX "score_eventos_usuario_idx" ON "score_eventos" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE INDEX "score_eventos_par_idx" ON "score_eventos" USING btree ("usuario_id","contraparte_id","creado_en");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_idx" ON "notificaciones" USING btree ("usuario_id","leida","creado_en");--> statement-breakpoint
CREATE INDEX "sesiones_app_usuario_idx" ON "sesiones_app" USING btree ("usuario_id","inicio_en");--> statement-breakpoint
CREATE INDEX "vistas_categoria_usuario_idx" ON "vistas_categoria" USING btree ("usuario_id","vistas");--> statement-breakpoint
CREATE INDEX "buzon_estado_idx" ON "buzon" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE INDEX "opciones_votacion_idx" ON "opciones_votacion" USING btree ("votacion_id");--> statement-breakpoint
CREATE INDEX "tickets_estado_idx" ON "tickets" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE INDEX "votaciones_estado_idx" ON "votaciones" USING btree ("estado","cierra_en");--> statement-breakpoint
CREATE UNIQUE INDEX "votos_un_humano_un_voto_idx" ON "votos" USING btree ("votacion_id","usuario_id");