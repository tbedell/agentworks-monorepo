import { useMemo } from 'react';
import { FileCode, Layout, Palette } from 'lucide-react';

interface WordPressTheme {
  name: string;
  version?: string;
  templates?: {
    header?: string;
    index?: string;
    footer?: string;
    single?: string;
    page?: string;
    archive?: string;
    sidebar?: string;
  };
  themeJson?: {
    settings?: {
      color?: {
        palette?: Array<{ slug: string; color: string; name: string }>;
      };
      typography?: {
        fontFamilies?: Array<{ slug: string; name: string; fontFamily: string }>;
        fontSizes?: Array<{ slug: string; size: string; name: string }>;
      };
    };
    styles?: {
      color?: { background?: string; text?: string };
    };
  };
  blocks?: Array<{
    name: string;
    title: string;
    category: string;
    icon?: string;
    description?: string;
    attributes?: Record<string, any>;
  }>;
}

interface CMSPreviewProps {
  type: string;
  theme: WordPressTheme;
  className?: string;
}

/**
 * CMSPreview renders CMS-specific mockups.
 * Currently supports WordPress themes with theme.json and templates.
 */
export function CMSPreview({ type, theme, className = '' }: CMSPreviewProps) {
  if (type !== 'wordpress') {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Unsupported CMS type: {type}</p>
        </div>
      </div>
    );
  }

  return <WordPressThemePreview theme={theme} className={className} />;
}

interface WordPressThemePreviewProps {
  theme: WordPressTheme;
  className?: string;
}

function WordPressThemePreview({ theme, className = '' }: WordPressThemePreviewProps) {
  // Extract theme.json styles
  const styles = useMemo(() => {
    const themeJson = theme.themeJson;
    if (!themeJson?.styles) return {};

    return {
      background: themeJson.styles.color?.background || '#ffffff',
      text: themeJson.styles.color?.text || '#1e1e1e',
    };
  }, [theme.themeJson]);

  // Extract color palette
  const colorPalette = theme.themeJson?.settings?.color?.palette || [];

  return (
    <div className={`flex flex-col h-full overflow-auto ${className}`}>
      {/* Theme Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-3">
          <Layout className="h-6 w-6" />
          <div>
            <h2 className="font-semibold">{theme.name || 'WordPress Theme'}</h2>
            {theme.version && (
              <span className="text-xs text-blue-200">Version {theme.version}</span>
            )}
          </div>
        </div>
      </div>

      {/* Color Palette */}
      {colorPalette.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Color Palette</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorPalette.map((color) => (
              <div
                key={color.slug}
                className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg"
                title={color.name}
              >
                <div
                  className="w-5 h-5 rounded border border-gray-200"
                  style={{ backgroundColor: color.color }}
                />
                <span className="text-xs text-gray-600">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Previews */}
      <div className="flex-1 p-4 space-y-4">
        {/* Header Template */}
        {theme.templates?.header && (
          <TemplateSection title="Header Template" content={theme.templates.header} styles={styles} />
        )}

        {/* Index Template */}
        {theme.templates?.index && (
          <TemplateSection title="Index Template" content={theme.templates.index} styles={styles} />
        )}

        {/* Page Template */}
        {theme.templates?.page && (
          <TemplateSection title="Page Template" content={theme.templates.page} styles={styles} />
        )}

        {/* Single Post Template */}
        {theme.templates?.single && (
          <TemplateSection title="Single Post Template" content={theme.templates.single} styles={styles} />
        )}

        {/* Archive Template */}
        {theme.templates?.archive && (
          <TemplateSection title="Archive Template" content={theme.templates.archive} styles={styles} />
        )}

        {/* Sidebar Template */}
        {theme.templates?.sidebar && (
          <TemplateSection title="Sidebar Template" content={theme.templates.sidebar} styles={styles} />
        )}

        {/* Footer Template */}
        {theme.templates?.footer && (
          <TemplateSection title="Footer Template" content={theme.templates.footer} styles={styles} />
        )}

        {/* Gutenberg Blocks */}
        {theme.blocks && theme.blocks.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Custom Gutenberg Blocks ({theme.blocks.length})
                </span>
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="grid grid-cols-2 gap-3">
                {theme.blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="font-medium text-sm text-gray-900">{block.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{block.category}</div>
                    {block.description && (
                      <div className="text-xs text-gray-600 mt-2">{block.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!theme.templates?.header &&
         !theme.templates?.index &&
         !theme.templates?.footer &&
         (!theme.blocks || theme.blocks.length === 0) && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Layout className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No templates or blocks defined</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateSectionProps {
  title: string;
  content: string;
  styles?: { background?: string; text?: string };
}

function TemplateSection({ title, content, styles }: TemplateSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600">{title}</span>
      </div>
      <div
        className="p-4"
        style={{
          backgroundColor: styles?.background || '#ffffff',
          color: styles?.text || '#1e1e1e',
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

export default CMSPreview;
