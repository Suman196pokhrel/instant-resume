// Shared page setup and header (SPEC §9.2). Data comes from the virtual file /data.json.
#let d = json("/data.json")
#let t = d.document.theme
#let c = d.kb.contact
#let accent = rgb(t.accent)
#let ink = rgb("#111111")
#let muted = rgb("#555555")

#let setup(body) = {
  set document(title: c.name, author: c.name)
  set page(paper: if d.paper == "Letter" { "us-letter" } else { "a4" }, margin: t.margin * 1mm)
  set text(font: t.font, size: t.baseSize * 1pt, fill: ink, lang: "en", region: if d.spelling == "en-AU" { "AU" } else { "US" })
  set par(leading: (t.lineHeight - 0.7) * 1em, spacing: (t.lineHeight - 0.7) * 1em + 0.3em, justify: false)
  body
}

// Name, contact line and (en-AU only) the work rights line. Contact details stay in the body, never a page header.
#let header() = {
  block(below: 0.45em, text(size: t.nameSize * 1pt, weight: "bold", c.name))
  let parts = ("location", "phone", "email", "linkedin", "github").map(k => c.at(k, default: "")).filter(p => p != "")
  block(below: 0.3em, text(size: 0.92em, fill: rgb("#444444"), parts.join(text(fill: rgb("#aaaaaa"), " | "))))
  let rights = d.kb.at("workRights", default: none)
  if d.spelling == "en-AU" and rights != none { block(below: 0em, text(size: 0.92em, fill: rgb("#444444"), rights.status)) }
}

// Read back by the worker (world.query "<pages>") so it knows the page count without parsing the PDF.
#let page-count() = context [#metadata(counter(page).final().first()) <pages>]
