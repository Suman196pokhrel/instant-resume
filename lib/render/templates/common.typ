// Shared page setup and header (SPEC §9.2). Data comes from the virtual file /data.json.
#let d = json("/data.json")
#let t = d.document.theme
#let c = d.kb.contact
#let accent = rgb(t.accent)
#let ink = rgb("#111111")
#let muted = rgb("#555555")

// Spacing mirrors the mock's CSS (mock/styles.css .doc-*). CSS stacks line boxes (line height × size); Typst stacks
// frames from cap height to baseline. So a CSS margin m between two lines becomes, baseline to cap height:
// under(prev) + m + over(next). The constants are Arimo's ascender, descender and cap height (0.905, 0.212, 0.716).
#let B = t.baseSize * 1pt
#let H = t.headingSize * 1pt
#let N = t.nameSize * 1pt
#let C = 0.92 * B // the contact and work rights lines
#let lh = t.lineHeight
#let under(size, l: lh) = (l / 2 - 0.3465) * size // a CSS line box's bottom, below the baseline
#let over(size, l: lh) = (l / 2 - 0.3695) * size // a CSS line box's top, above the cap height
#let gap(prev, next, m, l: lh) = under(prev, l: l) + m + over(next)
#let lead = under(B) + over(B) // one CSS line height between baselines

#let setup(body) = {
  set document(title: c.name, author: c.name)
  set page(paper: if d.paper == "Letter" { "us-letter" } else { "a4" }, margin: t.margin * 1mm)
  set text(font: t.font, size: B, fill: ink, lang: "en", region: if d.spelling == "en-AU" { "AU" } else { "US" })
  set par(leading: lead, spacing: lead, justify: false) // CSS paragraphs have no margin of their own
  body
}

// Name, contact line and (resume, en-AU only) the work rights line. Contact details stay in the body, never a page header.
#let header(work-rights: true) = {
  let rights = d.kb.at("workRights", default: none)
  let has-rights = work-rights and d.spelling == "en-AU" and rights != none
  set par(leading: under(C) + over(C))
  block(below: gap(N, C, 0.25 * N, l: 1.1), text(size: N, weight: "bold", c.name)) // .doc-name: line height 1.1, margin .25em
  let parts = ("location", "phone", "email", "linkedin", "github").map(k => c.at(k, default: "")).filter(p => p != "")
  block(below: if has-rights { gap(C, C, 0.15 * C) } else { 0pt }, text(size: C, fill: rgb("#444444"), parts.join(h(0.5em) + text(fill: rgb("#aaaaaa"), "|") + h(0.5em))))
  if has-rights { block(below: 0pt, text(size: C, fill: rgb("#444444"), rights.status)) }
}

// Read back by the worker (world.query "<pages>") so it knows the page count without parsing the PDF.
#let page-count() = context [#metadata(counter(page).final().first()) <pages>]

// Preview layout (SPEC §9.1): invisible marks where each section and bullet starts and ends. The worker reads
// them back (world.query "<ir-layout>") to outline sections and show bullet sources over the SVG.
#let mark(k, id) = [#metadata((k: k, id: id)) <ir>]
#let layout() = context [#metadata((
  w: page.width.pt(),
  h: page.height.pt(),
  marks: query(<ir>).map(m => { let p = m.location().position(); (k: m.value.k, id: m.value.id, page: p.page, x: p.x.pt(), y: p.y.pt()) }),
)) <ir-layout>]
