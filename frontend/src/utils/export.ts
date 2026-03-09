import { toPng } from 'html-to-image'

/**
 * Export the React Flow canvas as a PNG and trigger a browser download.
 * Pass the `.react-flow` wrapper element.
 */
export async function exportToPng(element: HTMLElement): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#0d1117',
    style: {
      // Exclude controls from the export
      '--xy-controls-display': 'none',
    } as Partial<CSSStyleDeclaration>,
  })

  const link = document.createElement('a')
  link.download = 'homelable-canvas.png'
  link.href = dataUrl
  link.click()
}
