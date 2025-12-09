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
