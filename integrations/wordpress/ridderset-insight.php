<?php
/**
 * Plugin Name: Ridderset Rekrutteringsinnsikt – staging bridge
 * Description: Isolert integrasjon. Installer kun i staging før godkjenning.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) { exit; }

// Set this server-side in staging wp-config.php to the approved HTTPS app origin.
// No tokens, JavaScript or profile data are stored in Gutenberg.
add_shortcode('ridderset_rekrutteringsinnsikt', function () {
    if (!defined('RIDDERSET_INSIGHT_APP_URL')) {
        return '<p>Rekrutteringsinnsikt er ikke konfigurert for dette miljøet.</p>';
    }
    $url = RIDDERSET_INSIGHT_APP_URL;
    if (!is_string($url) || wp_parse_url($url, PHP_URL_SCHEME) !== 'https') {
        return '<p>Rekrutteringsinnsikt krever en godkjent HTTPS-adresse.</p>';
    }
    wp_enqueue_style('ridderset-insight', plugins_url('ridderset-insight.css', __FILE__), array(), '0.1.0');
    return '<iframe class="ridderset-insight-frame" title="Ridderset Rekrutteringsinnsikt" src="' . esc_url($url) . '" loading="lazy" referrerpolicy="no-referrer" allow="clipboard-write" sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox"></iframe>';
});
