#!/usr/bin/env python3
"""Render docs/MVP_OVERVIEW.md to the tracked overview PDF.

Requires Python 3 and ReportLab (pip install reportlab==4.5.1).
Supports the overview's headings, paragraphs, bullets and explicit page breaks.
Uses standard PDF fonts, with no network access or external assets.
"""
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/MVP_OVERVIEW.md'
OUTPUT = ROOT / 'docs/Resume Tailor MVP Overview.pdf'
INK = colors.HexColor('#172C28')
MUTED = colors.HexColor('#53635F')
ACCENT = colors.HexColor('#0E7466')
STYLES = {
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=23,
                            leading=28, textColor=INK, spaceAfter=16, keepWithNext=True),
    'heading': ParagraphStyle('heading', fontName='Helvetica-Bold', fontSize=12,
                              leading=16, textColor=ACCENT, spaceBefore=11,
                              spaceAfter=6, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10,
                           leading=14, textColor=INK, spaceAfter=8, alignment=TA_LEFT),
    'bullet': ParagraphStyle('bullet', fontName='Helvetica', fontSize=10,
                             leading=14, textColor=INK, leftIndent=12,
                             firstLineIndent=0, bulletIndent=0, spaceAfter=6),
}


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D4DFDA'))
    canvas.line(20 * mm, 19 * mm, A4[0] - 20 * mm, 19 * mm)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 13 * mm, 'Resume Tailor | MVP Overview | 8 November 2026')
    canvas.drawRightString(A4[0] - 20 * mm, 13 * mm, f'Page {doc.page}')
    canvas.restoreState()


def build():
    story = []
    blocks = SOURCE.read_text(encoding='utf-8').strip().split('\n\n')
    for block in blocks:
        if block == '<!-- pagebreak -->':
            story.append(PageBreak())
        elif block.startswith('# '):
            story.append(Spacer(1, 4 * mm))
            story.append(Paragraph(escape(block[2:]), STYLES['title']))
        elif block.startswith('## '):
            story.append(Paragraph(escape(block[3:]), STYLES['heading']))
        elif block.startswith('- '):
            for line in block.splitlines():
                if not line.startswith('- '):
                    raise ValueError(f'Unsupported bullet continuation: {line}')
                story.append(Paragraph(escape(line[2:]), STYLES['bullet'], bulletText='\u2022'))
        else:
            story.append(Paragraph(escape(block.replace('\n', ' ')), STYLES['body']))
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=20 * mm,
                            leftMargin=20 * mm, topMargin=15 * mm,
                            bottomMargin=25 * mm, title='Resume Tailor: MVP Overview',
                            author='Suman Pokhrel', subject='Local BYOK app and simulated Vercel demo',
                            invariant=1)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT.relative_to(ROOT))


if __name__ == '__main__':
    build()
