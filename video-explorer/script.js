const { origin, pathname } = window.location;
const segs = pathname.split('/');
if (!segs.pop().includes('.')) segs.push('');
const basePath = segs.join('/');
document.getElementById('folder-name').textContent = "Videos @ " + decodeURIComponent(basePath) || '/';

function toggleContent(el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function goBack() {
  const p = basePath.split('/').slice(0, -1).join('/');
  window.location.href = origin + (p || '/');
}

// Cache para fetch de thumbnails: guarda promesas para evitar llamadas duplicadas
const thumbnailsCache = {};

const io = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;

    if (t.classList.contains('thumb')) {
      const folder = t.dataset.folder;
      // Si no existe promesa, lanzarla
      if (!thumbnailsCache[folder]) {
        thumbnailsCache[folder] = fetch(origin + folder, { headers: { Accept: 'application/json' } })
          .then(r => r.json())
          .catch(() => []);
      }
      // Usar siempre la misma promesa
      thumbnailsCache[folder].then(files => {
        const vid = t.dataset.video;
        const match = files.find(i => i.name.startsWith(vid));
        if (match) {
          t.src = origin + match.path;
          t.onload = () => t.classList.remove('loading');
        }
      });
      obs.unobserve(t);
    }

    else if (t.classList.contains('folder__poster-bg')) {
      t.style.backgroundImage = `url('${t.dataset.src}')`;
      const img = t.parentNode.querySelector('.folder__poster-image');
      img.onload = () => {
        img.style.display = 'block';
        t.classList.remove('loading');
      };
      img.src = img.dataset.src;
      obs.unobserve(t);
      obs.unobserve(img);
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
      obs.unobserve(t.parentNode.querySelector('.folder__poster-bg'));
    }
  });
}, { rootMargin: '200px' });

async function collectAndRender(dir, prefix, container) {
  const frag = document.createDocumentFragment();
  const folder = document.createElement('div');
  folder.className = 'folder is-loading';
  const hdr = document.createElement('div');
  hdr.className = 'folder__header';
  hdr.textContent = dir.name;
  folder.append(hdr);

  const cont = document.createElement('div');
  cont.className = 'folder__content';
  cont.style.display = 'none';
  folder.append(cont);

  folder.addEventListener('click', e => {
    if (!e.target.closest('.card')) toggleContent(cont);
    e.stopPropagation();
  });

  let items;
  try {
    const resp = await fetch(origin + dir.path + '/', { headers: { Accept: 'application/json' } });
    items = await resp.json();
  } catch {
    return;
  }

  // Omitir carpetas .thumbnails
  const subs = items.filter(i => i.type === 'directory' && i.name !== '.thumbnails');
  const vids = items.filter(i => i.type === 'video');
  const photos = items.filter(i => i.type === 'photo');
  const descF = items.find(i => i.type === 'text' && i.name === 'description.txt');

  if (photos.length || descF) {
    const dw = document.createElement('div'); dw.className = 'folder__description';
    const di = document.createElement('div'); di.className = 'folder__desc-inner';
    if (photos.length) {
      const pc = document.createElement('div'); pc.className = 'folder__poster-container';
      const bg = document.createElement('div'); bg.className = 'folder__poster-bg loading';
      bg.dataset.src = origin + photos[0].path;
      io.observe(bg);
      pc.append(bg);
      const img = document.createElement('img');
      img.className = 'folder__poster-image';
      img.dataset.src = origin + photos[0].path;
      img.alt = 'Poster'; img.style.display = 'none';
      pc.append(img);
      io.observe(img);
      di.append(pc);
    }
    if (descF) {
      const dt = document.createElement('div'); dt.className = 'desc-text';
      fetch(origin + descF.path).then(r => r.text()).then(t => dt.textContent = t);
      di.append(dt);
    }
    dw.append(di);
    folder.insertBefore(dw, cont);
  }

  if (vids.length) {
    const grid = document.createElement('div'); grid.className = 'grid';
    vids.forEach(v => {
      const card = document.createElement('div'); card.className = 'card';
      card.onclick = e => { e.stopPropagation(); window.open(origin + v.path, '_blank'); };
      const thImg = document.createElement('img');
      thImg.className = 'thumb loading';
      thImg.dataset.video = v.name;
      thImg.dataset.folder = v.path.substring(0, v.path.lastIndexOf('/')) + '/.thumbnails/';
      thImg.alt = v.name;
      io.observe(thImg);
      const info = document.createElement('div'); info.className = 'info';
      const title = document.createElement('div'); title.className = 'title';
      title.textContent = v.name.replace(/\.[^/.]+$/, '');
      info.appendChild(title);
      card.append(thImg, info);
      grid.appendChild(card);
    });
    cont.append(grid);
  }

  if (subs.length) {
    subs.sort((a, b) => a.name.localeCompare(b.name));
    for (const s of subs) {
      await collectAndRender(s, prefix + dir.name + '/', cont);
    }
  }

  if (!cont.childElementCount) return;
  folder.classList.remove('is-loading');
  frag.append(folder);
  container.append(frag);
}

async function renderAll() {
  const ctr = document.getElementById('container');
  const resp = await fetch(origin + basePath + '/', { headers: { Accept: 'application/json' } });
  const all = await resp.json();
  const rootV = all.filter(i => i.type === 'video');
  if (rootV.length) await collectAndRender({ name: '.', path: basePath }, '', ctr);
  const dirs = all.filter(i => i.type === 'directory' && i.name !== '.thumbnails')
                  .sort((a, b) => a.name.localeCompare(b.name));
  for (const d of dirs) {
    await collectAndRender(d, '', ctr);
  }
}

renderAll();
