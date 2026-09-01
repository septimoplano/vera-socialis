/**
 * Categorías del contenido mundial (spec §2.5). Borrador aprobado como punto de
 * partida: la sección Comunidad puede votar cambios sobre esta lista.
 *
 * `Empresas` es especial: es la ÚNICA categoría donde hay publicidad.
 */
export interface CategoriaSemilla {
  slug: string;
  nombre: string;
  descripcion: string;
  esEmpresas?: boolean;
}

export const CATEGORIAS: CategoriaSemilla[] = [
  { slug: 'gastronomia', nombre: 'Gastronomía', descripcion: 'Comida, cocina y recetas.' },
  { slug: 'automovilismo', nombre: 'Automovilismo', descripcion: 'Autos, motos y competencia.' },
  { slug: 'finanzas', nombre: 'Finanzas', descripcion: 'Ahorro, inversión y economía personal.' },
  {
    slug: 'tecnologia',
    nombre: 'Tecnología',
    descripcion: 'Software, hardware y ciencia aplicada.',
  },
  { slug: 'musica', nombre: 'Música', descripcion: 'Artistas, discos y oficio musical.' },
  { slug: 'deporte', nombre: 'Deporte', descripcion: 'Entrenamiento, competencias y disciplinas.' },
  { slug: 'viajes', nombre: 'Viajes', descripcion: 'Destinos, rutas y vida en camino.' },
  { slug: 'arte-diseno', nombre: 'Arte y Diseño', descripcion: 'Obra visual, oficio y proceso.' },
  {
    slug: 'ciencia',
    nombre: 'Ciencia',
    descripcion: 'Divulgación, investigación y descubrimiento.',
  },
  {
    slug: 'bienestar',
    nombre: 'Bienestar',
    descripcion: 'Salud mental, hábitos y vida equilibrada.',
  },
  { slug: 'cine-series', nombre: 'Cine y Series', descripcion: 'Películas, series y crítica.' },
  { slug: 'videojuegos', nombre: 'Videojuegos', descripcion: 'Juegos, desarrollo y comunidad.' },
  { slug: 'literatura', nombre: 'Literatura', descripcion: 'Libros, lectura y escritura.' },
  { slug: 'mascotas', nombre: 'Mascotas', descripcion: 'Cuidado y vida con animales.' },
  {
    slug: 'naturaleza',
    nombre: 'Naturaleza',
    descripcion: 'Aire libre, medio ambiente y montaña.',
  },
  { slug: 'educacion', nombre: 'Educación', descripcion: 'Aprender, enseñar y estudiar.' },
  { slug: 'fotografia', nombre: 'Fotografía', descripcion: 'Imagen, técnica y mirada.' },
  { slug: 'emprendimiento', nombre: 'Emprendimiento', descripcion: 'Proyectos propios y oficio.' },
  {
    slug: 'empresas',
    nombre: 'Empresas',
    descripcion: 'Perfiles de empresa. Única categoría con publicidad.',
    esEmpresas: true,
  },
];
