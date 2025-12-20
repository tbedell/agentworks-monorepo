import html2canvas from 'html2canvas';

export interface SnapshotOptions {
  download?: boolean;
  filename?: string;
}

export interface SnapshotResult {
  dataUrl: string;
  blob: Blob;
}

export async function captureSnapshot(
  element: HTMLElement,
  options: SnapshotOptions = {}
): Promise<SnapshotResult> {
  const { download = false, filename = 'snapshot' } = options;

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });

  if (download) {
    downloadSnapshot(dataUrl, filename);
  }

  return { dataUrl, blob };
}

export function downloadSnapshot(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = `${filename}-${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function captureCanvasElement(
  selector: string,
  options: SnapshotOptions = {}
): Promise<SnapshotResult | null> {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) {
    console.error(`Element not found: ${selector}`);
    return null;
  }
  return captureSnapshot(element, options);
}

/**
 * Capture HTML content by rendering it to a temporary off-screen div.
 * This is necessary because html2canvas cannot capture iframe content due to
 * cross-origin restrictions. We create a temporary container, inject the HTML/CSS,
 * capture it, then clean up.
 */
export async function captureHTMLContent(
  html: string,
  css: string,
  width: number,
  height: number,
  options: SnapshotOptions = {}
): Promise<SnapshotResult> {
  // Create temporary container positioned off-screen
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    background: white;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
  `;

  // Inject content with scoped styles and CSS reset
  container.innerHTML = `
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      ${css}
    </style>
    ${html}
  `;

  document.body.appendChild(container);

  try {
    // Wait a frame for styles to apply
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = await captureSnapshot(container, options);
    return result;
  } finally {
    document.body.removeChild(container);
  }
}
