import { useRef, useEffect } from 'react';

interface HTMLPreviewProps {
  html: string;
  css: string;
  className?: string;
}

/**
 * HTMLPreview renders raw HTML/CSS in a sandboxed iframe.
 * Used for agent-generated HTML mockups.
 */
export function HTMLPreview({ html, css, className = '' }: HTMLPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                /* Reset styles */
                *, *::before, *::after {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.5;
                }
                /* Custom styles */
                ${css}
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html, css]);

  return (
    <iframe
      ref={iframeRef}
      className={`w-full h-full border-0 ${className}`}
      sandbox="allow-scripts allow-same-origin"
      title="HTML Preview"
    />
  );
}

export default HTMLPreview;
