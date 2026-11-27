declare module 'word-extractor' {
  interface WordDocument {
    getBody(): string;
    getHeaders?(options?: { includeFooters?: boolean }): string;
    getFootnotes?(): string;
    getEndnotes?(): string;
  }
  export default class WordExtractor {
    extract(filePath: string | Buffer): Promise<WordDocument>;
  }
}
