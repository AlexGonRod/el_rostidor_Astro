/**
 * Los 8 alérgenos con icono en src/assets/icons/ (fuente única para el
 * enum Zod de la colección `carta` y para el mapa de iconos del componente
 * `AllergenIcons`).
 *
 * No se rellenan por suposición: el dato lo aporta el cliente (AGENTS.md 6.3.1).
 */
export const ALLERGEN_KEYS = [
	'altramuz',
	'cacahuetes',
	'cereal-con-gluten',
	'frutos-secos',
	'huevos',
	'lacteos',
	'moluscos',
	'pescado',
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

/** Nombre de archivo del PNG dentro de src/assets/icons/, tal cual están en disco. */
export const ALLERGEN_FILES: Record<AllergenKey, string> = {
	altramuz: 'Alergeno-altramuz.png',
	cacahuetes: 'Alergeno-cacahuetes.png',
	'cereal-con-gluten': 'Alergeno-cereal-con-gluten.png',
	'frutos-secos': 'Alergeno-frutos-secos.png',
	huevos: 'Alergeno-Huevos.png',
	lacteos: 'Alergeno-lacteos.png',
	moluscos: 'Alergeno-moluscos.png',
	pescado: 'Alergeno-pescado.png',
};
