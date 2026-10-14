/**
 * Herramientas de debug para probar rápido (menú con F1).
 * Disponibles en desarrollo (`npm run dev`) o en cualquier build abriendo la URL con `?debug`.
 */
export const DEBUG_ENABLED: boolean = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

export const DebugFlags = {
  /** El jugador no recibe daño. */
  god: false,
  /** Muestra FPS, posición y estado del nivel. */
  info: false,
};
