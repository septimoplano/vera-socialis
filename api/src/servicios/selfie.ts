import Anthropic from '@anthropic-ai/sdk';

/**
 * Pre-filtro algorítmico de la selfie de registro.
 *
 * NO decide nada por sí solo: la aprobación final siempre es humana (spec §2.1).
 * Solo saca de la cola lo que claramente no es una selfie de una persona, para
 * que el fundador revise menos ruido.
 */
export interface ResultadoSelfie {
  /** false = descartable sin revisión humana. true = pasa a la cola. */
  aceptable: boolean;
  /** Qué vio el algoritmo, en español, para mostrarlo en el panel. */
  motivo: string;
  /** Marcado cuando el algoritmo no pudo opinar: siempre pasa a revisión. */
  requiereRevisionHumana: boolean;
  detalle?: Record<string, unknown>;
}

export interface ValidadorSelfie {
  validar(imagen: Buffer, tipoMime: string): Promise<ResultadoSelfie>;
}

const TIPOS_ACEPTADOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAXIMO = 8 * 1024 * 1024;
const TAMANO_MINIMO = 5 * 1024;

/** Chequeos baratos que no necesitan llamar a ningún servicio. */
export function revisarFormato(imagen: Buffer, tipoMime: string): ResultadoSelfie | null {
  if (!TIPOS_ACEPTADOS.has(tipoMime)) {
    return {
      aceptable: false,
      motivo: `Formato no admitido (${tipoMime}). Usa JPG, PNG o WEBP.`,
      requiereRevisionHumana: false,
    };
  }

  if (imagen.byteLength > TAMANO_MAXIMO) {
    return {
      aceptable: false,
      motivo: 'La imagen pesa más de 8 MB.',
      requiereRevisionHumana: false,
    };
  }

  if (imagen.byteLength < TAMANO_MINIMO) {
    return {
      aceptable: false,
      motivo: 'La imagen es demasiado pequeña para verse con claridad.',
      requiereRevisionHumana: false,
    };
  }

  return null;
}

const INSTRUCCION = `Eres el pre-filtro de verificación humana de una red social donde cada cuenta debe ser una persona real.

Mira la imagen y responde SOLO con un objeto JSON, sin texto alrededor:
{"hayRostro": bool, "cantidadRostros": number, "pareceSelfieEnVivo": bool, "pareceFotoDePantalla": bool, "pareceIlustracionOAvatar": bool, "motivo": "explicación breve en español"}

Criterios:
- hayRostro: hay al menos un rostro humano visible y reconocible.
- pareceSelfieEnVivo: parece tomada con la cámara en el momento, no recortada de otra foto.
- pareceFotoDePantalla: es la foto de una pantalla, un documento o una foto impresa.
- pareceIlustracionOAvatar: es un dibujo, render, avatar o imagen generada.

No juzgues a la persona, ni su apariencia, ni intentes identificar quién es. Solo describe qué tipo de imagen es.`;

interface RespuestaModelo {
  hayRostro?: boolean;
  cantidadRostros?: number;
  pareceSelfieEnVivo?: boolean;
  pareceFotoDePantalla?: boolean;
  pareceIlustracionOAvatar?: boolean;
  motivo?: string;
}

/**
 * Validador real: visión de Claude Haiku. A escala de la beta (menos de 100
 * cuentas) el costo es de centavos.
 */
export function crearValidadorClaude(apiKey: string): ValidadorSelfie {
  const cliente = new Anthropic({ apiKey });

  return {
    async validar(imagen, tipoMime) {
      const problemaFormato = revisarFormato(imagen, tipoMime);
      if (problemaFormato) return problemaFormato;

      try {
        const respuesta = await cliente.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: tipoMime as 'image/jpeg' | 'image/png' | 'image/webp',
                    data: imagen.toString('base64'),
                  },
                },
                { type: 'text', text: INSTRUCCION },
              ],
            },
          ],
        });

        const texto = respuesta.content
          .filter((bloque) => bloque.type === 'text')
          .map((bloque) => bloque.text)
          .join('')
          .trim();

        const json = texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
        const datos = JSON.parse(json) as RespuestaModelo;

        return interpretar(datos);
      } catch (error) {
        // Si el pre-filtro falla, la selfie pasa igual a revisión humana:
        // nunca se rechaza a alguien por una caída de un servicio.
        return {
          aceptable: true,
          motivo: 'El pre-filtro no pudo revisar la imagen; queda para revisión manual.',
          requiereRevisionHumana: true,
          detalle: { error: error instanceof Error ? error.message : String(error) },
        };
      }
    },
  };
}

/** Traduce la lectura del modelo a la decisión del pre-filtro. */
export function interpretar(datos: RespuestaModelo): ResultadoSelfie {
  const detalle = { ...datos };

  if (datos.hayRostro === false) {
    return {
      aceptable: false,
      motivo: 'No se ve un rostro humano en la imagen.',
      requiereRevisionHumana: false,
      detalle,
    };
  }

  if (datos.pareceIlustracionOAvatar === true) {
    return {
      aceptable: false,
      motivo: 'Parece una ilustración o un avatar, no una persona.',
      requiereRevisionHumana: false,
      detalle,
    };
  }

  if (datos.pareceFotoDePantalla === true) {
    return {
      aceptable: false,
      motivo: 'Parece la foto de una pantalla o de otra foto.',
      requiereRevisionHumana: false,
      detalle,
    };
  }

  if ((datos.cantidadRostros ?? 1) > 1) {
    return {
      aceptable: true,
      motivo: 'Aparece más de una persona; conviene mirarla con calma.',
      requiereRevisionHumana: true,
      detalle,
    };
  }

  if (datos.pareceSelfieEnVivo === false) {
    return {
      aceptable: true,
      motivo: 'Hay un rostro, pero no parece tomada en el momento.',
      requiereRevisionHumana: true,
      detalle,
    };
  }

  return {
    aceptable: true,
    motivo: datos.motivo ?? 'Se ve un rostro humano en una selfie.',
    requiereRevisionHumana: false,
    detalle,
  };
}

/**
 * Sin CLAUDE_API_KEY solo se revisa el formato y todo lo demás queda para el
 * fundador. Permite trabajar la beta antes de que existan las credenciales.
 */
export function crearValidadorBasico(): ValidadorSelfie {
  return {
    async validar(imagen, tipoMime) {
      const problemaFormato = revisarFormato(imagen, tipoMime);
      if (problemaFormato) return problemaFormato;

      return {
        aceptable: true,
        motivo: 'Sin pre-filtro de imagen configurado; queda para revisión manual.',
        requiereRevisionHumana: true,
      };
    },
  };
}
