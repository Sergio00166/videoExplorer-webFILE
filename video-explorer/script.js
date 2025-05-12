/* Code by Sergio00166 */

const { origin, pathname } = window.location;
const segs = pathname.split('/');
if (!segs.pop().includes('.')) segs.push('');
const basePath = segs.join('/');
document.getElementById('folder-name').textContent = "Videos @ "+decodeURIComponent(basePath) || '/';

const thumbnailsCache = {};
function toggleContent(el){ el.style.display = el.style.display==='none'?'block':'none'; }
function goBack(){
  const p = basePath.split('/').slice(0,-1).join('/');
  window.location.href = origin + (p||'/');
}

const io = new IntersectionObserver((entries, obs)=>{
  entries.forEach(e=>{
    if (!e.isIntersecting) return;
    const t = e.target;
    if (t.classList.contains('thumb')) {
      const f = t.dataset.folder;
      if (thumbnailsCache[f]) {
        applyThumb(t, thumbnailsCache[f]);
      } else {
        fetch(origin+f,{headers:{Accept:'application/json'}})
          .then(r=>r.json()).then(arr=>{
            thumbnailsCache[f]=arr;
            applyThumb(t,arr);
          })
          .catch(() => {});
      }
      obs.unobserve(t);
    }
    else if (t.classList.contains('folder__poster-bg')) {
      t.style.backgroundImage = `url('${t.dataset.src}')`;
      t.classList.remove('loading');
      const img = t.parentNode.querySelector('.folder__poster-image');
      img.onload = () => {
        img.style.display = 'block';
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
},{rootMargin:'200px'});

function applyThumb(el, arr){
  const vid = el.dataset.video;
  const m = arr.find(i=>i.name.startsWith(vid));
  if (m) el.style.backgroundImage = `url('${origin+m.path}')`;
  el.classList.remove('loading');
}

async function collectAndRender(dir, prefix, container) {
  const rel = prefix + dir.name + '/';
  const frag = document.createDocumentFragment();
  const folder = document.createElement('div');
  folder.className = 'folder is-loading';
  const hdr = document.createElement('div');
  hdr.className = 'folder__header';
  hdr.textContent = dir.name;
  folder.appendChild(hdr);
  const cont = document.createElement('div');
  cont.className = 'folder__content';
  cont.style.display='none';
  folder.appendChild(cont);
  folder.addEventListener('click',e=>{
    if(!e.target.closest('.card')) toggleContent(cont);
    e.stopPropagation();
  });

  let items;
  try {
    const resp = await fetch(origin+dir.path+'/',{headers:{Accept:'application/json'}});
    items = await resp.json();
  } catch {
    return;
  }

  const subs = items.filter(i=>i.type==='directory');
  const vids = items.filter(i=>i.type==='video');
  const photos = items.filter(i=>i.type==='photo');
  const descF = items.find(i=>i.type==='text'&&i.name==='description.txt');

  if (photos.length||descF){
    const dw = document.createElement('div');
    dw.className='folder__description';
    const di = document.createElement('div');
    di.className='folder__desc-inner';
    if (photos.length){
      const pc = document.createElement('div');
      pc.className='folder__poster-container';
      const bg = document.createElement('div');
      bg.className='folder__poster-bg loading';
      bg.dataset.src = origin + photos[0].path;
      io.observe(bg);
      pc.appendChild(bg);
      const img = document.createElement('img');
      img.className='folder__poster-image';
      img.dataset.src = origin + photos[0].path;
      img.alt = 'Poster';
      img.style.display = 'none';
      pc.appendChild(img);
      io.observe(img);
      di.appendChild(pc);
    }
    if (descF){
      const dt = document.createElement('div');
      dt.className='desc-text';
      fetch(origin+descF.path).then(r=>r.text()).then(t=>dt.textContent=t);
      di.appendChild(dt);
    }
    dw.appendChild(di);
    folder.insertBefore(dw, cont);
  }

  if (vids.length){
    const grid = document.createElement('div');
    grid.className='grid';
    vids.forEach(v=>{
      const card = document.createElement('div');
      card.className='card';
      card.onclick = e=>{e.stopPropagation();window.open(origin+v.path,'_blank');};
      const th = document.createElement('div');
      th.className='thumb loading';
      th.dataset.video = v.name;
      th.dataset.folder = v.path.substring(0,v.path.lastIndexOf('/'))+'/.thumbnails/';
      io.observe(th);
      const info = document.createElement('div');
      info.className='info';
      const title = document.createElement('div');
      title.className='title';
      title.textContent = v.name.replace(/\.[^/.]+$/,'');
      info.appendChild(title);
      card.append(th, info);
      grid.appendChild(card);
    });
    cont.appendChild(grid);
  }

  if(subs.length){
    subs.sort((a,b)=>a.name.localeCompare(b.name));
    for (const s of subs) {
      await collectAndRender(s,prefix+dir.name+'/',cont);
    }
  }

  if(cont.childElementCount===0) return;
  folder.classList.remove('is-loading');
  frag.appendChild(folder);
  container.appendChild(frag);
}

async function renderAll(){
  const ctr = document.getElementById('container');
  const resp = await fetch(origin+basePath+'/',{headers:{Accept:'application/json'}});
  const all = await resp.json();
  const rootV = all.filter(i=>i.type==='video');
  if(rootV.length) await collectAndRender({name:'.',path:basePath},'',ctr);
  const dirs = all.filter(i=>i.type==='directory')
                  .sort((a,b)=>a.name.localeCompare(b.name));
  for (const d of dirs) {
    await collectAndRender(d,'',ctr);
  }
}

renderAll();

