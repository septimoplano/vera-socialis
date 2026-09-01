/**
 * Las conexiones son simétricas y se guardan en una sola fila. Ordenar el par
 * antes de insertar es lo que hace que el índice único bloquee duplicados
 * cuando A conecta con B y luego B con A.
 */
export function ordenarPar(a: string, b: string): { menor: string; mayor: string } {
  if (a === b) throw new Error('Un usuario no puede conectarse consigo mismo.');
  return a < b ? { menor: a, mayor: b } : { menor: b, mayor: a };
}
