// Resume template (SPEC §9.2): single column, no tables, images or columns; selectable text in reading order.
#import "/common.typ": *
#show: setup
#header()

#let section-heading(title) = block(above: t.sectionGap * 1pt, below: 0.5em, sticky: true, {
  text(size: t.headingSize * 1pt, weight: "bold", fill: accent, title)
  v(-0.55em)
  line(length: 100%, stroke: 0.75pt + accent)
})

#set list(indent: 0.15em, body-indent: 0.6em, spacing: 0.12em + (t.lineHeight - 0.7) * 1em, marker: [•])

#let entry(it) = block(above: 0.7em, below: 0em, breakable: true, {
  [*#it.heading*]
  let meta = it.at("meta", default: "")
  if meta != "" [#h(1fr)#text(size: 0.92em, fill: muted, meta)]
  let sub = it.at("sub", default: "")
  if sub != "" [\ #emph(sub)]
  let detail = it.at("line", default: "")
  if detail != "" [\ #detail]
  let bullets = it.at("bullets", default: ())
  if bullets.len() > 0 { v(0.25em); list(..bullets.map(b => b.text)) }
})

#for s in d.document.sections.filter(s => not s.hidden) {
  section-heading(s.title)
  if s.kind in ("summary", "paragraph") {
    par(s.text)
  } else if s.kind == "skills" {
    for it in s.items { block(above: 0.35em, below: 0em)[*#it.heading:* #it.at("line", default: "")] }
  } else {
    for it in s.items { entry(it) }
  }
}

#page-count()
