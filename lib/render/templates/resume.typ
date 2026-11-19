// Resume template (SPEC §9.2): single column, no tables, images or columns; selectable text in reading order.
#import "/common.typ": *
#show: setup
#header()

// .doc-section margin-top (section gap), .doc-h: padding-bottom .15em, a .75pt rule, margin-bottom .45em.
#let section-heading(id, title) = block(above: gap(B, H, t.sectionGap * 1pt), below: 0.45 * H + over(B), sticky: true, {
  // the mark shares the heading's line, so the outline starts at the heading, not the gap above it
  stack(spacing: under(H) + 0.15 * H, [#mark("s", id)#text(size: H, weight: "bold", fill: accent, title)], line(length: 100%, stroke: 0.75pt + accent))
})

#set list(indent: 0.15em, body-indent: 0.6em, spacing: lead + 0.12em, marker: [•]) // .entry li: margin .12em

// .entry: title and meta on one line, then sub and detail lines; .entry + .entry: margin-top .6em; ul margin-top .25em.
#let entry(it, first, title) = block(above: if first { 0pt } else { lead + 0.6em }, below: 0pt, breakable: true, {
  let lines = ()
  let head = if it.heading == title { "" } else { it.heading } // an Additional item's heading is its section's title
  let meta = it.at("meta", default: "")
  if head != "" or meta != "" { lines.push([#strong(head)#if meta != "" [#h(1fr)#text(size: 0.92em, fill: muted, meta)]]) }
  let sub = it.at("sub", default: "")
  if sub != "" { lines.push(text(fill: rgb("#333333"), emph(sub))) }
  let detail = it.at("line", default: "")
  if detail != "" { lines.push(text(fill: rgb("#333333"), detail)) }
  if lines.len() > 0 { lines.join(linebreak()) }
  let bullets = it.at("bullets", default: ())
  if bullets.len() > 0 { block(above: lead + 0.25em, below: 0pt, list(..bullets.map(b => [#mark("b", b.id)#b.text#mark("be", b.id)]))) }
})

#for s in d.document.sections.filter(s => not s.hidden) {
  section-heading(s.id, s.title)
  if s.kind in ("summary", "paragraph") {
    par(s.text)
  } else if s.kind == "skills" {
    for (i, it) in s.items.enumerate() { block(above: if i == 0 { 0pt } else { lead + 0.15em }, below: 0pt)[*#it.heading:* #it.at("line", default: "")] } // .skill-row + .skill-row: .15em
  } else {
    for (i, it) in s.items.enumerate() { entry(it, i == 0, s.title) }
  }
  mark("e", s.id)
}

#page-count()
#layout()
