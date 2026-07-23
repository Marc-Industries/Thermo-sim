export function fmt(v, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(3);
  return Number(v.toPrecision(digits + 1)).toString();
}

export const UNIT_LABEL = {
  P: (u) => u,
  T: (u) => `°${u}`.replace("°K", "K"),
  v: () => "m³/kg",
  h: () => "kJ/kg",
  u: () => "kJ/kg",
  s: () => "kJ/kg·K",
  x: () => "—",
};

export const PROP_SYMBOL = {
  P: "P", T: "T", v: "v", h: "h", u: "u", s: "s", x: "x",
};

export function unitFor(units, kind) {
  if (kind === "T") return `°${units.T}`.replace("°K", "K");
  if (kind === "v") return "m³/kg";
  if (kind === "h" || kind === "u") return units.h;
  if (kind === "s") return "kJ/kg·K";
  if (kind === "P") return units.P;
  return "";
}
