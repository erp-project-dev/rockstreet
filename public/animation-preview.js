(async () => {
  const manifest = await fetch('assets/animation-manifest.json').then(r => r.json());
  const selector = document.getElementById('character');
  const grid = document.getElementById('grid');
  const status = document.getElementById('status');
  let views = [], version = 0;
  async function load() {
    const token = ++version;
    status.textContent = 'Cargando...';
    const actor = manifest.characters[selector?.value ?? 'axel'];
    const definitions = Object.entries(manifest.animations).filter(([key]) => key.startsWith(actor.prefix + '-'));
    const keys = new Set(definitions.flatMap(([, def]) => def.frames.map(f => f.key)));
    const assets = {};
    for (const key of keys) {
      const paths = manifest.textures[key];
      const atlas = await fetch(paths.atlas).then(r => r.json());
      const image = new Image(); image.src = paths.image; await image.decode();
      assets[key] = { atlas, image };
    }
    if (token !== version) return;
    grid.replaceChildren();
    const reference = assets[actor.texture].atlas.frames['0'];
    views = definitions.map(([key, definition]) => {
      const article = document.createElement('article');
      const title = document.createElement('h3'); title.textContent = key.slice(actor.prefix.length + 1);
      const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 280;
      article.append(title, canvas); grid.append(article);
      return { definition, assets, reference, ctx: canvas.getContext('2d') };
    });
    status.textContent = 'Secuencias exportadas de las mismas animaciones que usa el juego.';
  }
  function render(t) {
    for (const view of views) {
      const frames = view.definition.frames;
      const step = frames[Math.floor(t * view.definition.frameRate / 1000) % frames.length];
      const asset = view.assets[step.key], frame = asset.atlas.frames[step.frame];
      const r = frame.frame, d = frame.spriteSourceSize, size = frame.sourceSize;
      const scale = 180 * view.reference.sourceSize.h / view.reference.frame.h / size.h;
      const ctx = view.ctx; ctx.clearRect(0, 0, 220, 280); ctx.save();
      if (document.getElementById('flip').checked) { ctx.translate(220, 0); ctx.scale(-1, 1); }
      ctx.drawImage(asset.image, r.x, r.y, r.w, r.h, 110 + (d.x - size.w / 2) * scale, 250 + (d.y - size.h * .92) * scale, r.w * scale, r.h * scale);
      ctx.restore();
    }
    requestAnimationFrame(render);
  }
  if (selector) selector.onchange = () => load().catch(e => status.textContent = e.message);
  await load(); requestAnimationFrame(render);
})().catch(e => document.getElementById('status').textContent = e.message);
