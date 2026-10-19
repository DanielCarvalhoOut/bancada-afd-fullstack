import type { PageInk } from './pdf-ink.service';

/** Converte um ponto da página (unidades do viewport em escala 1) para o espaço do PDF. */
export type ToPdfPoint = (page: number, x: number, y: number) => [number, number];

/** '#1d4ed8' → [r, g, b] em 0..1, como o operador RG do PDF espera. */
function rgbOf(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

/** 'Lista-GLC-LFA.pdf' → 'Lista-GLC-LFA-anotado.pdf' */
export function annotatedFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '') || 'documento';
  return `${base}-anotado.pdf`;
}

/**
 * Devolve uma cópia do PDF com os traços da caneta gravados como linhas
 * vetoriais no conteúdo de cada página (aparecem em qualquer leitor e na
 * impressão). O pdf-lib só é baixado aqui, quando alguém exporta.
 */
export async function pdfWithInk(bytes: Uint8Array, ink: PageInk, toPdf: ToPdfPoint): Promise<Uint8Array> {
  const {
    PDFDocument, LineCapStyle, LineJoinStyle,
    pushGraphicsState, popGraphicsState, setLineWidth, setLineCap, setLineJoin,
    setStrokingRgbColor, moveTo, lineTo, stroke,
  } = await import('pdf-lib');

  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();

  for (const [key, strokes] of Object.entries(ink)) {
    const n = Number(key);
    if (!strokes?.length || !Number.isInteger(n) || n < 1 || n > total) continue;
    const page = doc.getPage(n - 1);

    // O conteúdo original pode terminar com a matriz de transformação alterada
    // (cm sem Q). Embrulhá-lo em q … Q garante que os traços usem o sistema de
    // coordenadas padrão da página.
    page.node.normalize();
    const start = doc.context.register(doc.context.contentStream([pushGraphicsState()]));
    const end = doc.context.register(doc.context.contentStream([popGraphicsState()]));
    page.node.wrapContentStreams(start, end);

    const ops = [pushGraphicsState(), setLineCap(LineCapStyle.Round), setLineJoin(LineJoinStyle.Round)];
    for (const s of strokes) {
      const p = s.pts;
      if (p.length < 2) continue;
      const [r, g, b] = rgbOf(s.color);
      ops.push(setStrokingRgbColor(r, g, b), setLineWidth(s.width));
      const [x0, y0] = toPdf(n, p[0], p[1]);
      ops.push(moveTo(x0, y0));
      // um toque só: segmento de comprimento zero, que com ponta redonda vira um ponto
      if (p.length === 2) ops.push(lineTo(x0, y0));
      for (let i = 2; i < p.length; i += 2) {
        const [x, y] = toPdf(n, p[i], p[i + 1]);
        ops.push(lineTo(x, y));
      }
      ops.push(stroke());
    }
    ops.push(popGraphicsState());
    page.pushOperators(...ops);
  }

  return doc.save();
}
