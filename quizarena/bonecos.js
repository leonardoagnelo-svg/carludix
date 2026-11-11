// QuizArena — bonecos da sala geral (desenhos originais em SVG). Formato: "g.corpo.cor.olhos.acessorio".
export const CORES=[
  ["#ff5a5f","#b83136"],["#ffb21a","#b87400"],["#ffe04a","#b39400"],["#3ccf6e","#1d8a45"],["#2ec5e6","#137a92"],
  ["#4b7bff","#2346b3"],["#a05bff","#6526c4"],["#ff7ac8","#bb3f88"],["#a1785f","#5d4037"],["#e8ecf5","#8b95ad"]
];
export const CORPOS=["Bolinha","Gotinha","Quadradão","Ovinho"];
export const OLHOS=["Redondos","Pontinhos","Brilhantes","Sonolentos"];
export const ACESSORIOS=["Nenhum","Boné","Coroa","Óculos","Fone","Laço","Chapéu de festa","Cachecol"];

const INK="#1b1340";
const TOPO=[44,40,46,42];
const FORMA=[
  `<circle cx="60" cy="84" r="40"/>`,
  `<path d="M60 34C82 56 100 74 100 92a40 36 0 0 1-80 0C20 74 38 56 60 34z"/>`,
  `<rect x="22" y="46" width="76" height="76" rx="26"/>`,
  `<ellipse cx="60" cy="84" rx="35" ry="42"/>`
];


const rnd=n=>Math.floor(Math.random()*n);
export function sortear(){return ["g",rnd(4),rnd(CORES.length),rnd(4),rnd(ACESSORIOS.length)].join(".")}
export function ler(v){
  const p=String(v||"").split(".");
  if(p[0]==="g"&&p.length===5){
    const [c,k,o,a]=p.slice(1).map(Number);
    if(c>=0&&c<4&&k>=0&&k<CORES.length&&o>=0&&o<4&&a>=0&&a<ACESSORIOS.length) return {c,k,o,a};
  }
  return {c:0,k:5,o:0,a:0};
}
export function montar({c,k,o,a}){return ["g",c,k,o,a].join(".")}
// pose do jogo -> pose do boneco
const POSE={parado:"parado",feliz:"feliz",triste:"triste",pensando:"parado",rezando:"parado",podio:"feliz"};
export function svg(v,pose="parado",cls=""){
  return `<svg class="${cls}" viewBox="0 0 120 140" aria-hidden="true">${boneco(ler(v),POSE[pose]||"parado")}</svg>`;
}
/* ---------- bonecos ---------- */
function boneco({c,k,o,a},pose){
  const [f,d]=CORES[k], top=TOPO[c];
  let s=`<ellipse cx="60" cy="132" rx="30" ry="5" fill="#000" opacity=".22"/>`;
  // braços
  const br=pose==="feliz"?[`M28 82q-14-10-16-30`,`M92 82q14-10 16-30`,[12,52],[108,52]]
         :pose==="triste"?[`M26 96q-6 10-4 20`,`M94 96q6 10 4 20`,[22,116],[98,116]]
         :[`M25 92q-10 8-9 18`,`M95 92q10 8 9 18`,[16,110],[104,110]];
  s+=`<g stroke="${d}" stroke-width="7" stroke-linecap="round" fill="none"><path d="${br[0]}"/><path d="${br[1]}"/></g>`;
  s+=`<circle cx="${br[2][0]}" cy="${br[2][1]}" r="6" fill="${f}" stroke="${d}" stroke-width="3"/><circle cx="${br[3][0]}" cy="${br[3][1]}" r="6" fill="${f}" stroke="${d}" stroke-width="3"/>`;
  // pés e corpo
  s+=`<ellipse cx="45" cy="124" rx="11" ry="6" fill="${d}"/><ellipse cx="75" cy="124" rx="11" ry="6" fill="${d}"/>`;
  s+=`<g fill="${f}" stroke="${d}" stroke-width="3.5">${FORMA[c]}</g>`;
  s+=`<ellipse cx="60" cy="102" rx="22" ry="14" fill="#fff" opacity=".22"/><ellipse cx="44" cy="58" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 44 58)"/>`;
  if(a===7) s+=`<path d="M24 102q36 14 72 0v11q-36 14-72 0z" fill="#19b532" stroke="#0e7a22" stroke-width="2"/><path d="M76 110l6 18h10l-6-20z" fill="#19b532" stroke="#0e7a22" stroke-width="2"/>`;
  // olhos
  s+=olhosBoneco(o,pose,f);
  if(pose==="triste") s+=`<path d="M38 64l12-4M82 64l-12-4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  // bochechas e boca
  s+=`<circle cx="36" cy="90" r="5" fill="#ff8aa0" opacity=".55"/><circle cx="84" cy="90" r="5" fill="#ff8aa0" opacity=".55"/>`;
  s+=pose==="feliz"?`<path d="M47 90q13 18 26 0z" fill="#7a1f2b"/><path d="M53 96q7 5 14 0q-7-4-14 0z" fill="#ff7a8a"/>`
    :pose==="triste"?`<path d="M51 99q9-8 18 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    :`<path d="M51 92q9 8 18 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  s+=acessorio(a,top);
  return s;
}
function olhosBoneco(o,pose,f){
  if(pose==="feliz") return `<g stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M39 78q7-9 14 0"/><path d="M67 78q7-9 14 0"/></g>`;
  const L=[46,74];
  return L.map(x=>{
    if(o===1) return `<circle cx="${x}" cy="76" r="5" fill="${INK}"/><circle cx="${x+1.6}" cy="74.4" r="1.6" fill="#fff"/>`;
    if(o===2) return `<ellipse cx="${x}" cy="75" rx="9" ry="11" fill="#fff"/><circle cx="${x+1}" cy="77" r="6.5" fill="${INK}"/><circle cx="${x+3}" cy="74" r="2.2" fill="#fff"/><circle cx="${x-1.5}" cy="80" r="1.2" fill="#fff"/>`;
    if(o===3) return `<circle cx="${x}" cy="77" r="8" fill="#fff"/><circle cx="${x}" cy="79" r="4" fill="${INK}"/><path d="M${x-9} 76a9 9 0 0 1 18 0z" fill="${f}" stroke="${INK}" stroke-width="1.5"/>`;
    return `<circle cx="${x}" cy="76" r="8" fill="#fff"/><circle cx="${x+1}" cy="77" r="4.2" fill="${INK}"/><circle cx="${x+2.4}" cy="75.4" r="1.4" fill="#fff"/>`;
  }).join("");
}
function acessorio(a,t){
  switch(a){
    case 1: return `<path d="M33 ${t+8}q0-24 27-24q27 0 27 24z" fill="#e3121c" stroke="#8f0710" stroke-width="2.5"/><path d="M60 ${t+5}h38a5 5 0 0 1 0 8h-38z" fill="#b30d16" stroke="#8f0710" stroke-width="2"/><circle cx="60" cy="${t-16}" r="3" fill="#8f0710"/>`;
    case 2: return `<path d="M38 ${t+6}l-3-24l13 11l12-18l12 18l13-11l-3 24z" fill="#ffc21a" stroke="#a65c00" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="${t-3}" r="3.4" fill="#e3121c"/><circle cx="47" cy="${t+1}" r="2.4" fill="#1667ff"/><circle cx="73" cy="${t+1}" r="2.4" fill="#19b532"/>`;
    case 3: return `<g fill="#111" stroke="#111"><rect x="33" y="67" width="26" height="17" rx="7"/><rect x="61" y="67" width="26" height="17" rx="7"/><path d="M58 73h4" stroke-width="3"/></g><path d="M37 71l6 0M65 71l6 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
    case 4: return `<path d="M22 ${t+34}q0-46 38-46q38 0 38 46" stroke="#222" stroke-width="6" fill="none"/><rect x="12" y="${t+24}" width="14" height="24" rx="6" fill="#e3121c" stroke="#222" stroke-width="2.5"/><rect x="94" y="${t+24}" width="14" height="24" rx="6" fill="#e3121c" stroke="#222" stroke-width="2.5"/>`;
    case 5: return `<g transform="translate(78 ${t+4}) rotate(18)"><path d="M0 0l-16-11v22zM0 0l16-11v22z" fill="#ff3fa4" stroke="#b8156f" stroke-width="2" stroke-linejoin="round"/><circle r="4.5" fill="#ff7cc2" stroke="#b8156f" stroke-width="2"/></g>`;
    case 6: return `<path d="M60 ${t-30}l15 ${34}h-30z" fill="#8c22e6" stroke="#4c0c8a" stroke-width="2" stroke-linejoin="round"/><path d="M53 ${t-14}l12 6M50 ${t-4}l18 7" stroke="#ffc21a" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="${t-31}" r="5" fill="#ffc21a"/>`;
    default: return "";
  }
}

