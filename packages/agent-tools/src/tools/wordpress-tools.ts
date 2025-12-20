/**
 * WordPress-Specific Tools
 *
 * Provides tools for WordPress development including:
 * - WP-CLI command execution
 * - Theme scaffolding (classic and block themes)
 * - Plugin scaffolding
 * - Gutenberg block scaffolding
 * - WordPress Coding Standards checking (PHPCS/WPCS)
 * - Deployment to WordPress hosting
 */

import { createLogger } from '@agentworks/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const execAsync = promisify(exec);
const logger = createLogger('agent-tools:wordpress-tools');

const MAX_OUTPUT_LENGTH = 10000;

interface ExecOptions {
  cwd: string;
  timeout?: number;
  maxBuffer?: number;
}

async function safeExec(
  command: string,
  options: ExecOptions
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      timeout: options.timeout || 60000,
      maxBuffer: options.maxBuffer || 1024 * 1024 * 5, // 5MB for WordPress operations
    });

    return {
      stdout: stdout.slice(0, MAX_OUTPUT_LENGTH),
      stderr: stderr.slice(0, MAX_OUTPUT_LENGTH),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (execError.stdout || '').slice(0, MAX_OUTPUT_LENGTH),
      stderr: (execError.stderr || '').slice(0, MAX_OUTPUT_LENGTH),
      exitCode: execError.code || 1,
    };
  }
}

// ============================================================================
// WP-CLI Tool
// ============================================================================

export const wpCliTool: AgentTool = {
  name: 'wp_cli',
  description:
    'Execute WP-CLI commands for WordPress management (plugin/theme operations, database, users, etc.)',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  parameters: [
    {
      name: 'command',
      type: 'string',
      description:
        'The WP-CLI command to execute (e.g., "plugin list", "theme activate twentytwentyfour", "db export")',
      required: true,
    },
    {
      name: 'wpPath',
      type: 'string',
      description: 'Path to WordPress installation. Defaults to project path.',
      required: false,
    },
    {
      name: 'format',
      type: 'string',
      description: 'Output format (json, table, csv, yaml). Defaults to json for parseable output.',
      required: false,
      enum: ['json', 'table', 'csv', 'yaml'],
      default: 'json',
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const command = args.command as string;
    const wpPath = (args.wpPath as string) || context.projectPath;
    const format = (args.format as string) || 'json';

    try {
      // Build the WP-CLI command
      let wpCommand = `wp ${command}`;

      // Add path if not in WordPress root
      if (wpPath !== process.cwd()) {
        wpCommand += ` --path="${wpPath}"`;
      }

      // Add format if command supports it
      if (
        !command.includes('--format') &&
        (command.startsWith('plugin') ||
          command.startsWith('theme') ||
          command.startsWith('user') ||
          command.startsWith('post') ||
          command.startsWith('option'))
      ) {
        wpCommand += ` --format=${format}`;
      }

      logger.info('Executing WP-CLI command', {
        projectId: context.projectId,
        command: wpCommand,
        agent: context.agentName,
      });

      const result = await safeExec(wpCommand, {
        cwd: wpPath,
        timeout: 120000,
      });

      const success = result.exitCode === 0;

      // Try to parse JSON output
      let parsedOutput: unknown = null;
      if (format === 'json' && result.stdout.trim()) {
        try {
          parsedOutput = JSON.parse(result.stdout);
        } catch {
          // Not JSON, use raw output
        }
      }

      logger.info('WP-CLI command completed', {
        projectId: context.projectId,
        success,
        command,
        agent: context.agentName,
      });

      return {
        success,
        data: {
          command: wpCommand,
          output: parsedOutput || result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
      };
    } catch (error) {
      logger.error('Failed to execute WP-CLI command', {
        projectId: context.projectId,
        command,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute WP-CLI command',
      };
    }
  },
};

// ============================================================================
// Theme Scaffolding Tool
// ============================================================================

export const wpScaffoldThemeTool: AgentTool = {
  name: 'wp_scaffold_theme',
  description:
    'Scaffold a new WordPress theme structure with all necessary files (classic or block theme)',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'Theme display name (e.g., "My Custom Theme")',
      required: true,
    },
    {
      name: 'slug',
      type: 'string',
      description:
        'Theme slug/folder name (e.g., "my-custom-theme"). Will be auto-generated from name if not provided.',
      required: false,
    },
    {
      name: 'type',
      type: 'string',
      description: 'Theme type: "classic" (traditional PHP) or "block" (Full Site Editing)',
      required: true,
      enum: ['classic', 'block'],
    },
    {
      name: 'author',
      type: 'string',
      description: 'Theme author name',
      required: false,
      default: 'AgentWorks',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Theme description',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const name = args.name as string;
    const slug = (args.slug as string) || name.toLowerCase().replace(/\s+/g, '-');
    const type = args.type as 'classic' | 'block';
    const author = (args.author as string) || 'AgentWorks';
    const description = (args.description as string) || `${name} - A custom WordPress theme`;

    try {
      const themePath = path.join(context.projectPath, 'wp-content', 'themes', slug);

      // Create theme directory structure
      const directories =
        type === 'block'
          ? ['parts', 'templates', 'styles', 'patterns', 'assets', 'assets/css', 'assets/js']
          : ['inc', 'template-parts', 'assets', 'assets/css', 'assets/js', 'assets/images'];

      // Create directories
      for (const dir of directories) {
        const dirPath = path.join(themePath, dir);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Create style.css (required for all themes)
      const styleCss = `/*
Theme Name: ${name}
Theme URI:
Author: ${author}
Author URI:
Description: ${description}
Version: 1.0.0
Tested up to: 6.4
Requires at least: 6.0
Requires PHP: 8.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${slug}
Tags: ${type === 'block' ? 'full-site-editing, block-themes, editor-style' : 'custom-menu, custom-logo, featured-images'}

${description}
*/
`;
      fs.writeFileSync(path.join(themePath, 'style.css'), styleCss);

      if (type === 'block') {
        // Block theme files
        const themeJson = {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {
            appearanceTools: true,
            color: {
              palette: [
                { slug: 'primary', color: '#0073aa', name: 'Primary' },
                { slug: 'secondary', color: '#23282d', name: 'Secondary' },
                { slug: 'background', color: '#ffffff', name: 'Background' },
                { slug: 'foreground', color: '#1e1e1e', name: 'Foreground' },
              ],
            },
            typography: {
              fontFamilies: [
                {
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  slug: 'system',
                  name: 'System Font',
                },
              ],
            },
            layout: {
              contentSize: '840px',
              wideSize: '1100px',
            },
          },
          styles: {
            color: {
              background: 'var(--wp--preset--color--background)',
              text: 'var(--wp--preset--color--foreground)',
            },
          },
          templateParts: [
            { name: 'header', area: 'header', title: 'Header' },
            { name: 'footer', area: 'footer', title: 'Footer' },
          ],
        };
        fs.writeFileSync(path.join(themePath, 'theme.json'), JSON.stringify(themeJson, null, 2));

        // Index template
        const indexHtml = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:query {"queryId":1,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date"}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
    <!-- wp:post-title {"isLink":true} /-->
    <!-- wp:post-excerpt /-->
    <!-- /wp:post-template -->
    <!-- wp:query-pagination /-->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
`;
        fs.writeFileSync(path.join(themePath, 'templates', 'index.html'), indexHtml);

        // Header part
        const headerHtml = `<!-- wp:group {"className":"site-header"} -->
<div class="wp-block-group site-header">
  <!-- wp:site-title /-->
  <!-- wp:navigation /-->
</div>
<!-- /wp:group -->
`;
        fs.writeFileSync(path.join(themePath, 'parts', 'header.html'), headerHtml);

        // Footer part
        const footerHtml = `<!-- wp:group {"className":"site-footer"} -->
<div class="wp-block-group site-footer">
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">© ${new Date().getFullYear()} ${name}</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
`;
        fs.writeFileSync(path.join(themePath, 'parts', 'footer.html'), footerHtml);
      } else {
        // Classic theme files
        const functionsPhp = `<?php
/**
 * ${name} functions and definitions
 *
 * @package ${slug}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

define( '${slug.toUpperCase().replace(/-/g, '_')}_VERSION', '1.0.0' );

/**
 * Sets up theme defaults and registers support for various WordPress features.
 */
function ${slug.replace(/-/g, '_')}_setup() {
    // Add default posts and comments RSS feed links to head.
    add_theme_support( 'automatic-feed-links' );

    // Let WordPress manage the document title.
    add_theme_support( 'title-tag' );

    // Enable support for Post Thumbnails.
    add_theme_support( 'post-thumbnails' );

    // Register navigation menus.
    register_nav_menus(
        array(
            'primary' => esc_html__( 'Primary Menu', '${slug}' ),
            'footer'  => esc_html__( 'Footer Menu', '${slug}' ),
        )
    );

    // Switch default core markup to output valid HTML5.
    add_theme_support(
        'html5',
        array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' )
    );

    // Add support for custom logo.
    add_theme_support(
        'custom-logo',
        array(
            'height'      => 100,
            'width'       => 400,
            'flex-height' => true,
            'flex-width'  => true,
        )
    );

    // Add support for editor styles.
    add_theme_support( 'editor-styles' );
}
add_action( 'after_setup_theme', '${slug.replace(/-/g, '_')}_setup' );

/**
 * Enqueue scripts and styles.
 */
function ${slug.replace(/-/g, '_')}_scripts() {
    wp_enqueue_style(
        '${slug}-style',
        get_stylesheet_uri(),
        array(),
        ${slug.toUpperCase().replace(/-/g, '_')}_VERSION
    );
}
add_action( 'wp_enqueue_scripts', '${slug.replace(/-/g, '_')}_scripts' );
`;
        fs.writeFileSync(path.join(themePath, 'functions.php'), functionsPhp);

        // index.php
        const indexPhp = `<?php
/**
 * The main template file
 *
 * @package ${slug}
 */

get_header();
?>

<main id="primary" class="site-main">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) :
            the_post();
            get_template_part( 'template-parts/content', get_post_type() );
        endwhile;

        the_posts_navigation();
    else :
        get_template_part( 'template-parts/content', 'none' );
    endif;
    ?>
</main>

<?php
get_footer();
`;
        fs.writeFileSync(path.join(themePath, 'index.php'), indexPhp);

        // header.php
        const headerPhp = `<?php
/**
 * The header for our theme
 *
 * @package ${slug}
 */
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header id="masthead" class="site-header">
    <div class="site-branding">
        <?php the_custom_logo(); ?>
        <h1 class="site-title"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a></h1>
    </div>

    <nav id="site-navigation" class="main-navigation">
        <?php
        wp_nav_menu(
            array(
                'theme_location' => 'primary',
                'menu_id'        => 'primary-menu',
            )
        );
        ?>
    </nav>
</header>
`;
        fs.writeFileSync(path.join(themePath, 'header.php'), headerPhp);

        // footer.php
        const footerPhp = `<?php
/**
 * The template for displaying the footer
 *
 * @package ${slug}
 */
?>

<footer id="colophon" class="site-footer">
    <div class="site-info">
        <span class="copyright">&copy; <?php echo date( 'Y' ); ?> <?php bloginfo( 'name' ); ?></span>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
`;
        fs.writeFileSync(path.join(themePath, 'footer.php'), footerPhp);

        // content.php template part
        const contentPhp = `<?php
/**
 * Template part for displaying posts
 *
 * @package ${slug}
 */
?>

<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <header class="entry-header">
        <?php the_title( '<h2 class="entry-title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>
    </header>

    <div class="entry-content">
        <?php the_excerpt(); ?>
    </div>

    <footer class="entry-footer">
        <?php
        echo '<span class="posted-on">' . esc_html( get_the_date() ) . '</span>';
        ?>
    </footer>
</article>
`;
        fs.writeFileSync(path.join(themePath, 'template-parts', 'content.php'), contentPhp);
      }

      // Create screenshot placeholder
      const screenshotInfo = `/* Screenshot placeholder - replace with 1200x900 PNG */`;
      fs.writeFileSync(path.join(themePath, 'screenshot.txt'), screenshotInfo);

      logger.info('Theme scaffolded successfully', {
        projectId: context.projectId,
        themePath,
        type,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          themePath,
          themeSlug: slug,
          themeName: name,
          type,
          files: fs.readdirSync(themePath, { recursive: true }),
        },
      };
    } catch (error) {
      logger.error('Failed to scaffold theme', {
        projectId: context.projectId,
        name,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scaffold theme',
      };
    }
  },
};

// ============================================================================
// Plugin Scaffolding Tool
// ============================================================================

export const wpScaffoldPluginTool: AgentTool = {
  name: 'wp_scaffold_plugin',
  description: 'Scaffold a new WordPress plugin with proper structure and boilerplate code',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'Plugin display name (e.g., "My Custom Plugin")',
      required: true,
    },
    {
      name: 'slug',
      type: 'string',
      description: 'Plugin slug/folder name. Will be auto-generated from name if not provided.',
      required: false,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Plugin description',
      required: false,
    },
    {
      name: 'includeAdmin',
      type: 'boolean',
      description: 'Include admin settings page boilerplate',
      required: false,
      default: true,
    },
    {
      name: 'includeBlocks',
      type: 'boolean',
      description: 'Include Gutenberg block scaffolding',
      required: false,
      default: false,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Plugin author name',
      required: false,
      default: 'AgentWorks',
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const name = args.name as string;
    const slug = (args.slug as string) || name.toLowerCase().replace(/\s+/g, '-');
    const description = (args.description as string) || `${name} - A custom WordPress plugin`;
    const includeAdmin = args.includeAdmin !== false;
    const includeBlocks = args.includeBlocks === true;
    const author = (args.author as string) || 'AgentWorks';

    const prefix = slug.replace(/-/g, '_');
    const className = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');

    try {
      const pluginPath = path.join(context.projectPath, 'wp-content', 'plugins', slug);

      // Create directories
      const directories = ['includes', 'assets', 'assets/css', 'assets/js', 'languages'];
      if (includeAdmin) directories.push('admin');
      if (includeBlocks) directories.push('blocks', 'blocks/src');

      for (const dir of directories) {
        fs.mkdirSync(path.join(pluginPath, dir), { recursive: true });
      }

      // Main plugin file
      const mainPluginPhp = `<?php
/**
 * Plugin Name: ${name}
 * Plugin URI:
 * Description: ${description}
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author: ${author}
 * Author URI:
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ${slug}
 * Domain Path: /languages
 *
 * @package ${className}
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( '${prefix.toUpperCase()}_VERSION', '1.0.0' );
define( '${prefix.toUpperCase()}_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( '${prefix.toUpperCase()}_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( '${prefix.toUpperCase()}_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Main plugin class
 */
class ${className} {

    /**
     * Plugin instance
     *
     * @var ${className}
     */
    private static $instance = null;

    /**
     * Get plugin instance
     *
     * @return ${className}
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }

    /**
     * Load required files
     */
    private function load_dependencies() {
        require_once ${prefix.toUpperCase()}_PLUGIN_DIR . 'includes/class-${slug}-loader.php';
        ${includeAdmin ? `require_once ${prefix.toUpperCase()}_PLUGIN_DIR . 'admin/class-${slug}-admin.php';` : ''}
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action( 'init', array( $this, 'load_textdomain' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
        ${includeAdmin ? `add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );` : ''}
    }

    /**
     * Load plugin text domain
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            '${slug}',
            false,
            dirname( ${prefix.toUpperCase()}_PLUGIN_BASENAME ) . '/languages'
        );
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_style(
            '${slug}-style',
            ${prefix.toUpperCase()}_PLUGIN_URL . 'assets/css/style.css',
            array(),
            ${prefix.toUpperCase()}_VERSION
        );

        wp_enqueue_script(
            '${slug}-script',
            ${prefix.toUpperCase()}_PLUGIN_URL . 'assets/js/script.js',
            array( 'jquery' ),
            ${prefix.toUpperCase()}_VERSION,
            true
        );
    }
    ${
      includeAdmin
        ? `
    /**
     * Enqueue admin scripts and styles
     */
    public function admin_enqueue_scripts( $hook ) {
        if ( 'toplevel_page_${slug}' !== $hook ) {
            return;
        }

        wp_enqueue_style(
            '${slug}-admin-style',
            ${prefix.toUpperCase()}_PLUGIN_URL . 'admin/css/admin.css',
            array(),
            ${prefix.toUpperCase()}_VERSION
        );
    }`
        : ''
    }

    /**
     * Plugin activation
     */
    public static function activate() {
        // Activation logic
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public static function deactivate() {
        // Deactivation logic
        flush_rewrite_rules();
    }
}

// Activation/deactivation hooks
register_activation_hook( __FILE__, array( '${className}', 'activate' ) );
register_deactivation_hook( __FILE__, array( '${className}', 'deactivate' ) );

// Initialize plugin
function ${prefix}_init() {
    return ${className}::get_instance();
}
add_action( 'plugins_loaded', '${prefix}_init' );
`;
      fs.writeFileSync(path.join(pluginPath, `${slug}.php`), mainPluginPhp);

      // Loader class
      const loaderPhp = `<?php
/**
 * Loader class
 *
 * @package ${className}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class ${className}_Loader
 */
class ${className}_Loader {

    /**
     * Registered actions
     *
     * @var array
     */
    protected $actions = array();

    /**
     * Registered filters
     *
     * @var array
     */
    protected $filters = array();

    /**
     * Add action
     *
     * @param string $hook          Hook name.
     * @param object $component     Component object.
     * @param string $callback      Callback method.
     * @param int    $priority      Priority.
     * @param int    $accepted_args Number of accepted arguments.
     */
    public function add_action( $hook, $component, $callback, $priority = 10, $accepted_args = 1 ) {
        $this->actions = $this->add( $this->actions, $hook, $component, $callback, $priority, $accepted_args );
    }

    /**
     * Add filter
     *
     * @param string $hook          Hook name.
     * @param object $component     Component object.
     * @param string $callback      Callback method.
     * @param int    $priority      Priority.
     * @param int    $accepted_args Number of accepted arguments.
     */
    public function add_filter( $hook, $component, $callback, $priority = 10, $accepted_args = 1 ) {
        $this->filters = $this->add( $this->filters, $hook, $component, $callback, $priority, $accepted_args );
    }

    /**
     * Add to hooks array
     *
     * @param array  $hooks         Hooks array.
     * @param string $hook          Hook name.
     * @param object $component     Component object.
     * @param string $callback      Callback method.
     * @param int    $priority      Priority.
     * @param int    $accepted_args Number of accepted arguments.
     * @return array
     */
    private function add( $hooks, $hook, $component, $callback, $priority, $accepted_args ) {
        $hooks[] = array(
            'hook'          => $hook,
            'component'     => $component,
            'callback'      => $callback,
            'priority'      => $priority,
            'accepted_args' => $accepted_args,
        );
        return $hooks;
    }

    /**
     * Run all hooks
     */
    public function run() {
        foreach ( $this->filters as $hook ) {
            add_filter(
                $hook['hook'],
                array( $hook['component'], $hook['callback'] ),
                $hook['priority'],
                $hook['accepted_args']
            );
        }

        foreach ( $this->actions as $hook ) {
            add_action(
                $hook['hook'],
                array( $hook['component'], $hook['callback'] ),
                $hook['priority'],
                $hook['accepted_args']
            );
        }
    }
}
`;
      fs.writeFileSync(path.join(pluginPath, 'includes', `class-${slug}-loader.php`), loaderPhp);

      // Admin class (if enabled)
      if (includeAdmin) {
        fs.mkdirSync(path.join(pluginPath, 'admin', 'css'), { recursive: true });

        const adminPhp = `<?php
/**
 * Admin functionality
 *
 * @package ${className}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class ${className}_Admin
 */
class ${className}_Admin {

    /**
     * Constructor
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __( '${name}', '${slug}' ),
            __( '${name}', '${slug}' ),
            'manage_options',
            '${slug}',
            array( $this, 'render_settings_page' ),
            'dashicons-admin-generic',
            100
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting(
            '${prefix}_settings',
            '${prefix}_options',
            array( $this, 'sanitize_options' )
        );

        add_settings_section(
            '${prefix}_general_section',
            __( 'General Settings', '${slug}' ),
            array( $this, 'render_section' ),
            '${slug}'
        );

        add_settings_field(
            '${prefix}_example_field',
            __( 'Example Field', '${slug}' ),
            array( $this, 'render_example_field' ),
            '${slug}',
            '${prefix}_general_section'
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields( '${prefix}_settings' );
                do_settings_sections( '${slug}' );
                submit_button( __( 'Save Settings', '${slug}' ) );
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Render section description
     */
    public function render_section() {
        echo '<p>' . esc_html__( 'Configure the plugin settings below.', '${slug}' ) . '</p>';
    }

    /**
     * Render example field
     */
    public function render_example_field() {
        $options = get_option( '${prefix}_options' );
        $value = isset( $options['example'] ) ? $options['example'] : '';
        ?>
        <input type="text"
               name="${prefix}_options[example]"
               value="<?php echo esc_attr( $value ); ?>"
               class="regular-text">
        <?php
    }

    /**
     * Sanitize options
     *
     * @param array $input Input values.
     * @return array Sanitized values.
     */
    public function sanitize_options( $input ) {
        $sanitized = array();

        if ( isset( $input['example'] ) ) {
            $sanitized['example'] = sanitize_text_field( $input['example'] );
        }

        return $sanitized;
    }
}

// Initialize admin
new ${className}_Admin();
`;
        fs.writeFileSync(path.join(pluginPath, 'admin', `class-${slug}-admin.php`), adminPhp);

        // Admin CSS
        const adminCss = `/* ${name} Admin Styles */
.wrap h1 {
    margin-bottom: 20px;
}

.form-table th {
    font-weight: 600;
}
`;
        fs.writeFileSync(path.join(pluginPath, 'admin', 'css', 'admin.css'), adminCss);
      }

      // Empty frontend CSS and JS
      fs.writeFileSync(path.join(pluginPath, 'assets', 'css', 'style.css'), `/* ${name} Styles */\n`);
      fs.writeFileSync(
        path.join(pluginPath, 'assets', 'js', 'script.js'),
        `/* ${name} Scripts */\n(function($) {\n    'use strict';\n    // Plugin code here\n})(jQuery);\n`
      );

      // Create uninstall.php
      const uninstallPhp = `<?php
/**
 * Uninstall script
 *
 * @package ${className}
 */

// If uninstall not called from WordPress, exit
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Delete plugin options
delete_option( '${prefix}_options' );

// Clear any cached data
wp_cache_flush();
`;
      fs.writeFileSync(path.join(pluginPath, 'uninstall.php'), uninstallPhp);

      logger.info('Plugin scaffolded successfully', {
        projectId: context.projectId,
        pluginPath,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          pluginPath,
          pluginSlug: slug,
          pluginName: name,
          includeAdmin,
          includeBlocks,
          files: fs.readdirSync(pluginPath, { recursive: true }),
        },
      };
    } catch (error) {
      logger.error('Failed to scaffold plugin', {
        projectId: context.projectId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scaffold plugin',
      };
    }
  },
};

// ============================================================================
// Gutenberg Block Scaffolding Tool
// ============================================================================

export const wpScaffoldBlockTool: AgentTool = {
  name: 'wp_scaffold_block',
  description: 'Scaffold a new Gutenberg block with React/JSX and proper block.json configuration',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'Block display name (e.g., "Custom Card")',
      required: true,
    },
    {
      name: 'slug',
      type: 'string',
      description: 'Block slug (e.g., "custom-card"). Will be auto-generated from name if not provided.',
      required: false,
    },
    {
      name: 'namespace',
      type: 'string',
      description: 'Block namespace (e.g., "my-plugin"). Defaults to project slug.',
      required: false,
    },
    {
      name: 'category',
      type: 'string',
      description: 'Block category (text, media, design, widgets, theme, embed)',
      required: false,
      enum: ['text', 'media', 'design', 'widgets', 'theme', 'embed'],
      default: 'widgets',
    },
    {
      name: 'isDynamic',
      type: 'boolean',
      description: 'Create a dynamic block with PHP server-side rendering',
      required: false,
      default: false,
    },
    {
      name: 'pluginSlug',
      type: 'string',
      description: 'Parent plugin slug (for organizing within a plugin)',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const name = args.name as string;
    const slug = (args.slug as string) || name.toLowerCase().replace(/\s+/g, '-');
    const namespace = (args.namespace as string) || 'custom';
    const category = (args.category as string) || 'widgets';
    const isDynamic = args.isDynamic === true;
    const pluginSlug = args.pluginSlug as string | undefined;

    try {
      // Determine block path
      let blockPath: string;
      if (pluginSlug) {
        blockPath = path.join(context.projectPath, 'wp-content', 'plugins', pluginSlug, 'blocks', slug);
      } else {
        blockPath = path.join(context.projectPath, 'wp-content', 'plugins', `${namespace}-blocks`, 'blocks', slug);
      }

      // Create directory structure
      fs.mkdirSync(path.join(blockPath, 'src'), { recursive: true });
      fs.mkdirSync(path.join(blockPath, 'build'), { recursive: true });

      // block.json
      const blockJson = {
        $schema: 'https://schemas.wp.org/trunk/block.json',
        apiVersion: 3,
        name: `${namespace}/${slug}`,
        version: '1.0.0',
        title: name,
        category,
        icon: 'block-default',
        description: `A custom ${name} block`,
        keywords: [slug, 'custom'],
        supports: {
          html: false,
          color: {
            text: true,
            background: true,
          },
          spacing: {
            margin: true,
            padding: true,
          },
          align: ['wide', 'full'],
        },
        attributes: {
          content: {
            type: 'string',
            default: '',
          },
        },
        textdomain: namespace,
        editorScript: 'file:./build/index.js',
        editorStyle: 'file:./build/index.css',
        style: 'file:./build/style-index.css',
        ...(isDynamic && { render: 'file:./render.php' }),
      };
      fs.writeFileSync(path.join(blockPath, 'block.json'), JSON.stringify(blockJson, null, 2));

      // Edit component (edit.js)
      const editJs = `/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';

/**
 * Editor styles
 */
import './editor.scss';

/**
 * Edit component
 *
 * @param {Object} props               Block props.
 * @param {Object} props.attributes    Block attributes.
 * @param {Function} props.setAttributes Function to update attributes.
 * @return {JSX.Element} Edit component.
 */
export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const { content } = attributes;

    return (
        <div {...blockProps}>
            <RichText
                tagName="p"
                value={content}
                onChange={(newContent) => setAttributes({ content: newContent })}
                placeholder={__('Enter content...', '${namespace}')}
            />
        </div>
    );
}
`;
      fs.writeFileSync(path.join(blockPath, 'src', 'edit.js'), editJs);

      // Save component (save.js) - for static blocks
      const saveJs = isDynamic
        ? `/**
 * Save component for dynamic block
 *
 * @return {null} Dynamic blocks return null.
 */
export default function Save() {
    return null;
}
`
        : `/**
 * WordPress dependencies
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';

/**
 * Save component
 *
 * @param {Object} props            Block props.
 * @param {Object} props.attributes Block attributes.
 * @return {JSX.Element} Save component.
 */
export default function Save({ attributes }) {
    const blockProps = useBlockProps.save();
    const { content } = attributes;

    return (
        <div {...blockProps}>
            <RichText.Content tagName="p" value={content} />
        </div>
    );
}
`;
      fs.writeFileSync(path.join(blockPath, 'src', 'save.js'), saveJs);

      // Index.js (entry point)
      const indexJs = `/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from '../block.json';

/**
 * Block styles
 */
import './style.scss';

/**
 * Register block
 */
registerBlockType(metadata.name, {
    edit: Edit,
    save: Save,
});
`;
      fs.writeFileSync(path.join(blockPath, 'src', 'index.js'), indexJs);

      // Editor styles
      const editorScss = `/**
 * Editor styles for ${name} block
 */
.wp-block-${namespace}-${slug} {
    border: 1px dashed #ccc;
    padding: 20px;

    &:focus-within {
        border-color: var(--wp-admin-theme-color);
    }
}
`;
      fs.writeFileSync(path.join(blockPath, 'src', 'editor.scss'), editorScss);

      // Frontend styles
      const styleScss = `/**
 * Frontend styles for ${name} block
 */
.wp-block-${namespace}-${slug} {
    padding: 20px;
    margin: 20px 0;
}
`;
      fs.writeFileSync(path.join(blockPath, 'src', 'style.scss'), styleScss);

      // Render PHP for dynamic blocks
      if (isDynamic) {
        const renderPhp = `<?php
/**
 * Server-side rendering for ${name} block
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 * @return string Rendered block HTML.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$wrapper_attributes = get_block_wrapper_attributes();
$content = isset( $attributes['content'] ) ? $attributes['content'] : '';
?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
    <p><?php echo wp_kses_post( $content ); ?></p>
</div>
`;
        fs.writeFileSync(path.join(blockPath, 'render.php'), renderPhp);
      }

      logger.info('Block scaffolded successfully', {
        projectId: context.projectId,
        blockPath,
        namespace,
        slug,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          blockPath,
          blockName: `${namespace}/${slug}`,
          displayName: name,
          isDynamic,
          category,
          files: fs.readdirSync(blockPath, { recursive: true }),
          buildCommand: 'npx wp-scripts build',
        },
      };
    } catch (error) {
      logger.error('Failed to scaffold block', {
        projectId: context.projectId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scaffold block',
      };
    }
  },
};

// ============================================================================
// PHPCS/WPCS Standards Check Tool
// ============================================================================

export const wpCheckStandardsTool: AgentTool = {
  name: 'wp_check_standards',
  description:
    'Run WordPress Coding Standards check (PHPCS with WPCS ruleset) on PHP files',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to file or directory to check. Defaults to current project.',
      required: false,
    },
    {
      name: 'standard',
      type: 'string',
      description: 'WordPress coding standard to use',
      required: false,
      enum: ['WordPress', 'WordPress-Core', 'WordPress-Docs', 'WordPress-Extra', 'WordPress-VIP-Go'],
      default: 'WordPress',
    },
    {
      name: 'fix',
      type: 'boolean',
      description: 'Automatically fix fixable issues using PHPCBF',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const targetPath = (args.path as string) || context.projectPath;
    const standard = (args.standard as string) || 'WordPress';
    const fix = args.fix === true;

    try {
      // Build command
      const tool = fix ? 'phpcbf' : 'phpcs';
      let command = `${tool} --standard=${standard} --extensions=php --report=json "${targetPath}"`;

      logger.info('Running WordPress coding standards check', {
        projectId: context.projectId,
        path: targetPath,
        standard,
        fix,
        agent: context.agentName,
      });

      const result = await safeExec(command, {
        cwd: context.projectPath,
        timeout: 120000,
      });

      // Parse results
      let report: {
        totals: { errors: number; warnings: number; fixable: number };
        files: Record<string, { errors: number; warnings: number; messages: unknown[] }>;
      } | null = null;

      try {
        if (result.stdout.trim()) {
          report = JSON.parse(result.stdout);
        }
      } catch {
        // Parsing failed, use raw output
      }

      const success = result.exitCode === 0;

      logger.info('Standards check completed', {
        projectId: context.projectId,
        success,
        errors: report?.totals?.errors || 0,
        warnings: report?.totals?.warnings || 0,
        agent: context.agentName,
      });

      return {
        success,
        data: report
          ? {
              totals: report.totals,
              files: Object.entries(report.files).map(([filePath, fileData]) => ({
                path: filePath,
                errors: fileData.errors,
                warnings: fileData.warnings,
                messages: fileData.messages.slice(0, 20), // Limit messages
              })),
              fixed: fix,
              standard,
            }
          : {
              rawOutput: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
            },
      };
    } catch (error) {
      logger.error('Failed to run standards check', {
        projectId: context.projectId,
        path: targetPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run standards check',
      };
    }
  },
};

// ============================================================================
// WordPress Deployment Tool
// ============================================================================

export const wpDeployTool: AgentTool = {
  name: 'wp_deploy',
  description:
    'Deploy WordPress theme or plugin to various targets (SVN for wordpress.org, SFTP, or generate ZIP)',
  category: 'wordpress',
  allowedAgents: ['cms_wordpress', 'claude_code_agent'],
  requiresApproval: true,
  parameters: [
    {
      name: 'target',
      type: 'string',
      description: 'Deployment target type',
      required: true,
      enum: ['wordpress-org', 'sftp', 'zip'],
    },
    {
      name: 'type',
      type: 'string',
      description: 'What to deploy: theme or plugin',
      required: true,
      enum: ['theme', 'plugin'],
    },
    {
      name: 'slug',
      type: 'string',
      description: 'Theme or plugin slug',
      required: true,
    },
    {
      name: 'version',
      type: 'string',
      description: 'Version number to deploy. Defaults to version in main file.',
      required: false,
    },
    {
      name: 'dryRun',
      type: 'boolean',
      description: 'Perform a dry run without actually deploying',
      required: false,
      default: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const target = args.target as 'wordpress-org' | 'sftp' | 'zip';
    const type = args.type as 'theme' | 'plugin';
    const slug = args.slug as string;
    const version = args.version as string | undefined;
    const dryRun = args.dryRun !== false;

    try {
      const sourcePath =
        type === 'theme'
          ? path.join(context.projectPath, 'wp-content', 'themes', slug)
          : path.join(context.projectPath, 'wp-content', 'plugins', slug);

      // Verify source exists
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error: `${type} not found at ${sourcePath}`,
        };
      }

      logger.info('Starting WordPress deployment', {
        projectId: context.projectId,
        target,
        type,
        slug,
        dryRun,
        agent: context.agentName,
      });

      let result: { stdout: string; stderr: string; exitCode: number };
      let outputPath: string | undefined;

      switch (target) {
        case 'zip': {
          // Create a distributable ZIP file
          const buildDir = path.join(context.projectPath, 'dist');
          fs.mkdirSync(buildDir, { recursive: true });

          const zipName = version ? `${slug}-${version}.zip` : `${slug}.zip`;
          outputPath = path.join(buildDir, zipName);

          if (dryRun) {
            result = {
              stdout: `[DRY RUN] Would create ZIP: ${outputPath}\nSource: ${sourcePath}`,
              stderr: '',
              exitCode: 0,
            };
          } else {
            // Use zip command to create archive
            result = await safeExec(
              `cd "${path.dirname(sourcePath)}" && zip -r "${outputPath}" "${slug}" -x "*.git*" -x "node_modules/*" -x "*.map"`,
              { cwd: context.projectPath, timeout: 60000 }
            );
          }
          break;
        }

        case 'wordpress-org': {
          // Deploy to WordPress.org SVN repository
          if (dryRun) {
            result = {
              stdout: `[DRY RUN] Would deploy ${type} "${slug}" to WordPress.org SVN\n` +
                      `Source: ${sourcePath}\n` +
                      `SVN URL: https://plugins.svn.wordpress.org/${slug}/`,
              stderr: '',
              exitCode: 0,
            };
          } else {
            // This would typically use svn commands
            // For now, provide instructions
            result = {
              stdout: `To deploy to WordPress.org:\n` +
                      `1. svn checkout https://plugins.svn.wordpress.org/${slug}/ svn-${slug}\n` +
                      `2. Copy files to svn-${slug}/trunk/\n` +
                      `3. svn add --force .\n` +
                      `4. svn ci -m "Version ${version || '1.0.0'}"`,
              stderr: '',
              exitCode: 0,
            };
          }
          break;
        }

        case 'sftp': {
          // SFTP deployment (placeholder - would need credentials)
          result = {
            stdout: `[${dryRun ? 'DRY RUN' : 'INFO'}] SFTP deployment requires configuration.\n` +
                    `Configure SFTP credentials in deployment settings to enable.\n` +
                    `Source: ${sourcePath}`,
            stderr: '',
            exitCode: dryRun ? 0 : 1,
          };
          break;
        }
      }

      const success = result.exitCode === 0;

      logger.info('Deployment completed', {
        projectId: context.projectId,
        success,
        target,
        type,
        slug,
        dryRun,
        agent: context.agentName,
      });

      return {
        success,
        data: {
          target,
          type,
          slug,
          version,
          dryRun,
          sourcePath,
          outputPath,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    } catch (error) {
      logger.error('Deployment failed', {
        projectId: context.projectId,
        target,
        type,
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  },
};

// ============================================================================
// Export all WordPress tools
// ============================================================================

export const wordpressTools: AgentTool[] = [
  wpCliTool,
  wpScaffoldThemeTool,
  wpScaffoldPluginTool,
  wpScaffoldBlockTool,
  wpCheckStandardsTool,
  wpDeployTool,
];
