/* Code by Sergio00166 */

const { origin, pathname } = window.location, segs = pathname.split("/");
segs.pop().includes(".") || segs.push("");
const basePath = segs.join("/") + "/";
document.getElementById("folder-name").textContent = "Videos @ " + decodeURIComponent(basePath) || "/";


function fullUrlWithCache(a) {
    return a + "?cache"
}
function toggleContent(a) {
    a.style.display = "none" === a.style.display ? "block" : "none"
}
function goBack() {
    const a = basePath.split("/").slice(0, -2).join("/") + "/";
    window.location.href = a
}

const thumbnailsCache = {},
    io = new IntersectionObserver(onIntersection, {
        rootMargin: "200px"
    });

function onIntersection(a, b) {
    a.forEach(a => {
        if (!a.isIntersecting) return;
        const c = a.target;
        if (c.classList.contains("thumb")) {
            const folder = c.closest('.grid').dataset.folder;
            thumbnailsCache[folder] ||= fetch(folder, {
                headers: {
                    Accept: "application/json"
                }
            }).then(res => res.json()).catch(() => []);
            thumbnailsCache[folder].then(list => {
                const item = list.find(x => x.name.startsWith(c.dataset.video));
                if (item) {
                    c.src = fullUrlWithCache(item.path);
                    c.onload = () => c.classList.remove("loading");
                }
            });
            b.unobserve(c);
        } else if (c.classList.contains("folder__poster-bg")) {
            c.style.backgroundImage = `url('${c.dataset.src}')`;
            const a = c.parentNode.querySelector(".folder__poster-image");
            a.onload = () => {
                a.style.display = "block", c.classList.remove("loading")
            }, a.src = a.dataset.src, b.unobserve(c)
        } else if (c.classList.contains("folder__poster-image")) {
            c.onload = () => {
                c.style.display = "block";
                const a = c.parentNode.querySelector(".folder__poster-bg");
                a.style.backgroundImage = `url('${a.dataset.src}')`, a.classList.remove("loading")
            };
            c.src = c.dataset.src;
            b.unobserve(c);
        }
    })
}

async function collectAndRender(a, b, c) {
    const d = document.createDocumentFragment(),
        e = document.createElement("div");
    e.className = "folder is-loading";
    const f = document.createElement("div");
    f.className = "folder__header", f.textContent = a.name, e.append(f);
    const g = document.createElement("div");
    g.className = "folder__content", g.style.display = "none", e.append(g), e.addEventListener("click", a => {
        a.target.closest(".card") || toggleContent(g), a.stopPropagation()
    });
    let h;
    try {
        h = await fetch(a.path, {
            headers: {
                Accept: "application/json"
            }
        }).then(a => a.json())
    } catch {
        return
    }
    const i = h.filter(a => "photo" === a.type),
        j = h.find(a => "text" === a.type && "description.txt" === a.name);
    if (i.length || j) {
        const a = document.createElement("div");
        a.className = "folder__description";
        const b = document.createElement("div");
        b.className = "folder__desc-inner";
        if (i.length) {
            const a = document.createElement("div");
            a.className = "folder__poster-container";
            const c = document.createElement("div");
            c.className = "folder__poster-bg loading", c.dataset.src = fullUrlWithCache(i[0].path), a.append(c), io.observe(c);
            const d = document.createElement("img");
            d.className = "folder__poster-image", d.dataset.src = fullUrlWithCache(i[0].path), d.alt = "Poster", d.style.display = "none", a.append(d), io.observe(d), b.append(a)
        }
        if (j) {
            const a = document.createElement("div");
            a.className = "desc-text", fetch(fullUrlWithCache(j.path)).then(a => a.text()).then(b => a.textContent = b), b.append(a)
        }
        a.append(b), e.insertBefore(a, g)
    }
    const k = h.filter(a => "video" === a.type);
    if (k.length) {
        const b = document.createElement("div");
        b.className = "grid";
        b.dataset.folder = a.path + ".thumbnails/";
        k.forEach(c => {
            const d = document.createElement("div");
            d.className = "card", d.onclick = a => {
                a.stopPropagation(), window.open(c.path, "_blank")
            };
            const e = document.createElement("img");
            e.className = "thumb loading";
            e.dataset.video = c.name;
            e.alt = c.name;
            io.observe(e);
            const f = document.createElement("div");
            f.className = "info";
            const g = document.createElement("div");
            g.className = "title", g.textContent = c.name.replace(/\.[^/.]+$/, ""), f.append(g), d.append(e, f), b.append(d)
        });
        g.append(b);
    }
    const l = h.filter(a => "directory" === a.type && ".thumbnails" !== a.name);
    if (l.length) {
        let b = !1;
        const c = async () => {
            if (!b) {
                b = !0;
                const c = document.createElement("div");
                c.className = "subfolders";
                for (const b of l) await collectAndRender({
                    name: b.name,
                    path: a.path + b.name + "/"
                }, "", c);
                g.appendChild(c)
            }
        }, d = new IntersectionObserver((a, b) => {
            a.forEach(a => {
                a.isIntersecting && (c(), b.disconnect())
            })
        }, {
            rootMargin: "200px"
        });
        d.observe(g)
    }
    e.classList.remove("is-loading"), d.append(e), c.append(d)
}

async function renderAll() {
    const a = document.getElementById("container"),
        b = await fetch(basePath, {
            headers: {
                Accept: "application/json"
            }
        }).then(a => a.json()),
        c = b.filter(a => "video" === a.type);
    c.length && (await collectAndRender({
        name: ".",
        path: basePath
    }, "", a));
    const e = b.filter(a => "directory" === a.type && ".thumbnails" !== a.name).sort((c, a) => c.name.localeCompare(a.name));
    for (const b of e) await collectAndRender({
        name: b.name,
        path: basePath + b.name + "/"
    }, "", a)
}
renderAll();
