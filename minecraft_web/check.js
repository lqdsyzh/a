
// ============================================================
//  1. 噪声生成器（含种子）
// ============================================================
function makeNoise(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  let rngState = s || 12345;
  function rng() {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 0xFFFFFFFF;
  }
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  function fade(t) { return t*t*t*(t*(t*6-15)+10); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function grad2(h,x,y) {
    h &= 3;
    const u = h < 2 ? x : y, v = h < 2 ? y : x;
    return (u * ((h&1)?-1:1)) + (v * ((h&2)?-1:1));
  }
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X]+Y, b = perm[X+1]+Y;
    return lerp(lerp(grad2(perm[a],x,y), grad2(perm[b],x-1,y), u),
                lerp(grad2(perm[a+1],x,y-1), grad2(perm[b+1],x-1,y-1), u), v);
  }
  function octave(x, y, oct=4, per=0.5, scale=1) {
    let t=0, f=1, a=1, m=0;
    for (let i=0;i<oct;i++){ t += noise2(x*f/scale, y*f/scale)*a; m+=a; a*=per; f*=2; }
    return t/m;
  }
  return { noise2, octave };
}

// ============================================================
//  2. 程序化纹理（Canvas → DataURL）
// ============================================================
const T = 16; // tile size
function makeTex(drawFn) {
  const c = document.createElement('canvas');
  c.width = T; c.height = T;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(T, T);
  drawFn(img.data);
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
function px(data, x, y, r, g, b) {
  const i = (y*T + x) * 4;
  data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=255;
}
function rn(v, n=12) { return Math.max(0, Math.min(255, v + (Math.random()-.5)*2*n)); }
function hsl2rgb(h,s,l) {
  h/=360; let r,g,b;
  if (s===0) { r=g=b=l; }
  else {
    const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
    const hue2rgb=(p,q,t)=>{
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return [r*255|0, g*255|0, b*255|0];
}

const TEXTURES = {};
function buildTextures() {
  // Grass top
  TEXTURES.grassTop = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const h=90+Math.random()*40, s=.55+.2*Math.random(), l=.3+.15*Math.random();
      const[r,g,b]=hsl2rgb(h,s,l);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Grass side (dirt + grass strip)
  TEXTURES.grassSide = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      let r,g,b;
      if(y>=12){
        const[h,s,l]=[95+Math.random()*30,.6,.35+.15*Math.random()];
        [r,g,b]=hsl2rgb(h,s,l);
        if(Math.random()<.1)[r,g,b]=hsl2rgb(110,.7,.4);
      }else{
        [r,g,b]=hsl2rgb(28,.45,.3+.1*Math.random());
      }
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Dirt
  TEXTURES.dirt = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(28,.45,.3+.1*Math.random());
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Stone
  TEXTURES.stone = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=120+Math.random()*40;
      px(d,x,y,rn(v),rn(v),rn(v));
    }
  });
  // Cobblestone
  TEXTURES.cobble = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      let v=100+Math.random()*40;
      if(x%5===0||y%5===0) v=70;
      px(d,x,y,rn(v),rn(v),rn(v));
    }
  });
  // Sand
  TEXTURES.sand = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(45,.4,.7+.1*Math.random());
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Water
  TEXTURES.water = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(210,.6,.3+.1*Math.random());
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Wood log side
  TEXTURES.woodSide = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(28,.55,.28+Math.sin(x*.6)*.05);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Wood log top (rings)
  TEXTURES.woodTop = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const dist=Math.hypot(x-7.5,y-7.5);
      const l=Math.max(.15,Math.min(.5,.3+Math.sin(dist*.8)*.08));
      const[r,g,b]=hsl2rgb(28,.55,l);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Leaves
  TEXTURES.leaves = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const h=90+Math.random()*35, s=.7, l=.28+.16*Math.random();
      const[r,g,b]=hsl2rgb(h,s,l);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Planks
  TEXTURES.planks = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(30,.5,.38+Math.sin(y*.6)*.04+Math.random()*.05);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Coal ore
  TEXTURES.coalOre = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=120+Math.random()*40;
      const[r,g,b]=Math.random()<.18?[30,30,30]:[v,v,v];
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Iron ore
  TEXTURES.ironOre = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=120+Math.random()*40;
      const[r,g,b]=Math.random()<.18?[200,180,160]:[v,v,v];
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Gold ore
  TEXTURES.goldOre = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=120+Math.random()*40;
      const[r,g,b]=Math.random()<.18?[255,220,80]:[v,v,v];
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Diamond ore
  TEXTURES.diamondOre = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=120+Math.random()*40;
      const[r,g,b]=Math.random()<.18?[100,230,230]:[v,v,v];
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Glass
  TEXTURES.glass = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      if(x===0||y===0||x===T-1||y===T-1) px(d,x,y,220,230,240);
      else { d[(y*T+x)*4]=180; d[(y*T+x)*4+1]=220; d[(y*T+x)*4+2]=240; d[(y*T+x)*4+3]=120; }
    }
  });
  // Brick
  TEXTURES.brick = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const row=Math.floor(y/4), off=(row%2)*4;
      const isMort = ((x+off)%8===0)||(y%4===0);
      const[r,g,b]=isMort?[80,80,80]:hsl2rgb(15,.45,.4+Math.random()*.1);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // TNT
  TEXTURES.tnt = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      let r,g,b;
      if(y<3||y>12){ [r,g,b]=[50,50,50]; }
      else { [r,g,b]=hsl2rgb(0,.85,.45+Math.random()*.1); }
      if(y===7&&x>=3&&x<=12){ r=255;g=255;b=255; }
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Crafting table top
  TEXTURES.benchTop = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(28,.55,.35+Math.random()*.05);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  TEXTURES.benchSide = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(28,.55,.3+Math.random()*.05);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Snow
  TEXTURES.snow = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=235+Math.random()*15;
      px(d,x,y,rn(v),rn(v),rn(v));
    }
  });
  // Bedrock
  TEXTURES.bedrock = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const v=50+Math.random()*40;
      px(d,x,y,rn(v),rn(v),rn(v));
    }
  });
  // Glowstone
  TEXTURES.glow = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(50,.5,.7+Math.random()*.1);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Obsidian
  TEXTURES.obsidian = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(280,.2,.1+Math.random()*.1);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Sandstone
  TEXTURES.sandstone = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const[r,g,b]=hsl2rgb(45,.4,.7+Math.random()*.1);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Pumpkin
  TEXTURES.pumpkinSide = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const l = x%3===0?.42:.5+Math.random()*.05;
      const[r,g,b]=hsl2rgb(28,.85,l);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
  // Cactus
  TEXTURES.cactus = makeTex(d=>{
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const l = (x===0||x===1||x===14||x===15)?.22:.3+Math.random()*.1;
      const[r,g,b]=hsl2rgb(110,.55,l);
      px(d,x,y,rn(r),rn(g),rn(b));
    }
  });
}

// ============================================================
//  3. 方块定义
// ============================================================
const BLOCKS = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, WATER: 6,
  WOOD: 7, LEAVES: 8, PLANKS: 9, COAL: 10, IRON: 11, GOLD: 12, DIAMOND: 13,
  GLASS: 14, BRICK: 15, TNT: 16, BENCH: 17, SNOW: 18, BEDROCK: 19,
  GLOWSTONE: 20, OBSIDIAN: 21, SANDSTONE: 22, PUMPKIN: 23, CACTUS: 24
};
const BLOCK_DATA = {};
function defBlock(id, name, tex, opts={}) {
  BLOCK_DATA[id] = {
    name, tex,
    solid: opts.solid !== false,
    transparent: opts.transparent || false,
    liquid: opts.liquid || false,
    cross: opts.cross || false,
    drop: opts.drop !== undefined ? opts.drop : id,
    texTop: opts.texTop, texSide: opts.texSide, texBottom: opts.texBottom,
  };
}
defBlock(BLOCKS.GRASS, '草', TEXTURES.grassSide, { texTop: TEXTURES.grassTop, texBottom: TEXTURES.dirt, drop: BLOCKS.DIRT });
defBlock(BLOCKS.DIRT, '泥土', TEXTURES.dirt);
defBlock(BLOCKS.STONE, '石头', TEXTURES.stone, { drop: BLOCKS.COBBLE });
defBlock(BLOCKS.COBBLE, '圆石', TEXTURES.cobble);
defBlock(BLOCKS.SAND, '沙子', TEXTURES.sand);
defBlock(BLOCKS.WATER, '水', TEXTURES.water, { solid:false, transparent:true, liquid:true, drop:0 });
defBlock(BLOCKS.WOOD, '橡木', TEXTURES.woodSide, { texTop: TEXTURES.woodTop, texBottom: TEXTURES.woodTop });
defBlock(BLOCKS.LEAVES, '树叶', TEXTURES.leaves, { transparent: true });
defBlock(BLOCKS.PLANKS, '木板', TEXTURES.planks);
defBlock(BLOCKS.COAL, '煤矿', TEXTURES.coalOre);
defBlock(BLOCKS.IRON, '铁矿', TEXTURES.ironOre);
defBlock(BLOCKS.GOLD, '金矿', TEXTURES.goldOre);
defBlock(BLOCKS.DIAMOND, '钻石矿', TEXTURES.diamondOre);
defBlock(BLOCKS.GLASS, '玻璃', TEXTURES.glass, { transparent: true });
defBlock(BLOCKS.BRICK, '砖块', TEXTURES.brick);
defBlock(BLOCKS.TNT, 'TNT', TEXTURES.tnt);
defBlock(BLOCKS.BENCH, '工作台', TEXTURES.benchSide, { texTop: TEXTURES.benchTop });
defBlock(BLOCKS.SNOW, '雪', TEXTURES.snow);
defBlock(BLOCKS.BEDROCK, '基岩', TEXTURES.bedrock, { drop: 0 });
defBlock(BLOCKS.GLOWSTONE, '萤石', TEXTURES.glow);
defBlock(BLOCKS.OBSIDIAN, '黑曜石', TEXTURES.obsidian);
defBlock(BLOCKS.SANDSTONE, '砂岩', TEXTURES.sandstone);
defBlock(BLOCKS.PUMPKIN, '南瓜', TEXTURES.pumpkinSide);
defBlock(BLOCKS.CACTUS, '仙人掌', TEXTURES.cactus);

// 快捷栏可用方块
const HOTBAR_BLOCKS = [
  BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.COBBLE, BLOCKS.SAND,
  BLOCKS.WOOD, BLOCKS.PLANKS, BLOCKS.GLASS, BLOCKS.TNT
];

// ============================================================
//  4. 世界 / 区块管理
// ============================================================
const CHUNK_S = 16, CHUNK_H = 64, SEA_LEVEL = 28;

class World {
  constructor(seedStr) {
    this.seed = seedStr || 'random' + Math.random();
    this.noise = makeNoise(this.seed);
    this.noise2 = makeNoise(this.seed + '_b');
    this.noise3 = makeNoise(this.seed + '_c');
    this.treeNoise = makeNoise(this.seed + '_t');
    this.chunks = new Map();
    this.maxChunks = 64;
  }
  heightAt(x, z) {
    const b = this.biomeAt(x, z);
    let h = 28 + this.noise.octave(x*.015, z*.015, 4, .5, 256) * 18;
    const d2 = this.noise3.octave(x*.08, z*.08, 2, .5, 32) * 3;
    h += d2;
    if (b === 'mountain') {
      const m = this.noise.octave(x*.02, z*.02, 5, .6, 128);
      h = 28 + m * 35;
    } else if (b === 'ocean') {
      h = Math.min(h, SEA_LEVEL - 3 + this.noise.octave(x*.05+333, z*.05+333, 2, .5, 32) * 2);
    } else if (b === 'desert') {
      h = Math.max(SEA_LEVEL+1, Math.min(40, h));
    } else if (b === 'snow') {
      h = Math.max(SEA_LEVEL+2, h + 4);
    } else if (b === 'forest') {
      h = Math.max(SEA_LEVEL+1, h + 2);
    }
    return Math.max(1, Math.min(CHUNK_H-5, Math.floor(h)));
  }
  biomeAt(x, z) {
    const temp = this.noise2.octave(x*.005, z*.005, 3, .5, 64);
    const moist = this.noise2.octave(x*.01+1000, z*.01+1000, 3, .5, 64);
    const elev = this.noise2.octave(x*.003+500, z*.003+500, 4, .5, 256);
    if (elev < -.2) return 'ocean';
    if (temp < -.3) return 'snow';
    if (temp < -.1 && moist < 0) return 'snow';
    if (temp > .4 && moist < -.1) return 'desert';
    if (elev > .35) return 'mountain';
    if (moist > .15) return 'forest';
    return 'plains';
  }
  getChunk(cx, cz) {
    const key = cx + ',' + cz;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const chunk = this.generateChunk(cx, cz);
    if (this.chunks.size >= this.maxChunks) {
      const oldest = this.chunks.keys().next().value;
      const oc = this.chunks.get(oldest);
      if (oc && oc.mesh) { scene.remove(oc.mesh); oc.mesh.geometry.dispose(); }
      this.chunks.delete(oldest);
    }
    this.chunks.set(key, chunk);
    return chunk;
  }
  generateChunk(cx, cz) {
    const blocks = new Uint8Array(CHUNK_S * CHUNK_H * CHUNK_S);
    for (let lz = 0; lz < CHUNK_S; lz++)
    for (let lx = 0; lx < CHUNK_S; lx++) {
      const x = cx*CHUNK_S + lx, z = cz*CHUNK_S + lz;
      const h = this.heightAt(x, z);
      const biome = this.biomeAt(x, z);
      for (let y = 0; y < CHUNK_H; y++) {
        let b = BLOCKS.AIR;
        if (y === 0) b = BLOCKS.BEDROCK;
        else if (y < h-4) b = BLOCKS.STONE;
        else if (y < h) b = biome==='desert'||biome==='ocean' ? BLOCKS.SAND : BLOCKS.DIRT;
        else if (y === h) {
          if (biome === 'desert' || biome === 'ocean') b = BLOCKS.SAND;
          else if (biome === 'snow') b = BLOCKS.SNOW;
          else b = BLOCKS.GRASS;
        } else if (y <= SEA_LEVEL && y > h) b = BLOCKS.WATER;
        blocks[(y*CHUNK_S + lz)*CHUNK_S + lx] = b;
      }
      // 矿石
      for (let y = 1; y < Math.min(40, h); y++) {
        if (blocks[(y*CHUNK_S+lz)*CHUNK_S+lx] !== BLOCKS.STONE) continue;
        const n = this.noise.noise2(x*.3+5000, y*.3+z*.3);
        if (y < 10 && n > .55) blocks[(y*CHUNK_S+lz)*CHUNK_S+lx] = BLOCKS.DIAMOND;
        else if (y < 18 && n > .45) blocks[(y*CHUNK_S+lz)*CHUNK_S+lx] = BLOCKS.GOLD;
        else if (y < 30 && n > .4) blocks[(y*CHUNK_S+lz)*CHUNK_S+lx] = BLOCKS.IRON;
        else if (n > .35) blocks[(y*CHUNK_S+lz)*CHUNK_S+lx] = BLOCKS.COAL;
      }
      // 树
      if (h > SEA_LEVEL && h < CHUNK_H-6 && (biome === 'forest' || biome === 'plains')) {
        const tn = this.treeNoise.noise2(x*.7, z*.7);
        const prob = biome === 'forest' ? .55 : .72;
        if (tn > prob && lx > 2 && lx < 13 && lz > 2 && lz < 13) {
          this.growTree(blocks, lx, h+1, lz);
        }
      }
    }
    return { cx, cz, blocks, mesh: null, dirty: true };
  }
  growTree(blocks, lx, y, lz) {
    const h = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < h; i++)
      if (y+i < CHUNK_H) blocks[((y+i)*CHUNK_S+lz)*CHUNK_S+lx] = BLOCKS.WOOD;
    const top = y + h;
    for (let dy = -1; dy < 3; dy++)
    for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx)+Math.abs(dz) > 3) continue;
      if (dy < 0 && dx === 0 && dz === 0) continue;
      const nx = lx+dx, nz = lz+dz, ny = top+dy;
      if (nx>=0&&nx<CHUNK_S&&nz>=0&&nz<CHUNK_S&&ny<CHUNK_H)
        if (blocks[(ny*CHUNK_S+nz)*CHUNK_S+nx] === BLOCKS.AIR)
          blocks[(ny*CHUNK_S+nz)*CHUNK_S+nx] = BLOCKS.LEAVES;
    }
  }
  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_H) return BLOCKS.AIR;
    const cx = Math.floor(wx / CHUNK_S), cz = Math.floor(wz / CHUNK_S);
    const chunk = this.getChunk(cx, cz);
    const lx = ((wx % CHUNK_S) + CHUNK_S) % CHUNK_S;
    const lz = ((wz % CHUNK_S) + CHUNK_S) % CHUNK_S;
    return chunk.blocks[(wy*CHUNK_S + lz)*CHUNK_S + lx];
  }
  setBlock(wx, wy, wz, b) {
    if (wy < 0 || wy >= CHUNK_H) return;
    const cx = Math.floor(wx / CHUNK_S), cz = Math.floor(wz / CHUNK_S);
    const chunk = this.getChunk(cx, cz);
    const lx = ((wx % CHUNK_S) + CHUNK_S) % CHUNK_S;
    const lz = ((wz % CHUNK_S) + CHUNK_S) % CHUNK_S;
    chunk.blocks[(wy*CHUNK_S + lz)*CHUNK_S + lx] = b;
    chunk.dirty = true;
    // 边界 -> 标记邻居
    if (lx === 0) this._markDirty(cx-1, cz);
    if (lx === CHUNK_S-1) this._markDirty(cx+1, cz);
    if (lz === 0) this._markDirty(cx, cz-1);
    if (lz === CHUNK_S-1) this._markDirty(cx, cz+1);
  }
  _markDirty(cx, cz) {
    const c = this.chunks.get(cx+','+cz);
    if (c) c.dirty = true;
  }
}

// ============================================================
//  5. 区块网格构建
// ============================================================
const FACES = [
  { dir:[1,0,0], verts:[[1,1,1, 0,1,1, 0,0,1, 1,0,1], uv:[[1,1,0,1,0,0,1,0]], light:0.8 },
  { dir:[-1,0,0], verts:[[0,1,0, 1,1,0, 1,0,0, 0,0,0], uv:[[1,1,0,1,0,0,1,0]], light:0.8 },
  { dir:[0,1,0], verts:[[0,1,1, 1,1,1, 1,1,0, 0,1,0]], uv:[[0,0,1,0,1,1,0,1]], light:1.0 },
  { dir:[0,-1,0], verts:[[0,0,0, 1,0,0, 1,0,1, 0,0,1], uv:[[0,0,1,0,1,1,0,1]], light:0.5 },
  { dir:[0,0,1], verts:[[1,1,0, 1,1,1, 0,1,1, 0,1,0]], uv:[[0,0,1,0,1,1,0,1]], light:0.9 },
  { dir:[0,0,-1], verts:[[0,1,1, 1,1,1, 1,0,1, 0,0,1]], uv:[[0,0,1,0,1,1,0,1]], light:0.65 },
];
const NEIGHBORS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

function getFaceTexture(blockId, faceIdx) {
  const d = BLOCK_DATA[blockId];
  if (!d) return TEXTURES.stone;
  if (faceIdx === 2 && d.texTop) return d.texTop;
  if (faceIdx === 3 && d.texBottom) return d.texBottom;
  return d.tex;
}

// 纹理缓存
const texCache = {};
function getTexture(texUrl) {
  if (!texCache[texUrl]) {
    texCache[texUrl] = new THREE.TextureLoader().load(texUrl);
    texCache[texUrl].magFilter = THREE.NearestFilter;
    texCache[texUrl].minFilter = THREE.NearestFilter;
    texCache[texUrl].colorSpace = THREE.SRGBColorSpace;
  }
  return texCache[texUrl];
}

function buildChunkMesh(world, chunk) {
  const positions = [], uvs = [], colors = [], indices = [];
  let idx = 0;
  const blocks = chunk.blocks;
  const baseX = chunk.cx * CHUNK_S, baseZ = chunk.cz * CHUNK_S;

  for (let y = 0; y < CHUNK_H; y++)
  for (let z = 0; z < CHUNK_S; z++)
  for (let x = 0; x < CHUNK_S; x++) {
    const b = blocks[(y*CHUNK_S+z)*CHUNK_S+x];
    if (b === BLOCKS.AIR) continue;
    const data = BLOCK_DATA[b];
    if (!data) continue;
    for (let f = 0; f < 6; f++) {
      const n = NEIGHBORS[f];
      const nx = x+n[0], ny = y+n[1], nz = z+n[2];
      let nb;
      if (nx>=0&&nx<CHUNK_S&&ny>=0&&ny<CHUNK_H&&nz>=0&&nz<CHUNK_S) {
        nb = blocks[(ny*CHUNK_S+nz)*CHUNK_S+nx];
      } else {
        nb = world.getBlock(baseX+nx, ny, baseZ+nz);
      }
      const nd = BLOCK_DATA[nb];
      // 面剔除：邻居是空气 或 透明（非同类液体）
      const visible = nb === BLOCKS.AIR ||
        (nd && nd.transparent && !nd.liquid) ||
        (nd && nd.liquid && nb !== b && b !== BLOCKS.WATER);
      if (!visible) continue;

      const face = FACES[f];
      const v = face.verts;
      const texUrl = getFaceTexture(b, f);
      const tex = getTexture(texUrl);
      // 简化 UV：用一个 Material 数组, 这里我们用顶点颜色模拟
      // 为了简化, 使用顶点颜色方式 + 多材质
      const L = face.light;
      for (let i = 0; i < 4; i++) {
        positions.push(v[i*3]+x+baseX, v[i*3+1]+y, v[i*3+2]+z+baseZ+nz*0);
        uvs.push(i<2?0:1, i%2?0:1);
        colors.push(L, L, L);
      }
      indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3);
      idx += 4;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  return geom;
}

// ============================================================
//  6. Three.js 场景
// ============================================================
let scene, camera, renderer, world;
let clock;
const player = {
  pos: new THREE.Vector3(8, 40, 8),
  vel: new THREE.Vector3(),
  onGround: false,
  inWater: false,
  flying: false,
  health: 20, maxHealth: 20,
  hunger: 20, maxHunger: 20,
  hurtTime: 0,
  dead: false,
  selectedSlot: 0,
  inventory: HOTBAR_BLOCKS.map((b,i) => ({ id: b, count: i===0?64:64 })),
  pitch: 0, yaw: 0,
};
const keys = {};
let gameStarted = false;
let paused = false;
let showDebug = false;
let dayTime = 0.3;
const DAY_LENGTH = 300; // 秒

const GRAVITY = 28, JUMP = 9, WALK = 4.5, SPRINT = 7, SWIM = 3;
const P_HEIGHT = 1.8, P_EYE = 1.62, P_RADIUS = 0.3;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88bbff);
  scene.fog = new THREE.Fog(0x88bbff, 40, 100);

  camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 200);
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  document.body.appendChild(renderer.domElement);

  // 光照
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(50, 100, 30);
  scene.add(sun);
  player.sun = sun;

  clock = new THREE.Clock();

  // 纹理材质
  window.materialCache = {};
  buildTextures();
  rebuildBlockData();

  // 事件
  addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', () => {});
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('wheel', onWheel);
  document.addEventListener('pointerlockchange', onLockChange);
}

function rebuildBlockData() {
  // 重建 BLOCK_DATA 引用最新 TEXTURES
  defBlock(BLOCKS.GRASS, '草', TEXTURES.grassSide, { texTop: TEXTURES.grassTop, texBottom: TEXTURES.dirt, drop: BLOCKS.DIRT });
  defBlock(BLOCKS.DIRT, '泥土', TEXTURES.dirt);
  defBlock(BLOCKS.STONE, '石头', TEXTURES.stone, { drop: BLOCKS.COBBLE });
  defBlock(BLOCKS.COBBLE, '圆石', TEXTURES.cobble);
  defBlock(BLOCKS.SAND, '沙子', TEXTURES.sand);
  defBlock(BLOCKS.WATER, '水', TEXTURES.water, { solid:false, transparent:true, liquid:true, drop:0 });
  defBlock(BLOCKS.WOOD, '橡木', TEXTURES.woodSide, { texTop: TEXTURES.woodTop, texBottom: TEXTURES.woodTop });
  defBlock(BLOCKS.LEAVES, '树叶', TEXTURES.leaves, { transparent: true });
  defBlock(BLOCKS.PLANKS, '木板', TEXTURES.planks);
  defBlock(BLOCKS.COAL, '煤矿', TEXTURES.coalOre);
  defBlock(BLOCKS.IRON, '铁矿', TEXTURES.ironOre);
  defBlock(BLOCKS.GOLD, '金矿', TEXTURES.goldOre);
  defBlock(BLOCKS.DIAMOND, '钻石矿', TEXTURES.diamondOre);
  defBlock(BLOCKS.GLASS, '玻璃', TEXTURES.glass, { transparent: true });
  defBlock(BLOCKS.BRICK, '砖块', TEXTURES.brick);
  defBlock(BLOCKS.TNT, 'TNT', TEXTURES.tnt);
  defBlock(BLOCKS.BENCH, '工作台', TEXTURES.benchSide, { texTop: TEXTURES.benchTop });
  defBlock(BLOCKS.SNOW, '雪', TEXTURES.snow);
  defBlock(BLOCKS.BEDROCK, '基岩', TEXTURES.bedrock, { drop: 0 });
  defBlock(BLOCKS.GLOWSTONE, '萤石', TEXTURES.glow);
  defBlock(BLOCKS.OBSIDIAN, '黑曜石', TEXTURES.obsidian);
  defBlock(BLOCKS.SANDSTONE, '砂岩', TEXTURES.sandstone);
  defBlock(BLOCKS.PUMPKIN, '南瓜', TEXTURES.pumpkinSide);
  defBlock(BLOCKS.CACTUS, '仙人掌', TEXTURES.cactus);
}

// ============================================================
//  7. 输入
// ============================================================
function onKeyDown(e) {
  keys[e.code] = true;
  if (e.code === 'Escape') {
    if (gameStarted && !player.dead) togglePause();
  }
  if (e.code === 'KeyE') { if (gameStarted) togglePause(); }
  if (e.code === 'F3') { e.preventDefault(); showDebug = !showDebug; }
  if (e.code === 'Space' && player.flying) { player.vel.y = 6; }
  // 数字键切换
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5)) - 1;
    if (n >= 0 && n < 9) player.selectedSlot = n;
  }
}
function onKeyUp(e) { keys[e.code] = false; }
function onMouseMove(e) {
  if (document.pointerLockElement !== renderer.domElement) return;
  if (paused) return;
  player.yaw -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
  player.pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, player.pitch));
}
function onMouseDown(e) {
  if (!gameStarted || paused || player.dead) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }
  if (e.button === 0) breakBlock();
  else if (e.button === 2) placeBlock();
}
function onWheel(e) {
  if (!gameStarted || paused) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  player.selectedSlot = (player.selectedSlot + dir + 9) % 9;
}
function onLockChange() {
  if (document.pointerLockElement !== renderer.domElement && gameStarted && !player.dead) {
    paused = true;
    document.getElementById('pauseScreen').style.display = 'flex';
  }
}
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
function togglePause() {
  paused = !paused;
  document.getElementById('pauseScreen').style.display = paused ? 'flex' : 'none';
  if (paused) document.exitPointerLock();
  else renderer.domElement.requestPointerLock();
}

// ============================================================
//  8. 方块交互
// ============================================================
function raycast(maxDist=6) {
  const origin = new THREE.Vector3(player.pos.x, player.pos.y + P_EYE, player.pos.z);
  const dir = new THREE.Vector3(
    -Math.sin(player.yaw) * Math.cos(player.pitch),
    -Math.sin(player.pitch),
    -Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  const step = 0.05;
  let prev = null;
  for (let t = 0; t < maxDist; t += step) {
    const x = Math.floor(origin.x + dir.x * t);
    const y = Math.floor(origin.y + dir.y * t);
    const z = Math.floor(origin.z + dir.z * t);
    const key = x+','+y+','+z;
    if (key === prev) continue;
    prev = key;
    const b = world.getBlock(x, y, z);
    if (b !== BLOCKS.AIR) {
      const data = BLOCK_DATA[b];
      if (data && !data.liquid) {
        // 计算面
        const fx = (origin.x+dir.x*t) - x;
        const fy = (origin.y+dir.y*t) - y;
        const fz = (origin.z+dir.z*t) - z;
        let face = 0, bestD = 999;
        const centers = [[1.5,.5,.5],[-.5,.5,.5],[.5,1.5,.5],[.5,-.5,.5],[.5,.5,1.5],[.5,.5,-.5]];
        for (let i=0;i<6;i++){
          const d = (fx-centers[i][0])**2+(fy-centers[i][1])**2+(fz-centers[i][2])**2;
          if (d<bestD){bestD=d;face=i;}
        }
        return { x, y, z, block: b, face };
      }
    }
  }
  return null;
}
function breakBlock() {
  const hit = raycast();
  if (!hit) return;
  if (hit.block === BLOCKS.BEDROCK) return;
  if (hit.block === BLOCKS.TNT) { explode(hit.x+.5, hit.y+.5, hit.z+.5); world.setBlock(hit.x,hit.y,hit.z,BLOCKS.AIR); return; }
  const data = BLOCK_DATA[hit.block];
  world.setBlock(hit.x, hit.y, hit.z, BLOCKS.AIR);
  if (data.drop) addToInventory(data.drop, 1);
  spawnParticles(hit.x, hit.y, hit.z, hit.block);
  updateChunkMeshes();
}
function placeBlock() {
  const hit = raycast();
  if (!hit) return;
  const n = NEIGHBORS[hit.face];
  const nx = hit.x+n[0], ny = hit.y+n[1], nz = hit.z+n[2];
  if (ny < 0 || ny >= CHUNK_H) return;
  // 不放在玩家身上
  const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
  if (px>nx-P_RADIUS && px<nx+1+P_RADIUS && py>ny-P_HEIGHT+0.2 && py<ny+1.2 && pz>nz-P_RADIUS && pz<nz+1+P_RADIUS) return;
  if (world.getBlock(nx, ny, nz) !== BLOCKS.AIR) return;
  const slot = player.inventory[player.selectedSlot];
  if (!slot || slot.count <= 0) return;
  world.setBlock(nx, ny, nz, slot.id);
  slot.count--;
  if (slot.count <= 0) slot.id = 0;
  updateChunkMeshes();
}
function addToInventory(blockId, count) {
  // 放入快捷栏
  for (let s of player.inventory) {
    if (s.id === blockId && s.count < 64) { s.count += count; return; }
  }
  for (let i = 0; i < player.inventory.length; i++) {
    if (player.inventory[i].count <= 0) {
      player.inventory[i].id = blockId;
      player.inventory[i].count = count;
      return;
    }
  }
}
function explode(x, y, z, power=3) {
  const r = power;
  for (let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){
    const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
    if (d > r) continue;
    const bx=Math.floor(x)+dx, by=Math.floor(y)+dy, bz=Math.floor(z)+dz;
    const b = world.getBlock(bx,by,bz);
    if (b===BLOCKS.AIR||b===BLOCKS.BEDROCK) continue;
    if (b===BLOCKS.OBSIDIAN && d<2) continue;
    if (Math.random() < 1-d/r) world.setBlock(bx,by,bz,BLOCKS.AIR);
  }
  // 伤害
  const pd = player.pos.distanceTo(new THREE.Vector3(x,y,z));
  if (pd < power*2) player.health -= (power*2 - pd)*4;
  updateChunkMeshes();
}

// ============================================================
//  9. 粒子
// ============================================================
const particles = [];
function spawnParticles(x, y, z, blockId) {
  const data = BLOCK_DATA[blockId];
  if (!data) return;
  for (let i = 0; i < 12; i++) {
    const g = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const m = new THREE.MeshLambertMaterial({ color: getBlockColor(blockId) });
    const p = new THREE.Mesh(g, m);
    p.position.set(x+.5, y+.5, z+.5);
    p.userData = {
      vx: (Math.random()-.5)*4, vy: Math.random()*4+1, vz: (Math.random()-.5)*4,
      life: 1.0,
    };
    scene.add(p);
    particles.push(p);
  }
}
function getBlockColor(blockId) {
  const c = {
    [BLOCKS.GRASS]: 0x4a8a2a, [BLOCKS.DIRT]: 0x8B5A2B, [BLOCKS.STONE]: 0x808080,
    [BLOCKS.COBBLE]: 0x707070, [BLOCKS.SAND]: 0xD4C37A, [BLOCKS.WOOD]: 0x6b4f2a,
    [BLOCKS.LEAVES]: 0x3a7a1a, [BLOCKS.PLANKS]: 0xb8893a, [BLOCKS.COAL]: 0x404040,
    [BLOCKS.IRON]: 0xb09080, [BLOCKS.GOLD]: 0xd4af37, [BLOCKS.DIAMOND]: 0x4fdbe6,
    [BLOCKS.BRICK]: 0x8B4513, [BLOCKS.TNT]: 0xcc2222, [BLOCKS.SNOW]: 0xffffff,
    [BLOCKS.BEDROCK]: 0x444444, [BLOCKS.GLASS]: 0xaaccee,
  };
  return c[blockId] || 0x808080;
}
function updateParticles(dt) {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.userData.vy -= 8 * dt;
    p.position.x += p.userData.vx * dt;
    p.position.y += p.userData.vy * dt;
    p.position.z += p.userData.vz * dt;
    p.userData.life -= dt;
    if (p.userData.life <= 0) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
      particles.splice(i, 1);
    }
  }
}

// ============================================================
// 10. 物理 / 移动
// ============================================================
function updatePhysics(dt) {
  if (player.dead) return;
  // 饥饿
  const sprinting = keys['ControlLeft'] || keys['ControlRight'];
  player.hunger -= (sprinting ? 0.04 : 0.006) * dt;
  if (player.hunger < 0) player.hunger = 0;
  if (player.hunger === 0 && player.health > 1) { player.health -= 0.5*dt; player.hurtTime = .4; }
  if (player.hurtTime > 0) player.hurtTime -= dt;

  // 水检测
  const bx = Math.floor(player.pos.x), by = Math.floor(player.pos.y), bz = Math.floor(player.pos.z);
  const fb = world.getBlock(bx, by, bz);
  const hb = world.getBlock(bx, by+1, bz);
  player.inWater = fb === BLOCKS.WATER || hb === BLOCKS.WATER;

  // 方向输入
  const yaw = player.yaw;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  let mx = 0, mz = 0;
  if (keys['KeyW']) { mx += forward.x; mz += forward.z; }
  if (keys['KeyS']) { mx -= forward.x; mz -= forward.z; }
  if (keys['KeyA']) { mx -= right.x; mz -= right.z; }
  if (keys['KeyD']) { mx += right.x; mz += right.z; }
  const mlen = Math.hypot(mx, mz);
  if (mlen > 0) { mx /= mlen; mz /= mlen; }

  const speed = sprinting ? SPRINT : (player.inWater ? SWIM : WALK);
  const accel = player.onGround ? 20 : 6;
  player.vel.x += mx * accel * dt;
  player.vel.z += mz * accel * dt;
  const fric = player.onGround ? 0.82 : (player.inWater ? 0.5 : 0.92);
  player.vel.x *= Math.pow(fric, dt*60);
  player.vel.z *= Math.pow(fric, dt*60);
  const vh = Math.hypot(player.vel.x, player.vel.z);
  if (vh > speed) { player.vel.x *= speed/vh; player.vel.z *= speed/vh; }

  // 跳跃
  if (keys['Space']) {
    if (player.inWater) player.vel.y = Math.max(player.vel.y, 4);
    else if (player.onGround) player.vel.y = JUMP;
  }
  // 重力
  if (player.inWater) player.vel.y -= GRAVITY*0.3 * dt;
  else player.vel.y -= GRAVITY * dt;
  if (player.inWater) player.vel.y = Math.max(player.vel.y, -3);

  // 碰撞移动
  moveAxis(0, player.vel.x * dt);
  moveAxis(1, player.vel.y * dt);
  moveAxis(2, player.vel.z * dt);

  if (player.health <= 0 && !player.dead) {
    player.dead = true; player.health = 0;
    document.getElementById('deathScreen').style.display = 'flex';
    document.exitPointerLock();
  }
}

function checkCollision(x, y, z) {
  const x0 = x-P_RADIUS, x1 = x+P_RADIUS;
  const y0 = y-P_HEIGHT+0.2, y1 = y+0.2;
  const z0 = z-P_RADIUS, z1 = z+P_RADIUS;
  for (let bx=Math.floor(x0); bx<=Math.floor(x1-1e-6); bx++)
  for (let by=Math.floor(y0); by<=Math.floor(y1-1e-6); by++)
  for (let bz=Math.floor(z0); bz<=Math.floor(z1-1e-6); bz++) {
    const b = world.getBlock(bx, by, bz);
    if (b === BLOCKS.AIR) continue;
    const d = BLOCK_DATA[b];
    if (!d || !d.solid) continue;
    return true;
  }
  return false;
}
function moveAxis(axis, delta) {
  if (delta === 0) return;
  const p = player.pos;
  const np = p.clone();
  np.setComponent(axis, np.getComponent(axis) + delta);
  if (checkCollision(np.x, np.y, np.z)) {
    if (axis === 1) {
      if (delta < 0) player.onGround = true;
      player.vel.y = 0;
    } else if (axis === 0) player.vel.x = 0;
    else player.vel.z = 0;
  } else {
    p.setComponent(axis, np.getComponent(axis));
    if (axis === 1 && delta > 0) player.onGround = false;
  }
}

// ============================================================
// 11. 区块更新
// ============================================================
function updateChunks() {
  const pcx = Math.floor(player.pos.x / CHUNK_S);
  const pcz = Math.floor(player.pos.z / CHUNK_S);
  const R = 3;
  // 加载
  let built = 0;
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      const dist = dx*dx + dz*dz;
      if (dist > (R+1)*(R+1)) continue;
      const chunk = world.getChunk(cx, cz);
      if (chunk.dirty) {
        if (chunk.mesh) { scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); chunk.mesh = null; }
        if (built < 2) { // 每帧最多2个
          buildMeshForChunk(chunk);
          chunk.dirty = false;
          built++;
        }
      }
    }
  }
}
function buildMeshForChunk(chunk) {
  const geom = buildChunkMesh(world, chunk);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  // 需要纹理 — 这里用顶点颜色 + atlas 替代
  chunk.mesh = new THREE.Mesh(geom, mat);
  scene.add(chunk.mesh);
}
function updateChunkMeshes() {
  for (const chunk of world.chunks.values()) chunk.dirty = true;
}

// ============================================================
// 12. 昼夜
// ============================================================
function updateSky() {
  dayTime = (dayTime + 1/DAY_LENGTH * clock.getDelta()) % 1;
  const ang = (dayTime - 0.25) * Math.PI * 2;
  const sunH = Math.sin(ang);
  let skyColor, lightAmt;
  if (sunH > 0.2) { skyColor = new THREE.Color(0x88bbff); lightAmt = 0.5 + 0.5*sunH; }
  else if (sunH > -0.1) {
    const f = (sunH+0.1)/0.3;
    skyColor = new THREE.Color().setRGB(0.53*(1-f)+0.05*f, 0.73*(1-f)+0.05*f, 1.0*(1-f)+0.12*f);
    lightAmt = 0.2 + 0.3*f;
  } else { skyColor = new THREE.Color(0x0a0a20); lightAmt = 0.15; }
  scene.background = skyColor;
  scene.fog.color = skyColor;
  if (player.sun) {
    player.sun.intensity = lightAmt * 0.8;
    player.sun.position.set(Math.cos(ang)*100, Math.sin(ang)*100, 30);
  }
}

// ============================================================
// 13. HUD 更新
// ============================================================
function updateHUD() {
  // 快捷栏
  const hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = player.inventory[i];
    const div = document.createElement('div');
    div.className = 'hot-slot' + (i === player.selectedSlot ? ' active' : '');
    if (slot && slot.count > 0) {
      const color = getBlockColor(slot.id);
      const icon = document.createElement('div');
      icon.className = 'slot-icon';
      icon.style.background = '#' + color.toString(16).padStart(6,'0');
      div.appendChild(icon);
      if (slot.count > 1) {
        const c = document.createElement('div');
        c.className = 'slot-count';
        c.textContent = slot.count;
        div.appendChild(c);
      }
    }
    hb.appendChild(div);
  }
  // 生命
  const hbar = document.getElementById('healthBar');
  hbar.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('div');
    const hp = i*2+2;
    if (player.health >= hp) h.className = 'heart full';
    else if (player.health >= hp-1) h.className = 'heart half';
    else h.className = 'heart empty';
    hbar.appendChild(h);
  }
  // Debug
  if (showDebug) {
    const di = document.getElementById('debugInfo');
    const cx = Math.floor(player.pos.x), cy = Math.floor(player.pos.y), cz = Math.floor(player.pos.z);
    const biome = world.biomeAt(cx, cz);
    const hour = Math.floor(dayTime * 24);
    di.innerHTML = `FPS: ${fps}<br>XYZ: ${player.pos.x.toFixed(1)} ${player.pos.y.toFixed(1)} ${player.pos.z.toFixed(1)}<br>区块: ${cx},${cz}<br>生物群系: ${biome}<br>时间: ${String(hour).padStart(2,'0')}:00<br>生命: ${player.health.toFixed(0)} 饥饿: ${player.hunger.toFixed(0)}`;
  } else {
    document.getElementById('debugInfo').innerHTML = '';
  }
}

// ============================================================
// 14. 渲染循环
// ============================================================
let fps = 60, frameCount = 0, fpsTime = 0;
function animate() {
  requestAnimationFrame(animate);
  if (!gameStarted) return;
  const dt = Math.min(0.05, clock.getDelta());

  if (!paused) {
    updatePhysics(dt);
    updateChunks();
    updateParticles(dt);
    updateSky();
  }
  // 相机
  camera.position.set(player.pos.x, player.pos.y + P_EYE, player.pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // FPS
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1) { fps = frameCount; frameCount = 0; fpsTime = 0; }
  updateHUD();

  renderer.render(scene, camera);
}

// ============================================================
// 15. 启动
// ============================================================
function startGame(seedStr) {
  buildTextures();
  rebuildBlockData();
  world = new World(seedStr);
  // 找出生点
  let spawnX = 8, spawnZ = 8;
  for (let r = 0; r < 50; r++) {
    const b = world.biomeAt(spawnX, spawnZ);
    if (b !== 'ocean') break;
    spawnX += 16; spawnZ += 16;
  }
  const h = world.heightAt(spawnX, spawnZ);
  player.pos.set(spawnX + 0.5, h + 2, spawnZ + 0.5);
  player.vel.set(0,0,0);
  player.health = player.maxHealth;
  player.hunger = player.maxHunger;
  player.dead = false;

  // 预加载
  for (let dz = -2; dz <= 2; dz++)
  for (let dx = -2; dx <= 2; dx++)
    world.getChunk(Math.floor(spawnX/CHUNK_S)+dx, Math.floor(spawnZ/CHUNK_S)+dz);

  updateChunkMeshes();
  gameStarted = true;
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('seedDisplay').textContent = '🌱 种子: ' + world.seed;
  renderer.domElement.requestPointerLock();
}

document.getElementById('playBtn').addEventListener('click', () => {
  const seed = document.getElementById('seedInput').value.trim();
  initScene();
  startGame(seed || undefined);
  animate();
});
document.getElementById('randomSeedBtn').addEventListener('click', () => {
  const words = ['diamond','creeper','adventure','epic','survival','pixel','craft',' voxel','cave','lava','ocean','forest','mountain','tnt','redstone'];
  const w = words[Math.floor(Math.random()*words.length)];
  const n = Math.floor(Math.random()*99999);
  document.getElementById('seedInput').value = w + n;
});
document.getElementById('respawnBtn').addEventListener('click', () => {
  player.dead = false;
  player.health = player.maxHealth;
  player.hunger = player.maxHunger;
  const h = world.heightAt(Math.floor(player.pos.x), Math.floor(player.pos.z));
  player.pos.y = h + 2;
  player.vel.set(0,0,0);
  document.getElementById('deathScreen').style.display = 'none';
  renderer.domElement.requestPointerLock();
});
