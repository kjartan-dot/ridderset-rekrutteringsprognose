<?php
/**
 * Plugin Name: Ridderset Rekrutteringsinnsikt
 * Description: Dataunderstøttet beslutningsverktøy for arbeidsgivere. Installer bare på staging før full test.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Ridderset Rekruttering
 * Text Domain: ridderset-innsikt
 */
declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

final class Ridderset_Rekrutteringsinnsikt {
    private const API_BASE = 'https://data.brreg.no/enhetsregisteret/api/';
    private const CACHE_SECONDS = 900;
    private const VERSION = '0.1.0';

    public static function boot(): void {
        add_shortcode('ridderset_rekrutteringsinnsikt', [self::class, 'render']);
        add_action('rest_api_init', [self::class, 'register_routes']);
    }

    public static function render($atts = []): string {
        wp_enqueue_style(
            'ridderset-innsikt-style',
            plugin_dir_url(__FILE__) . 'assets/style.css',
            [],
            self::VERSION
        );
        // WordPress script modules keep the JavaScript in real assets, never in Gutenberg HTML.
        if (function_exists('wp_enqueue_script_module')) {
            wp_enqueue_script_module(
                'ridderset-innsikt-app',
                plugin_dir_url(__FILE__) . 'assets/app.js',
                [],
                self::VERSION
            );
        } else {
            return '<p>Rekrutteringsinnsikt krever WordPress 6.5 eller nyere.</p>';
        }

        $config = [
            'apiBase' => esc_url_raw(rest_url('ridderset/v1/')),
            'occupationsUrl' => esc_url_raw(plugin_dir_url(__FILE__) . 'data/occupations.json'),
            'templateUrl' => esc_url_raw(plugin_dir_url(__FILE__) . 'assets/template.html'),
            'mode' => 'live',
        ];
        $attributes = sprintf(
            ' data-api-base="%s" data-occupations-url="%s" data-template-url="%s" data-mode="%s"',
            esc_attr($config['apiBase']),
            esc_attr($config['occupationsUrl']),
            esc_attr($config['templateUrl']),
            esc_attr($config['mode'])
        );
        return '<div class="rr-insight-root"' . $attributes . '>'
            . '<noscript>Dette verktøyet krever JavaScript for søk og beregninger.</noscript>'
            . '<p class="rr-loading" role="status">Laster Ridderset Rekrutteringsinnsikt …</p>'
            . '</div>';
    }

    public static function register_routes(): void {
        register_rest_route('ridderset/v1', '/companies', [
            'methods' => 'GET',
            'callback' => [self::class, 'companies'],
            'permission_callback' => '__return_true',
            'args' => [
                'q' => ['type' => 'string', 'required' => true],
                'type' => ['type' => 'string', 'default' => 'enheter'],
            ],
        ]);
        register_rest_route('ridderset/v1', '/units', [
            'methods' => 'GET',
            'callback' => [self::class, 'units'],
            'permission_callback' => '__return_true',
            'args' => [
                'parent' => ['type' => 'string', 'required' => true],
            ],
        ]);
        register_rest_route('ridderset/v1', '/health', [
            'methods' => 'GET',
            'callback' => static function (): WP_REST_Response {
                return new WP_REST_Response([
                    'status' => 'ok',
                    'version' => self::VERSION,
                    'brreg' => 'request-time proxy',
                    'salary' => 'static snapshot 2024/2025 from SSB 11418',
                    'navFeed' => 'not connected'
                ], 200);
            },
            'permission_callback' => '__return_true',
        ]);
    }

    public static function companies(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $query = trim(sanitize_text_field((string) $request->get_param('q')));
        $type = (string) $request->get_param('type');
        if (!in_array($type, ['enheter', 'underenheter'], true)) {
            return new WP_Error('invalid_type', 'Velg hovedenhet eller underenhet.', ['status' => 400]);
        }
        $digits = preg_replace('/\s+/', '', $query);
        if (strlen($query) < 2 || mb_strlen($query) > 120) {
            return new WP_Error('invalid_query', 'Bruk minst to tegn og maks 120 tegn.', ['status' => 400]);
        }
        if (preg_match('/^[0-9]{9}$/', $digits)) {
            $path = $type . '/' . rawurlencode($digits);
        } else {
            $path = $type . '?' . http_build_query(['navn' => $query, 'size' => 12], '', '&', PHP_QUERY_RFC3986);
        }

        $result = self::get_json($path);
        if (is_wp_error($result)) {
            if ($result->get_error_code() === 'brreg_404') {
                return new WP_REST_Response(['items' => [], 'source' => 'Brønnøysundregistrene', 'kind' => $type], 200);
            }
            return $result;
        }
        $list = isset($result['_embedded'][$type]) && is_array($result['_embedded'][$type])
            ? $result['_embedded'][$type]
            : (isset($result['organisasjonsnummer']) ? [$result] : []);
        return new WP_REST_Response([
            'items' => array_map([self::class, 'public_company'], array_slice($list, 0, 12)),
            'kind' => $type,
            'source' => 'Brønnøysundregistrene',
            'retrievedAt' => gmdate('c'),
        ], 200);
    }

    public static function units(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $parent = preg_replace('/\s+/', '', sanitize_text_field((string) $request->get_param('parent')));
        if (!preg_match('/^[0-9]{9}$/', $parent)) {
            return new WP_Error('invalid_org', 'Ugyldig organisasjonsnummer.', ['status' => 400]);
        }
        $path = 'underenheter?' . http_build_query(
            ['overordnetEnhet' => $parent, 'size' => 100], '', '&', PHP_QUERY_RFC3986
        );
        $data = self::get_json($path);
        if (is_wp_error($data)) {
            return $data;
        }
        $list = $data['_embedded']['underenheter'] ?? [];
        if (!is_array($list)) {
            $list = [];
        }
        return new WP_REST_Response([
            'items' => array_map([self::class, 'public_company'], array_slice($list, 0, 100)),
            'truncated' => (($data['page']['totalElements'] ?? 0) > 100),
            'source' => 'Brønnøysundregistrene',
        ], 200);
    }

    private static function get_json(string $path): array|WP_Error {
        $cache_key = 'rrins_' . md5($path);
        $cached = get_transient($cache_key);
        if ($cached !== false && is_array($cached)) {
            return $cached;
        }
        // Only fixed Brreg host and paths generated above. Never accept an arbitrary URL from clients.
        $response = wp_safe_remote_get(self::API_BASE . $path, [
            'timeout' => 9,
            'redirection' => 0,
            'headers' => ['Accept' => 'application/json'],
        ]);
        if (is_wp_error($response)) {
            return new WP_Error('upstream_unavailable', 'Bedriftsregisteret svarer ikke. Prøv igjen eller fyll inn manuelt.', ['status' => 503]);
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code === 404) {
            return new WP_Error('brreg_404', 'Virksomheten finnes ikke.', ['status' => 404]);
        }
        if ($code === 429) {
            return new WP_Error('upstream_limited', 'For mange oppslag. Prøv igjen senere.', ['status' => 503]);
        }
        if ($code < 200 || $code >= 300) {
            return new WP_Error('upstream_failure', 'Bedriftsregisteret er midlertidig utilgjengelig.', ['status' => 502]);
        }
        $body = wp_remote_retrieve_body($response);
        if (strlen($body) > 1600000) {
            return new WP_Error('response_too_large', 'Bedriftsoppslaget var for omfattende.', ['status' => 502]);
        }
        $parsed = json_decode($body, true);
        if (!is_array($parsed)) {
            return new WP_Error('invalid_upstream_json', 'Ugyldig svar fra registeret.', ['status' => 502]);
        }
        set_transient($cache_key, $parsed, self::CACHE_SECONDS);
        return $parsed;
    }

    private static function public_company($raw): array {
        if (!is_array($raw)) {
            return [];
        }
        $address = $raw['beliggenhetsadresse'] ?? $raw['forretningsadresse'] ?? $raw['postadresse'] ?? [];
        return [
            'navn' => (string) ($raw['navn'] ?? ''),
            'organisasjonsnummer' => (string) ($raw['organisasjonsnummer'] ?? ''),
            'overordnetEnhet' => isset($raw['overordnetEnhet']) ? (string) $raw['overordnetEnhet'] : null,
            'organisasjonsform' => ['beskrivelse' => (string) ($raw['organisasjonsform']['beskrivelse'] ?? '')],
            'naeringskode1' => [
                'kode' => (string) ($raw['naeringskode1']['kode'] ?? ''),
                'beskrivelse' => (string) ($raw['naeringskode1']['beskrivelse'] ?? ''),
            ],
            'antallAnsatte' => isset($raw['antallAnsatte']) && is_numeric($raw['antallAnsatte'])
                ? (int) $raw['antallAnsatte'] : null,
            'beliggenhetsadresse' => $address,
        ];
    }
}
Ridderset_Rekrutteringsinnsikt::boot();
