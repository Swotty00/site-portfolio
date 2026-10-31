import { memo, type ElementType } from 'react'

const CJK = new RegExp('[\u3000-\u9fff\uf900-\ufaff\uff00-\uffef]')

function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
  }
  return Array.from(text)
}

interface Props {
  text: string
  as?: ElementType
  className?: string
}

/**
 * Splits text into words → characters for GSAP stagger animations. Each character is a
 * `[data-char]` span inside an overflow-clipped word, so it can slide up from a mask.
 * The visible spans are aria-hidden; the wrapper carries the real text for assistive tech.
 */
export const SplitText = memo(function SplitText({ text, as: Tag = 'span', className }: Props) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, wi) => {
        const unbreakable = !CJK.test(word)
        return (
          <span
            key={`${word}-${wi}`}
            aria-hidden="true"
            className={`inline-block align-bottom ${unbreakable ? 'whitespace-nowrap' : ''}`}
            // Headroom above and below so accents (À, É, Ç) and descenders aren't clipped by the mask.
            style={{ overflow: 'clip', padding: '0.26em 0 0.14em', margin: '-0.26em 0 -0.14em' }}
          >
            {graphemes(word).map((char, ci) => (
              <span key={ci} data-char="" className="inline-block will-change-transform">
                {char}
              </span>
            ))}
            {wi < words.length - 1 && unbreakable ? ' ' : ''}
          </span>
        )
      })}
    </Tag>
  )
})
