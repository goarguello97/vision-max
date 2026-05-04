/**
 * @fileoverview Datos simulados de TMDB para desarrollo sin API
 * @module utils/mockTMDB
 */

/**
 * Interfaz para película mock básica.
 * @interface MockMovie
 */
export interface MockMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
}

/**
 * Interfaz para detalle de película mock.
 * @interface MockMovieDetail
 */
export interface MockMovieDetail extends MockMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  production_companies: { id: number; name: string }[];
}

/**
 * Interfaz para créditos de película mock.
 * @interface MockCredits
 */
export interface MockCredits {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
  }[];
}

const MOCK_MOVIES: MockMovie[] = [
  {
    id: 550,
    title: 'Fight Club',
    overview: 'Un empleado de oficina insomne y un fabricante de jabones forman un club de lucha clandestino que se convierte en algo mucho más grande.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkqzb2OwMS.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 26000,
    genre_ids: [18, 53, 35],
    adult: false,
    original_language: 'en',
    original_title: 'Fight Club',
    popularity: 120.5,
  },
  {
    id: 238,
    title: 'El Padrino',
    overview: 'La saga de la familia Corleone desde los años 50 hasta los 80.',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    release_date: '1972-03-14',
    vote_average: 8.7,
    vote_count: 18000,
    genre_ids: [18, 80],
    adult: false,
    original_language: 'en',
    original_title: "The Godfather",
    popularity: 95.2,
  },
  {
    id: 424,
    title: "Schindler's List",
    overview: 'La historia real de Oskar Schindler, un empresario alemán que salvó a más de mil judíos durante el Holocausto.',
    poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
    backdrop_path: '/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg',
    release_date: '1993-12-15',
    vote_average: 8.6,
    vote_count: 14000,
    genre_ids: [18, 36, 10752],
    adult: false,
    original_language: 'en',
    original_title: "Schindler's List",
    popularity: 75.8,
  },
  {
    id: 155,
    title: 'The Dark Knight',
    overview: 'Batman enfrenta al Joker en una batalla psicológica por el control de Gotham City.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    release_date: '2008-07-16',
    vote_average: 8.5,
    vote_count: 30000,
    genre_ids: [18, 28, 80, 53],
    adult: false,
    original_language: 'en',
    original_title: 'The Dark Knight',
    popularity: 150.3,
  },
  {
    id: 680,
    title: 'Pulp Fiction',
    overview: 'Las vidas de dos mafiosos, unboxeur, un gángster y dos两位餐厅员工 se entrelazan en cuatro historias de violencia y redención.',
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
    release_date: '1994-09-10',
    vote_average: 8.5,
    vote_count: 25000,
    genre_ids: [53, 80],
    adult: false,
    original_language: 'en',
    original_title: 'Pulp Fiction',
    popularity: 110.7,
  },
  {
    id: 13,
    title: 'Forrest Gump',
    overview: 'La historia de un hombre común que vive momentos históricos extraordinarios.',
    poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    backdrop_path: '/7c9UVPPiTPltouxRVY6N9uugaVA.jpg',
    release_date: '1994-06-23',
    vote_average: 8.5,
    vote_count: 23000,
    genre_ids: [35, 18, 10749],
    adult: false,
    original_language: 'en',
    original_title: 'Forrest Gump',
    popularity: 95.1,
  },
  {
    id: 497,
    title: 'The Green Mile',
    overview: 'Un guardia de prisión descubre que un convicto tiene poderes sobrenaturales.',
    poster_path: '/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
    backdrop_path: '/Adrip2Jqzw56KeuV2nAxucKMNXA.jpg',
    release_date: '1999-12-10',
    vote_average: 8.5,
    vote_count: 15000,
    genre_ids: [14, 18, 80],
    adult: false,
    original_language: 'en',
    original_title: 'The Green Mile',
    popularity: 80.4,
  },
  {
    id: 120,
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    overview: 'Un joven hobbit inicia un viaje para destruir un anillo maldito.',
    poster_path: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    backdrop_path: '/pIUvQ9Ed35wlWhY2oU6OmwEsmzG.jpg',
    release_date: '2001-12-18',
    vote_average: 8.4,
    vote_count: 22000,
    genre_ids: [12, 14, 28],
    adult: false,
    original_language: 'en',
    original_title: 'The Lord of the Rings: The Fellowship of the Ring',
    popularity: 140.2,
  },
  {
    id: 27205,
    title: 'Inception',
    overview: 'Un ladrón que roba secretos a través de sueños compartidos recibe una oportunidad de borrar su historial criminal.',
    poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Ber.jpg',
    backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    release_date: '2010-07-15',
    vote_average: 8.4,
    vote_count: 32000,
    genre_ids: [28, 878, 12],
    adult: false,
    original_language: 'en',
    original_title: 'Inception',
    popularity: 135.6,
  },
  {
    id: 634649,
    title: 'Spider-Man: No Way Home',
    overview: 'Spider-Man busca ayuda del Doctor Extraño para revelar su identidad secretos.',
    poster_path: '/1g0dhYtq4irTY1GPXvft6k4U0dC.jpg',
    backdrop_path: '/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg',
    release_date: '2021-12-15',
    vote_average: 8.2,
    vote_count: 18000,
    genre_ids: [28, 12, 878],
    adult: false,
    original_language: 'en',
    original_title: 'Spider-Man: No Way Home',
    popularity: 180.5,
  },
];

export const MOCK_GENRES = [
  { id: 28, name: 'Acción' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animación' },
  { id: 35, name: 'Comedia' },
  { id: 80, name: 'Crimen' },
  { id: 99, name: 'Documental' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familia' },
  { id: 14, name: 'Fantasía' },
  { id: 36, name: 'Historia' },
  { id: 27, name: 'Terror' },
  { id: 10402, name: 'Música' },
  { id: 9648, name: 'Misterio' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ciencia ficción' },
  { id: 10770, name: 'Película de TV' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'Guerra' },
  { id: 37, name: 'Western' },
];

/**
 * Obtiene el detalle de una película mock por su ID.
 * @function getMockMovieDetail
 * @param {number} id - ID de la película
 * @returns {MockMovieDetail | null} Detalle de la película o null
 */
export function getMockMovieDetail(id: number): MockMovieDetail | null {
  const movie = MOCK_MOVIES.find((m) => m.id === id);
  if (!movie) return null;

  return {
    ...movie,
    runtime: 120 + Math.floor(Math.random() * 60),
    genres: movie.genre_ids.slice(0, 3).map((gid) => {
      const genre = MOCK_GENRES.find((g) => g.id === gid);
      return genre || { id: gid, name: 'Unknown' };
    }),
    budget: 10000000 + Math.floor(Math.random() * 200000000),
    revenue: 50000000 + Math.floor(Math.random() * 1000000000),
    status: 'Released',
    tagline: 'Una historia que никогда forget.',
    production_companies: [
      { id: 1, name: 'Warner Bros.' },
      { id: 2, name: 'Universal Pictures' },
    ],
  };
}

/**
 * Obtiene los créditos de una película mock.
 * @function getMockCredits
 * @param {number} id - ID de la película
 * @returns {MockCredits} Objeto con elenco y equipo
 */
export function getMockCredits(id: number): MockCredits {
  return {
    id,
    cast: [
      { id: 1, name: 'Leonardo DiCaprio', character: 'Protagonist', profile_path: null, order: 0 },
      { id: 2, name: 'Morgan Freeman', character: 'Mentor', profile_path: null, order: 1 },
      { id: 3, name: 'Scarlett Johansson', character: 'Love Interest', profile_path: null, order: 2 },
    ],
    crew: [
      { id: 10, name: 'Christopher Nolan', job: 'Director', department: 'Directing' },
      { id: 11, name: 'Hans Zimmer', job: 'Composer', department: 'Sound' },
    ],
  };
}

/**
 * Obtiene una lista paginada de películas mock.
 * @function getMockMovies
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Cantidad de películas por página
 * @returns {Object} Objeto con resultados, total_pages y total_results
 */
export function getMockMovies(page: number = 1, limit: number = 20): { results: MockMovie[]; total_pages: number; total_results: number } {
  const start = (page - 1) * limit;
  const end = start + limit;
  const results = MOCK_MOVIES.slice(start, end);

  return {
    results: results.length > 0 ? results : MOCK_MOVIES,
    total_pages: Math.ceil(MOCK_MOVIES.length / limit),
    total_results: MOCK_MOVIES.length,
  };
}

/**
 * Busca películas mock por título.
 * @function searchMockMovies
 * @param {string} query - Término de búsqueda
 * @returns {Object} Objeto con resultados, total_pages y total_results
 */
export function searchMockMovies(query: string): { results: MockMovie[]; total_pages: number; total_results: number } {
  const lowerQuery = query.toLowerCase();
  const results = MOCK_MOVIES.filter(
    (m) =>
      m.title.toLowerCase().includes(lowerQuery) ||
      m.original_title.toLowerCase().includes(lowerQuery)
  );

  return {
    results,
    total_pages: 1,
    total_results: results.length,
  };
}