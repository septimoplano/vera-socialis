CREATE TABLE "retos_webauthn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"reto" text NOT NULL,
	"proposito" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"consumido_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "clave_hash" text;--> statement-breakpoint
ALTER TABLE "retos_webauthn" ADD CONSTRAINT "retos_webauthn_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "retos_webauthn_reto_idx" ON "retos_webauthn" USING btree ("reto");