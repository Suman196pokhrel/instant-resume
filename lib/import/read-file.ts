// Reads a resume file into text on this device (SPEC §14.1a). PDF and Word parsers load only when needed.

const MAX_BYTES = 10 * 1024 * 1024;
const UNREADABLE = "Could not read the file. Try another file or paste its text.";
export const SCANNED = "This PDF has no selectable text, so it looks like a scan. Export it again as a text PDF, or paste the text.";

/** True when a PDF's text is too thin to be a real text layer (a scan or an image-only export). */
export const looksScanned = (text: string) => text.replace(/\s/g, "").length < 50;

async function pdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
  const task = pdfjs.getDocument({ data });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const { items } = await (await doc.getPage(i)).getTextContent();
      pages.push(items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join(""));
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}

async function docxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  return (await mammoth.extractRawText({ arrayBuffer })).value;
}

export async function readResumeFile(f: File): Promise<{ text: string } | { error: string }> {
  const kind = f.name.match(/\.(pdf|docx|txt)$/i)?.[1].toLowerCase();
  if (!kind) return { error: "Choose a PDF, DOCX or TXT file." };
  if (f.size > MAX_BYTES) return { error: "This file is larger than 10 MB. Choose a smaller file or paste the text." };
  if (!f.size) return { error: "This file is empty. Choose another file or paste the text." };
  try {
    if (kind === "txt") return { text: await f.text() };
    if (kind === "docx") {
      const text = await docxText(await f.arrayBuffer());
      return text.trim() ? { text } : { error: "This file is empty. Choose another file or paste the text." };
    }
    const text = await pdfText(await f.arrayBuffer());
    return looksScanned(text) ? { error: SCANNED } : { text };
  } catch (e) {
    if ((e as Error)?.name === "PasswordException") return { error: "This PDF is password-protected. Remove the password, or paste the text." };
    return { error: UNREADABLE };
  }
}
