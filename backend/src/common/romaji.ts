import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let kuroshiroPromise: Promise<any> | null = null;

function getKuroshiro(): Promise<any> {
  if (!kuroshiroPromise) {
    kuroshiroPromise = (async () => {
      const kuroshiro = new (Kuroshiro as any)();
      await kuroshiro.init(new (KuromojiAnalyzer as any)());
      return kuroshiro;
    })();
  }
  return kuroshiroPromise;
}

// Converts Japanese text (kanji/kana) to romaji. Falls back to the
// original text if conversion fails (e.g. dictionary failed to load).
export async function toRomaji(text: string): Promise<string> {
  try {
    const kuroshiro = await getKuroshiro();
    return await kuroshiro.convert(text, {
      to: 'romaji',
      mode: 'spaced',
      romajiSystem: 'hepburn',
    });
  } catch {
    return text;
  }
}
