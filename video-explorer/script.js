const { origin, pathname } = window.location;
const segs = pathname.split('/');
if (!segs.pop().includes('.')) segs.push('');
const basePath = segs.join('/') + '/';

// Helper para URLs correctas
function fullUrl(path) { return new URL(path, origin).href; }
document.getElementById('folder-name').textContent = "Videos @ " + decodeURIComponent(basePath) || '/';

function toggleContent(el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function goBack() {
  const p = basePath.split('/').slice(0, -2).join('/') + '/';
  window.location.href = fullUrl(p);
}

// Cache de thumbnails: guarda promesas
const thumbnailsCache = {};

// Observer para imágenes y posters
const io = new IntersectionObserver(onIntersection, { rootMargin: '200px' });
function onIntersection(entries, obs) {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;

    if (t.classList.contains('thumb')) {
      const folder = t.dataset.folder;
      if (!thumbnailsCache[folder]) {
        thumbnailsCache[folder] = fetch(fullUrl(folder), { headers: { Accept: 'application/json' } })
          .then(r => r.json()).catch(() => []);
      }
      thumbnailsCache[folder].then(files => {
        const match = files.find(i => i.name.startsWith(t.dataset.video));
        if (match) {
          t.src = fullUrl(match.path);
          t.onload = () => t.classList.remove('loading');
        }
      });
      obs.unobserve(t);
    }
    else if (t.classList.contains('folder__poster-bg')) {
      t.style.backgroundImage = `url('${t.dataset.src}')`;
      const img = t.parentNode.querySelector('.folder__poster-image');
      img.onload = () => { img.style.display = 'block'; t.classList.remove('loading'); };
      img.src = img.dataset.src;
      obs.unobserve(t);
    }
    else if (t.classList.contains('folder__poster-image')) {
      t.onload = () => {
        t.style.display = 'block';
        const bg = t.parentNode.querySelector('.folder__poster-bg');
        bg.style.backgroundImage = `url('${bg.dataset.src}')`;
        bg.classList.remove('loading');
      };
      t.src = t.dataset.src;
      obs.unobserve(t);
    }
  });
}

// Observer para cargar subfolders dinámicamente
const folderObserver = new IntersectionObserver(async (entries, obs) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const ph = e.target;
    const path = ph.dataset.path;
    const name = ph.dataset.name;
    const parent = ph.parentNode;
    obs.unobserve(ph);
    parent.removeChild(ph);
    await collectAndRender({ name, path }, '', parent);
  }
}, { rootMargin: '200px' });


async function collectAndRender(dir, prefix, container) {
  const frag = document.createDocumentFragment();
  const folder = document.createElement('div'); folder.className = 'folder is-loading';

  const hdr = document.createElement('div'); hdr.className = 'folder__header'; hdr.textContent = dir.name;
  folder.append(hdr);

  const cont = document.createElement('div'); cont.className = 'folder__content'; cont.style.display = 'none';
  folder.append(cont);

  folder.addEventListener('click', e => { if (!e.target.closest('.card')) toggleContent(cont); e.stopPropagation(); });

  let items;
  try {
    items = await fetch(fullUrl(dir.path), { headers: { Accept: 'application/json' } }).then(r => r.json());
  } catch {
    return;
  }

  const photos = items.filter(i => i.type === 'photo');
  const descF = items.find(i => i.type === 'text' && i.name === 'description.txt');
  if (photos.length || descF) {
    const dw = document.createElement('div'); dw.className = 'folder__description';
    const di = document.createElement('div'); di.className = 'folder__desc-inner';
    if (photos.length) {
      const pc = document.createElement('div'); pc.className = 'folder__poster-container';
      const bg = document.createElement('div'); bg.className = 'folder__poster-bg loading';
      bg.dataset.src = fullUrl(photos[0].path);
      pc.append(bg); io.observe(bg);
      const img = document.createElement('img'); img.className = 'folder__poster-image';
      img.dataset.src = fullUrl(photos[0].path);
      img.alt = 'Poster'; img.style.display = 'none';
      pc.append(img); io.observe(img);
      di.append(pc);
    }
    if (descF) {
      const dt = document.createElement('div'); dt.className = 'desc-text';
      fetch(fullUrl(descF.path)).then(r => r.text()).then(t => dt.textContent = t);
      di.append(dt);
    }
    dw.append(di);
    folder.insertBefore(dw, cont);
  }

  // Videos
  const vids = items.filter(i => i.type === 'video');
  if (vids.length) {
    const grid = document.createElement('div'); grid.className = 'grid';
    vids.forEach(v => {
      const card = document.createElement('div'); card.className = 'card';
      card.onclick = e => { e.stopPropagation(); window.open(fullUrl(v.path), '_blank'); };
      const th = document.createElement('img'); th.className = 'thumb loading';
      th.dataset.video = v.name;
      th.dataset.folder = dir.path + '.thumbnails/';
      th.alt = v.name;
      io.observe(th);
      const info = document.createElement('div'); info.className = 'info';
      const title = document.createElement('div'); title.className = 'title'; title.textContent = v.name.replace(/\.[^/.]+$/, '');
      info.append(title);
      card.append(th, info);
      grid.append(card);
    });
    cont.append(grid);
  }

  // Subdirectorios
  const subs = items.filter(i => i.type === 'directory' && i.name !== '.thumbnails');
  if (subs.length) {
    const phContainer = document.createElement('div'); phContainer.className = 'subfolders';
    subs.forEach(s => {
      const ph = document.createElement('div'); ph.className = 'folder-placeholder loading';
      ph.textContent = s.name;
      ph.dataset.path = dir.path + s.name + '/';
      ph.dataset.name = s.name;
      phContainer.append(ph);
      folderObserver.observe(ph);
    });
    cont.append(phContainer);
  }

  folder.classList.remove('is-loading');
  frag.append(folder);
  container.append(frag);
}

async function renderAll() {
  const ctr = document.getElementById('container');
  const all = await fetch(fullUrl(basePath), { headers: { Accept: 'application/json' } }).then(r => r.json());

  const rootV = all.filter(i => i.type === 'video');
  if (rootV.length) await collectAndRender({ name: '.', path: basePath }, '', ctr);

  const dirs = all.filter(i => i.type === 'directory' && i.name !== '.thumbnails')
                  .sort((a, b) => a.name.localeCompare(b.name));
  for (const d of dirs) {
    await collectAndRender({ name: d.name, path: basePath + d.name + '/' }, '', ctr);
  }
}

renderAll();
