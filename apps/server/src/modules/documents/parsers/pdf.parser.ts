import type { DocumentNode } from '@courseware/shared';
import type { DocumentParser, ParseResult } from './base.parser';
import { generateNodeId } from './base.parser';

/**
 * PDF 解析器：pdfjs-dist 提取文本层。
 * 文字版 PDF 直接提取；扫描版（文本层为空）返回标记，
 * 由上层决定是否走 File API 多模态理解（M4 后续接入）。
 */
export class PdfParser implements DocumentParser {
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    // pdfjs-dist 在 Node 环境使用 legacy 构建
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as string).catch(() => null);
    if (!pdfjs) {
      return {
        filename,
        extractedText: `[PDF：${filename}（pdfjs 加载失败）]`,
        structure: [
          { id: generateNodeId('pdf', 0), type: 'section', content: `PDF 文档：${filename}` },
        ],
      };
    }

    try {
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
      } as Parameters<typeof pdfjs.getDocument>[0]).promise;

      const structure: DocumentNode[] = [];
      const textParts: string[] = [];
      let nodeIndex = 0;

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        // 按 y 坐标聚合成行（PDF 文本项是无序的碎片）
        const lines = new Map<number, { x: number; str: string }[]>();
        for (const item of content.items as { str: string; transform: number[] }[]) {
          if (!item.str?.trim()) continue;
          const y = Math.round(item.transform[5]);
          const x = item.transform[4];
          const key = Math.round(y / 4) * 4; // 4px 容差聚行
          if (!lines.has(key)) lines.set(key, []);
          lines.get(key)!.push({ x, str: item.str });
        }
        const sortedY = [...lines.keys()].sort((a, b) => b - a); // PDF y 轴向上
        const pageText = sortedY
          .map((y) => lines.get(y)!.sort((a, b) => a.x - b.x).map((i) => i.str).join(''))
          .join('\n')
          .replace(/[ \t]+/g, ' ')
          .trim();

        if (pageText) {
          textParts.push(pageText);
          structure.push({
            id: generateNodeId('pdf', nodeIndex++),
            type: 'section',
            content: `第 ${pageNum} 页`,
            children: [
              {
                id: generateNodeId('pdfp', nodeIndex++),
                type: 'paragraph',
                content: pageText.slice(0, 2000),
              },
            ],
          } as DocumentNode);
        }
      }

      const extractedText = textParts.join('\n\n').trim();
      if (!extractedText) {
        // 扫描版 PDF：无文本层
        return {
          filename,
          extractedText: `[SCANNED_PDF：${filename}]（共 ${doc.numPages} 页，无文本层，需多模态理解）`,
          structure: [
            {
              id: generateNodeId('pdf', 0),
              type: 'section',
              content: `扫描版 PDF：${filename}，共 ${doc.numPages} 页`,
            },
          ],
        };
      }

      return { filename, extractedText, structure };
    } catch (err) {
      return {
        filename,
        extractedText: `[PDF 解析失败：${filename}] ${err instanceof Error ? err.message : String(err)}`,
        structure: [
          { id: generateNodeId('pdf', 0), type: 'section', content: `PDF 解析失败：${filename}` },
        ],
      };
    }
  }
}
