// Cover letter template (SPEC §9.2): same header, date (en-AU), recipient, "Re:", greeting, four paragraphs, sign-off.
#import "/common.typ": *
#show: setup
#header()

#let r = d.document.at("recipient", default: (name: "Hiring Manager", company: "", location: ""))
#v(1.4em)
#block(below: 1.2em, d.date)
#block(below: 1.2em, (r.name, r.company, r.location).filter(x => x != "").join(linebreak()))
#block(below: 1em, strong[Re: #d.brief.title])
#block(below: 1em)[Dear #r.name,]
#for s in d.document.sections.filter(s => not s.hidden) {
  mark("s", s.id)
  block(below: 0.9em, par(s.text))
  mark("e", s.id)
}
#v(0.4em)
Kind regards,\
#strong(c.name)

#page-count()
#layout()
