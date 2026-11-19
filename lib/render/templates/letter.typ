// Cover letter template (SPEC §9.2): same header, date (en-AU), recipient, "Re:", greeting, four paragraphs, sign-off.
// Spacing mirrors the mock (.letter-meta: margin-top 1.4 × section gap, .9em between; .doc-para: .9em; .letter-sign: 1.4em).
#import "/common.typ": *
#show: setup
#header(work-rights: false) // SPEC §9.2: name and contact line only

#let r = d.document.at("recipient", default: (name: "Hiring Manager", company: "", location: ""))
#let meta = gap(B, B, 0.9em)
#block(above: gap(C, B, 1.4 * t.sectionGap * 1pt), below: meta, d.date)
#block(below: meta, (r.name, r.company, r.location).filter(x => x != "").join(linebreak()))
#block(below: meta, strong[Re: #d.brief.title])
#block(below: 0pt)[Dear #r.name,]
#for s in d.document.sections.filter(s => not s.hidden) {
  block(above: meta, below: 0pt, [#mark("s", s.id)#s.text])
  mark("e", s.id) // between blocks, like the resume's: on the next block's cap height
}
#block(above: gap(B, B, 1.4em))[Kind regards,\ \ #strong(c.name)]

#page-count()
#layout()
