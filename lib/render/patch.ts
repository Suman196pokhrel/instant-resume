// Live preview patching (SPEC §9.1): a new Typst SVG is merged into the one on screen instead of replacing it, so only
// the lines an edit changed are restyled and laid out again (a full swap of the ~3,000 nodes costs ~80 ms at 4x CPU).
// Typst gives each group a content hash (data-tid) and each glyph or clip path an id. A node whose key is unchanged keeps
// its children (only its own attributes, such as where it sits, are updated). A changed one (its hash covers everything
// inside, so every group around an edit changes) is patched in place from an old node that has no match, so a one-word
// edit touches only the changed line and the groups that hold it.

const tid = (n: Node) => (n instanceof Element ? n.getAttribute("data-tid") : null);
const key = (n: Node) => (n instanceof Element ? (tid(n) ?? (n.id || null)) : null);

function patchAttributes(prev: Element, next: Element) {
  for (const a of [...prev.attributes]) if (!next.hasAttributeNS(a.namespaceURI, a.localName)) prev.removeAttributeNS(a.namespaceURI, a.localName);
  for (const a of [...next.attributes]) if (prev.getAttributeNS(a.namespaceURI, a.localName) !== a.value) prev.setAttributeNS(a.namespaceURI, a.name, a.value); // xlink:href keeps its namespace
}

/** Makes `prev` (on screen) match `next` (parsed, off screen), moving in only the nodes that changed. */
export function patchSvg(prev: Element, next: Element) {
  if (prev.nodeName !== next.nodeName) throw new Error("patchSvg: different roots");
  patchAttributes(prev, next);
  const olds = [...prev.childNodes];
  const news = [...next.childNodes];
  const wanted = new Set(news.map(key).filter(Boolean));
  const pool = new Map<string, Node[]>(); // old nodes the new render has again, by key
  const orphans: Node[] = []; // old nodes it doesn't: patched into the new nodes of the same type, in order
  for (const o of olds) {
    const k = key(o);
    if (k && wanted.has(k)) pool.set(k, [...(pool.get(k) ?? []), o]);
    else orphans.push(o);
  }
  const want = news.map((n) => {
    const k = key(n);
    const same = k ? pool.get(k)?.shift() : undefined;
    if (same instanceof Element && n instanceof Element) {
      if (tid(n)) patchAttributes(same, n); // a data-tid hashes the content, not the element's own transform
      else patchSvg(same, n); // an id names a glyph, not its content
      return same;
    }
    const i = orphans.findIndex((o) => o.nodeName === n.nodeName);
    if (i < 0) return n;
    const [old] = orphans.splice(i, 1);
    if (old instanceof Element && n instanceof Element) patchSvg(old, n);
    else if (old.nodeValue !== n.nodeValue) old.nodeValue = n.nodeValue;
    return old;
  });
  const keep = new Set(want);
  for (const o of olds) if (!keep.has(o)) o.remove();
  let at = prev.firstChild;
  for (const w of want) {
    if (w === at) at = at.nextSibling;
    else prev.insertBefore(w, at);
  }
}
