import { useState, useEffect, useRef } from “react”;

const W = 90, H = 44;
const OCEAN_SHADE = “ .:-”;
const LAND_SHADE = “ .:;=+xX$#@”;

// Simplified continent polygons as [lat, lon] pairs
// Coordinates are approximate outlines
const CONTINENTS = {
northAmerica: [
[83,-70],[80,-90],[75,-130],[70,-165],[65,-168],[60,-165],[55,-165],
[50,-130],[48,-125],[40,-125],[35,-120],[32,-117],[25,-110],[20,-105],
[15,-95],[15,-85],[10,-84],[10,-78],[18,-78],[20,-75],[25,-80],
[30,-82],[30,-85],[28,-90],[29,-95],[26,-97],[25,-97],[20,-90],
[20,-87],[15,-87],[10,-82],[8,-77],[10,-74],[15,-75],[18,-72],
[22,-73],[25,-77],[30,-80],[35,-75],[40,-70],[43,-65],[45,-60],
[47,-53],[50,-55],[52,-56],[55,-60],[60,-65],[65,-60],[70,-55],
[75,-58],[80,-65],[83,-70]
],
southAmerica: [
[12,-70],[10,-72],[8,-77],[5,-77],[2,-80],[0,-80],[-5,-81],
[-8,-80],[-15,-75],[-20,-70],[-25,-70],[-30,-72],[-35,-72],
[-40,-73],[-45,-75],[-50,-75],[-53,-72],[-55,-68],[-55,-64],
[-52,-60],[-48,-65],[-45,-65],[-40,-62],[-35,-57],[-30,-50],
[-25,-47],[-22,-40],[-18,-38],[-15,-39],[-10,-37],[-5,-35],
[-2,-50],[0,-50],[2,-52],[5,-60],[8,-62],[10,-67],[12,-72],
[12,-70]
],
europe: [
[72,25],[70,30],[68,28],[65,25],[60,30],[55,28],[50,30],
[48,28],[47,15],[46,10],[44,8],[43,5],[42,0],[36,-5],
[36,-8],[38,-9],[40,-8],[43,-9],[44,-8],[46,-1],[48,2],
[48,7],[50,5],[52,5],[54,8],[55,12],[57,10],[58,12],
[60,5],[62,5],[65,12],[68,15],[70,19],[71,25],[72,25]
],
africa: [
// NW corner clockwise
[36,-5],[37,0],[37,10],[33,12],[32,25],[30,32],
// NE coast / Red Sea
[28,34],[25,35],[20,38],[15,42],[12,44],
// Horn of Africa down east coast
[8,50],[2,46],[0,42],[-5,40],[-10,40],
// SE coast
[-15,41],[-20,36],[-25,34],[-28,32],[-30,30],
// South Africa
[-34,27],[-35,22],[-34,18],
// West coast heading north
[-30,17],[-25,15],[-20,13],[-15,12],[-10,14],
[-5,12],[0,10],[4,8],[5,5],
// Gulf of Guinea notch
[4,1],[3,-2],
// West African bulge
[5,-5],[5,-10],[7,-13],[10,-15],[15,-17],
// NW Africa
[20,-17],[25,-16],[28,-13],[32,-8],[35,-5],[36,-5]
],
asia: [
// Northern Russia east
[72,25],[75,40],[77,60],[78,80],[77,100],[75,110],[73,130],
[72,140],[68,170],[65,175],[60,165],[55,160],[50,155],
// Pacific coast: Japan/Korea area
[48,145],[45,142],[42,132],[40,130],[38,128],[35,127],
[33,130],[30,122],[25,120],
// Southeast Asia coast
[22,108],[20,107],[16,108],[10,106],[8,105],[5,103],
[1,104],
// Malay peninsula
[1,103],[-1,103],[-3,104],[-5,104],[-7,106],[-8,110],
// Skip to Indonesia connection — back up north side
[-5,106],[-2,103],[1,101],
// Indochina coast back west
[5,100],[10,98],[12,100],[15,100],
// South China / Vietnam coast up to India
[18,100],[20,96],[22,90],
// Bay of Bengal — east coast of India
[20,88],[16,82],[13,80],
// Southern tip of India
[10,78],[8,77],[8,76],
// West coast of India
[10,75],[13,73],[16,73],[20,72],[22,70],[24,68],
// Pakistan / Arabian peninsula connection
[25,62],[28,57],[25,55],[22,55],
// Middle East
[20,55],[15,50],[12,45],[15,42],[20,38],
// Connect to Africa border / Turkey
[25,35],[30,32],[33,36],[35,36],[37,36],
// Turkey / Black Sea
[38,40],[40,45],[42,50],[45,52],
// Central Asia / Urals
[48,55],[50,55],[52,58],[55,60],
[60,60],[65,60],[68,55],[70,50],[72,40],[72,25]
],
australia: [
[-12,130],[-14,127],[-18,122],[-22,114],[-28,114],
[-32,115],[-35,117],[-38,145],[-37,150],[-34,152],
[-28,153],[-24,152],[-20,149],[-18,146],[-16,146],
[-14,144],[-12,142],[-11,136],[-12,130]
],
antarctica: [
[-62,0],[-62,30],[-62,60],[-62,90],[-62,120],[-62,150],
[-62,180],[-62,-150],[-62,-120],[-62,-90],[-62,-60],[-62,-30],
[-68,-30],[-72,-40],[-75,-50],[-78,-70],[-80,-90],
[-78,-110],[-75,-130],[-72,-150],[-70,-170],[-70,170],
[-72,150],[-75,130],[-78,110],[-80,90],
[-78,70],[-75,50],[-72,30],[-68,10],[-62,0]
]
};

// Point-in-polygon using ray casting
function pointInPoly(lat, lon, poly) {
let inside = false;
for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
const [yi, xi] = poly[i];
const [yj, xj] = poly[j];
if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
inside = !inside;
}
}
return inside;
}

function isLand(lat, lon) {
// Convert from radians to degrees
const latD = (lat * 180) / Math.PI;
let lonD = (lon * 180) / Math.PI;

for (const key of Object.keys(CONTINENTS)) {
if (pointInPoly(latD, lonD, CONTINENTS[key])) return true;
}
return false;
}

// Pre-compute a land/ocean texture map
const TEX_W = 360, TEX_H = 180;
const landMap = new Array(TEX_H * TEX_W);
(function buildMap() {
for (let j = 0; j < TEX_H; j++) {
for (let i = 0; i < TEX_W; i++) {
const lat = (j / TEX_H) * Math.PI - Math.PI / 2;
const lon = (i / TEX_W) * Math.PI * 2 - Math.PI;
landMap[j * TEX_W + i] = isLand(lat, lon) ? 1 : 0;
}
}
})();

function sampleLand(lat, lon) {
// lat in [-PI/2, PI/2], lon in [-PI, PI]
const j = Math.floor(((lat + Math.PI / 2) / Math.PI) * (TEX_H - 1));
let i = Math.floor(((lon + Math.PI) / (Math.PI * 2)) * (TEX_W - 1));
if (i < 0) i += TEX_W;
if (i >= TEX_W) i -= TEX_W;
return landMap[Math.max(0, Math.min(TEX_H - 1, j)) * TEX_W + Math.max(0, Math.min(TEX_W - 1, i))];
}

function renderGlobe(angle) {
const R = 18;
const cx = W / 2, cy = H / 2;
const lines = [];

const cosA = Math.cos(angle), sinA = Math.sin(angle);
const tilt = 0.25;
const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

for (let j = 0; j < H; j++) {
let row = “”;
for (let i = 0; i < W; i++) {
const x = (i - cx) / R;
const y = (j - cy) / (R * 0.65);
const r2 = x * x + y * y;

```
  if (r2 > 1) {
    row += " ";
    continue;
  }

  const z = Math.sqrt(1 - r2);

  // Tilt (X axis)
  const ty = -y * cosT - z * sinT;
  const tz = y * sinT - z * cosT;
  // Rotate (Y axis)
  const rx = x * cosA + tz * sinA;
  const rz = -x * sinA + tz * cosA;
  const ry = ty;

  // Spherical coordinates (negate rx to correct east/west mirroring from tilt)
  const lon = Math.atan2(-rx, rz);
  const lat = Math.asin(Math.max(-1, Math.min(1, ry)));

  const land = sampleLand(lat, lon);

  // Lighting
  const light = Math.max(0, z * 0.65 + x * 0.2 + 0.15);

  if (land) {
    const idx = Math.floor(light * (LAND_SHADE.length - 1));
    row += LAND_SHADE[Math.min(idx, LAND_SHADE.length - 1)];
  } else {
    const idx = Math.floor(light * (OCEAN_SHADE.length - 1));
    row += OCEAN_SHADE[Math.min(idx, OCEAN_SHADE.length - 1)];
  }
}
lines.push(row);
```

}
return lines.join(”\n”);
}

export default function ContinentGlobe() {
const [angle, setAngle] = useState(0);
const [dark, setDark] = useState(true);
const rafRef = useRef();
const lastRef = useRef(performance.now());

useEffect(() => {
const tick = (now) => {
const dt = (now - lastRef.current) / 1000;
lastRef.current = now;
setAngle(a => a + dt * 0.4);
rafRef.current = requestAnimationFrame(tick);
};
rafRef.current = requestAnimationFrame(tick);
return () => cancelAnimationFrame(rafRef.current);
}, []);

return (
<div
className=“min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300”
style={{ background: dark ? “#0a0a0a” : “#f5f5f4” }}
>
<div className="flex items-center gap-4 mb-3">
<h2
className=“font-mono text-lg”
style={{ color: dark ? “#d4d4d4” : “#1c1917” }}
>
🌍 ASCII Earth
</h2>
<button
onClick={() => setDark(d => !d)}
className=“font-mono text-xs px-3 py-1 rounded border transition-colors duration-300”
style={{
color: dark ? “#a8a29e” : “#57534e”,
borderColor: dark ? “#44403c” : “#d6d3d1”,
background: dark ? “#1c1917” : “#ffffff”
}}
>
{dark ? “☀ Light” : “● Dark”}
</button>
</div>
<p
className=“font-mono text-xs mb-4”
style={{ color: dark ? “#57534e” : “#a8a29e” }}
>
Polygon-based continents · raycasted sphere · diffuse lighting
</p>
<pre
className=“font-mono leading-none select-none”
style={{
fontSize: “11px”,
letterSpacing: “1px”,
color: dark ? “#e7e5e4” : “#1c1917”,
}}
>
{renderGlobe(angle)}
</pre>
<div className=“flex gap-6 mt-4 text-xs font-mono” style={{ color: dark ? “#78716c” : “#a8a29e” }}>
<span>■ Land: dense</span>
<span>□ Ocean: sparse</span>
</div>
</div>
);
}
