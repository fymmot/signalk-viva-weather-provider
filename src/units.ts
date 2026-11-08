/**
 * Conversions into the SI units the Signal K Weather API uses: m/s, rad, K, m.
 * Viva reports wind direction in compass degrees, water level in cm and water
 * temperature in °C.
 */

const TWO_PI = 2 * Math.PI

/** Compass degrees to radians, normalised to [0, 2π) so 360° reads as north (0). */
export function degToRad(deg: number): number {
  const rad = (deg * Math.PI) / 180
  return ((rad % TWO_PI) + TWO_PI) % TWO_PI
}

export function celsiusToKelvin(c: number): number {
  return c + 273.15
}

export function centimetresToMetres(cm: number): number {
  return cm / 100
}
