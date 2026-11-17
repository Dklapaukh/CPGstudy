/*
 * The study streak's two rat drawings, drawn from the owner's reference pictures (inspiration,
 * not copies). The streak rat: the whole rat side on, in shield sunglasses, a laryngoscope in its
 * front paws, a bougie looping down to the floor and trauma shears in a holster on its hip; sad
 * or powered up. The hype rat: stood up facing the viewer, shears holstered on a cartridge belt,
 * its arms, head and tail in groups the celebration animates. No dependencies.
 */

let drawingCount = 0; // gives each drawing its own gradient and clip ids, as several can be on the page

// Colours shared by both rats.
const FUR_LIGHT = '#5c524b';
const FUR_DARK = '#26211f';
const FUR_EDGE = '#6e645d';
const SKIN = '#e3a19b';
const EAR_INSIDE = '#c98f8a';
const NOSE = '#e88d9c';
const TAIL = '#b98477';
const LEATHER = '#b8692e';
const LEATHER_DARK = '#6b3f1e';
const BRASS = '#d9a441';
const BOUGIE_BLUE = '#2f7fd1';
const FRAME_MINT = '#8fe8d3';

/** The gradients and lens clip a drawing uses; `id` makes them unique on the page. */
function sharedDefs(id, lensPath) {
  return `<defs>
      <linearGradient id="rat-lens-${id}" x1="0" x2="0.25" y1="0" y2="1">
        <stop offset="0" stop-color="#fff36b"/><stop offset="0.35" stop-color="#ffb31a"/>
        <stop offset="0.7" stop-color="#ff5a1f"/><stop offset="1" stop-color="#d0175a"/>
      </linearGradient>
      <radialGradient id="rat-fur-${id}" cx="0.45" cy="0.35" r="0.75">
        <stop offset="0" stop-color="${FUR_LIGHT}"/><stop offset="1" stop-color="${FUR_DARK}"/>
      </radialGradient>
      <linearGradient id="rat-steel-${id}" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#8b939b"/><stop offset="0.45" stop-color="#eef1f4"/>
        <stop offset="1" stop-color="#7d858d"/>
      </linearGradient>
      <clipPath id="rat-clip-${id}"><path d="${lensPath}"/></clipPath>
    </defs>`;
}

/** A pair of trauma-shear handles: two black loops, `left` and `right` as [x, y, tilt]. */
function shearHandlesSvg(left, right, size) {
  const loop = ([x, y, tilt]) =>
    `<ellipse cx="${x}" cy="${y}" rx="${size * 0.68}" ry="${size}" transform="rotate(${tilt} ${x} ${y})"
      fill="none" stroke="#111" stroke-width="${size * 0.5}"/>
    <ellipse cx="${x}" cy="${y}" rx="${size * 0.68}" ry="${size}" transform="rotate(${tilt} ${x} ${y})"
      fill="none" stroke="#c9ced3" stroke-width="${size * 0.1}"/>`;
  return `<g class="rat__shears">${loop(left)}${loop(right)}</g>`;
}

// ---------- The streak rat (side on) ----------

// The side-on lens outline, shared by the lens and the clip that keeps its glint inside it.
const SIDE_LENS_PATH = 'M68.5 26.5 Q76 25.2 82.5 28.4 L81.5 33 Q77.5 36 71.5 35.2 Q68 34.5 68 30 Z';

/** The tail, body, haunch and feet of the side-on rat. */
function sideBodySvg(id) {
  return `<path d="M23 47.5 C13 51 6 56 1 62 L3.5 62.6 C8.5 58 15 54.5 24 52 Z" fill="${TAIL}"
      stroke="#8a5d53" stroke-width="0.5"/>
    <path d="M18 50 C14 34 26 18 44 18 C58 18 66 28 64 40 C63 50 56 58 44 58 L26 58
      C20 58 18 54 18 50 Z" fill="url(#rat-fur-${id})" stroke="${FUR_EDGE}" stroke-width="0.8"/>
    <path d="M28 23.5 l3 -2.6 M36 20 l3 -2.4 M45 19.4 l3 -1.8 M53 21.4 l2.6 -1.2" stroke="${FUR_LIGHT}"
      stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="29" cy="49" rx="10" ry="8" fill="${FUR_DARK}" fill-opacity="0.55"/>
    <path d="M23 58.5 C25 55.5 36 55.5 38.5 58.6 C38 61 25 61 23 58.5 Z" fill="${SKIN}"/>
    <path d="M55 59 C57 56.8 63 57 64.5 59.4 C63.5 61.4 56 61.2 55 59 Z" fill="${SKIN}"/>`;
}

/** The cartridge belt across the side-on rat's middle and the holstered shears on its hip. */
function sideHolsterSvg() {
  const cartridges = [27, 31, 35, 46, 50]
    .map((x) => `<rect x="${x}" y="${32.2 + (x - 27) * 0.14}" width="1.6" height="3" rx="0.5"/>`)
    .join('');
  return `<path d="M24 33 Q40 38 58 36" fill="none" stroke="${LEATHER_DARK}" stroke-width="3.2"/>
    <g fill="${BRASS}">${cartridges}</g>
    ${shearHandlesSvg([37, 30, -22], [43, 29.5, 16], 3.6)}
    <path d="M34.5 35 L45.5 35 L46 44 Q44 53 40 54.5 Q35.5 52 34.5 44 Z" fill="${LEATHER}"
      stroke="${LEATHER_DARK}" stroke-width="0.9"/>
    <path d="M36.2 37 L44 37 L44.2 44 Q42.6 51 40 52.3 Q37 50.5 36.3 44 Z" fill="none"
      stroke="#f3c9a0" stroke-width="0.4" stroke-dasharray="1 0.8"/>`;
}

/** The bougie (blue, looping to the floor) and the laryngoscope held in the front paws. */
function sideAirwaySvg(id) {
  return `<path d="M73 44 C63 39.5 59 50.5 65.5 55.5 C69.5 58.5 74 58 76.5 63" fill="none"
      stroke="${BOUGIE_BLUE}" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M76.5 63 l1.8 -1.4" stroke="${BOUGIE_BLUE}" stroke-width="2.1" stroke-linecap="round"/>
    <g transform="rotate(-12 74 47)">
      <rect x="72" y="40" width="4.4" height="13" rx="1.2" fill="url(#rat-steel-${id})"
        stroke="#4b5258" stroke-width="0.5"/>
      <path d="M72.6 43 h3.2 M72.6 45.5 h3.2 M72.6 48 h3.2" stroke="#6b737a" stroke-width="0.4"/>
      <path d="M74.6 52.6 Q83 52.4 87.5 60.5" fill="none" stroke="#4b5258" stroke-width="3.2"
        stroke-linecap="round"/>
      <path d="M74.6 52.6 Q83 52.4 87.5 60.5" fill="none" stroke="url(#rat-steel-${id})"
        stroke-width="2.2" stroke-linecap="round"/>
    </g>`;
}

/** The side-on rat's mouth: a grin with a front tooth when `fired`, otherwise a frown and a tear. */
function sideMouthSvg(fired) {
  if (fired) {
    return `<rect x="83.2" y="44.2" width="1.6" height="2" rx="0.3" fill="#fffaf0"/>
      <path d="M79.5 43.8 Q83 46.6 86.6 44" fill="none" stroke="#1b1716" stroke-width="1.1"
        stroke-linecap="round"/>`;
  }
  return `<path d="M79.5 45.8 Q83 43.6 86.6 45.6" fill="none" stroke="#1b1716" stroke-width="1.1"
      stroke-linecap="round"/>
    <path d="M77 36.5 Q79 40 77 41.6 Q75 40 77 36.5 Z" fill="#7cc7ff"/>`;
}

/** The side-on shield sunglasses: a speckled mint arm back to the ear and the mirrored lens. */
function sideSunglassesSvg(id) {
  return `<path d="M57 30.6 L70 28.4" stroke="#111" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M57 30.6 L70 28.4" stroke="${FRAME_MINT}" stroke-width="1.6" stroke-linecap="round"/>
    <g fill="#16302b"><circle cx="60" cy="30" r="0.35"/><circle cx="64.5" cy="29.3" r="0.4"/></g>
    <path d="${SIDE_LENS_PATH}" fill="url(#rat-lens-${id})" stroke="#111" stroke-width="1"/>
    <g clip-path="url(#rat-clip-${id})"><path class="rat__glint" d="M68 36 L72 25 L74.5 25
      L70.5 36 Z" fill="#fff" fill-opacity="0.55"/></g>
    <path d="M68 26.6 Q75.5 24.6 83 28.2" fill="none" stroke="${FRAME_MINT}" stroke-width="1.3"
      stroke-linecap="round"/>`;
}

/** The side-on head: ear, head and snout, nose, whiskers, mouth and sunglasses. Droops when sad. */
function sideHeadSvg(id, fired) {
  const earTilt = fired ? 0 : -38;
  const headTilt = fired ? -4 : 18;
  return `<g class="rat__head" transform="rotate(${headTilt} 56 36)">
      <g transform="rotate(${earTilt} 58 27)">
        <ellipse cx="60" cy="21.5" rx="6" ry="7.2" fill="#3d3632" stroke="${FUR_EDGE}"
          stroke-width="0.7"/>
        <ellipse cx="60.6" cy="21.8" rx="3.4" ry="4.6" fill="${EAR_INSIDE}"/>
      </g>
      <path d="M52 26 C58 20 70 20 76 26 C82 31 88 36 89.5 40 C89.5 43 86.5 45.4 82 45.6
        C72 46.4 60 46 54 42 C49 38 48 30 52 26 Z" fill="url(#rat-fur-${id})" stroke="${FUR_EDGE}"
        stroke-width="0.8"/>
      <circle cx="89" cy="40.6" r="1.9" fill="${NOSE}"/>
      <path d="M85 41.5 L95.5 37.5 M85 42.4 L95.8 42.6 M84.6 43.2 L93.8 47" stroke="#d8d2cc"
        stroke-opacity="0.9" stroke-width="0.45" stroke-linecap="round"/>
      ${sideMouthSvg(fired)}
      ${sideSunglassesSvg(id)}
    </g>`;
}

/**
 * The streak rat as an SVG: the whole rat side on, with its shears, bougie and laryngoscope.
 * `fired`: head and ear up and a grin; otherwise head and ear drooping, a frown and a tear.
 */
export function ratSvg(fired) {
  drawingCount += 1;
  const id = drawingCount;
  return `<svg class="rat" viewBox="0 0 96 64" aria-hidden="true">
    ${sharedDefs(id, SIDE_LENS_PATH)}
    ${sideBodySvg(id)}
    ${sideHolsterSvg()}
    ${sideAirwaySvg(id)}
    ${sideHeadSvg(id, fired)}
    <ellipse cx="71.5" cy="45.5" rx="2.6" ry="2.1" fill="${SKIN}"/>
    <ellipse cx="74" cy="50" rx="2.5" ry="2" fill="${SKIN}"/>
  </svg>`;
}

// ---------- The hype rat (stood up, facing the viewer) ----------

// The front-on lens outline, shared by the lens and the clip that keeps its glint inside it.
const FRONT_LENS_PATH = `M32 46 Q60 40 88 46 L86.5 52 Q83.5 58 74 57.5 Q66 57 60 53 Q54 57 46 57.5
  Q36.5 58 33.5 52 Z`;

/** The hype rat's tail (its own group, so it can swish), legs, feet, body and belly. */
function hypeBodySvg(id) {
  return `<g class="hype-rat__tail">
      <path d="M78 128 C98 133 110 121 107 103 C105.5 94 109 87 115 84" fill="none"
        stroke="#8a5d53" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M78 128 C98 133 110 121 107 103 C105.5 94 109 87 115 84" fill="none"
        stroke="${TAIL}" stroke-width="4" stroke-linecap="round"/>
    </g>
    <ellipse cx="48" cy="131" rx="9.5" ry="11" fill="url(#rat-fur-${id})"/>
    <ellipse cx="72" cy="131" rx="9.5" ry="11" fill="url(#rat-fur-${id})"/>
    <ellipse cx="45" cy="143" rx="10" ry="4.2" fill="${SKIN}"/>
    <ellipse cx="75" cy="143" rx="10" ry="4.2" fill="${SKIN}"/>
    <ellipse cx="60" cy="104" rx="30" ry="34" fill="url(#rat-fur-${id})" stroke="${FUR_EDGE}"
      stroke-width="0.9"/>
    <ellipse cx="60" cy="108" rx="17" ry="22" fill="${FUR_LIGHT}" fill-opacity="0.75"/>`;
}

/** The cartridge belt round the hype rat's waist and the holster on its hip with the shears in. */
function hypeHolsterSvg() {
  const cartridges = [38, 43, 48, 72, 77, 82]
    .map((x) => {
      const beltY = 118 - 6 * ((x - 60) / 29.5) ** 2; // the belt's curve at x
      return `<rect x="${x - 1.2}" y="${beltY - 4.6}" width="2.4" height="4.4" rx="0.8"/>`;
    })
    .join('');
  return `<path d="M30.5 112 Q60 124 89.5 112" fill="none" stroke="${LEATHER_DARK}" stroke-width="6"/>
    <g fill="${BRASS}">${cartridges}</g>
    <path d="M27 112 L29 118 M37 114.5 L36 118" stroke="${LEATHER_DARK}" stroke-width="2.4"/>
    <rect x="55" y="113.5" width="10" height="7.5" rx="1.5" fill="none" stroke="${BRASS}"
      stroke-width="1.8"/>
    ${shearHandlesSvg([27, 110, -24], [36, 108.5, 14], 5.2)}
    <path d="M22 117 L41 117 L42 130 Q39.5 142 32 145 Q24.5 141 23 130 Z" fill="${LEATHER}"
      stroke="${LEATHER_DARK}" stroke-width="1.2"/>
    <path d="M24.5 120 L39 120 L39.6 130 Q37.6 139.5 32 141.8 Q26.4 138.8 25.4 130 Z" fill="none"
      stroke="#f3c9a0" stroke-width="0.6" stroke-dasharray="1.6 1.2"/>
    <ellipse cx="32" cy="130" rx="4.6" ry="3.4" fill="none" stroke="${LEATHER_DARK}"
      stroke-width="0.9"/>`;
}

/**
 * One arm of the hype rat, from the shoulder down to a pink fist; `side` names it. Drawn over
 * the head, so a pumped fist shows in front of the ears.
 */
function hypeArmSvg(side, shoulderX, handX, id) {
  return `<g class="hype-rat__arm hype-rat__arm--${side}">
      <path d="M${shoulderX} 86 L${handX} 110" stroke="${FUR_EDGE}" stroke-width="11"
        stroke-linecap="round"/>
      <path d="M${shoulderX} 86 L${handX} 110" stroke="url(#rat-fur-${id})" stroke-width="9.4"
        stroke-linecap="round"/>
      <circle cx="${handX}" cy="111" r="5.4" fill="${SKIN}" stroke="#b9746e" stroke-width="0.6"/>
    </g>`;
}

/** The front-on shield sunglasses: a speckled mint bar over a mirrored lens with a glint. */
function hypeSunglassesSvg(id) {
  return `<path d="${FRONT_LENS_PATH}" fill="url(#rat-lens-${id})" stroke="#111" stroke-width="1.6"/>
    <g clip-path="url(#rat-clip-${id})"><path class="rat__glint" d="M33 60 L45 38 L50 38 L38 60 Z"
      fill="#fff" fill-opacity="0.55"/></g>
    <path d="M37 48.8 Q46 46.6 54 48.6" fill="none" stroke="#fff8c4" stroke-opacity="0.8"
      stroke-width="1.4" stroke-linecap="round"/>
    <path d="M29 45.5 Q60 38.5 91 45.5" fill="none" stroke="#111" stroke-width="5"
      stroke-linecap="round"/>
    <path d="M29 45.5 Q60 38.5 91 45.5" fill="none" stroke="${FRAME_MINT}" stroke-width="3"
      stroke-linecap="round"/>
    <g fill="#16302b"><circle cx="36" cy="43.6" r="0.6"/><circle cx="44" cy="42" r="0.5"/>
      <circle cx="52" cy="41.2" r="0.65"/><circle cx="68" cy="41.2" r="0.55"/>
      <circle cx="76" cy="42" r="0.65"/><circle cx="84" cy="43.6" r="0.5"/></g>`;
}

/** The hype rat's head (its own group, so it can bob): ears, face, a wide grin and sunglasses. */
function hypeHeadSvg(id) {
  const ear = (x) => `<circle cx="${x}" cy="33" r="12.5" fill="#3d3632" stroke="${FUR_EDGE}"
      stroke-width="0.9"/><circle cx="${x}" cy="33.5" r="7.4" fill="${EAR_INSIDE}"/>`;
  return `<g class="hype-rat__head">
      ${ear(34)}${ear(86)}
      <ellipse cx="60" cy="53" rx="27" ry="25" fill="url(#rat-fur-${id})" stroke="${FUR_EDGE}"
        stroke-width="0.9"/>
      <path d="M53 30 L55.5 25 L58 29.5 L60.5 24 L63 29.5 L66 25.5 L67 31" fill="#3a332f"/>
      <ellipse cx="60" cy="67" rx="13.5" ry="10" fill="#48403b"/>
      <ellipse cx="60" cy="62" rx="4.2" ry="3" fill="${NOSE}"/>
      <path d="M50.5 68.5 Q60 80 69.5 68.5 Q60 72.5 50.5 68.5 Z" fill="#3a1a1a"/>
      <rect x="57.4" y="69.6" width="5.2" height="4" rx="0.8" fill="#fffaf0"/>
      <path d="M45 66 L29 62 M45 69 L29 71 M75 66 L91 62 M75 69 L91 71" stroke="#d8d2cc"
        stroke-opacity="0.9" stroke-width="0.8" stroke-linecap="round"/>
      ${hypeSunglassesSvg(id)}
    </g>`;
}

/**
 * The hype rat as an SVG: stood up facing the viewer, in shield sunglasses, shears holstered on
 * a cartridge belt. The celebration moves its arms, head and tail (classes hype-rat__*).
 */
export function hypeRatSvg() {
  drawingCount += 1;
  const id = drawingCount;
  return `<svg class="rat hype-rat" viewBox="0 0 120 150" aria-hidden="true">
    ${sharedDefs(id, FRONT_LENS_PATH)}
    ${hypeBodySvg(id)}
    ${hypeHolsterSvg()}
    ${hypeHeadSvg(id)}
    ${hypeArmSvg('left', 37, 25, id)}
    ${hypeArmSvg('right', 83, 95, id)}
  </svg>`;
}
