<?php
/**
 * Plugin Name: Ridderset – rask rekrutteringsanalyse
 * Description: Bedriftssøk, rolleforslag og dokumenterte markedssignaler i en kort flyt.
 * Version: 0.2.1
 * Author: Ridderset Rekruttering
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * Text Domain: ridderset-hurtigsjekk
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Ridderset_Hurtigsjekk {
    const VERSION = '0.2.1';
    const API = 'https://data.brreg.no/enhetsregisteret/api/';
    private static $guided = false;

    public static function boot() {
        add_shortcode('rr_hurtigsjekk', array(__CLASS__, 'render'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'maybe_enqueue'));
        add_action('rest_api_init', array(__CLASS__, 'routes'));
        add_filter('script_loader_src', array(__CLASS__, 'guided_market_script'), 20, 2);
        add_action('wp_enqueue_scripts', array(__CLASS__, 'replace_guided_market_runtime'), 1000);
        add_action('wp_print_footer_scripts', array(__CLASS__, 'replace_guided_market_runtime'), 1);
    }

    public static function maybe_enqueue() {
        $post = get_post();
        if (is_singular() && $post && has_shortcode($post->post_content, 'rr_hurtigsjekk')) {
            self::enqueue(self::is_guided_page($post));
        }
    }

    private static function is_guided_page($post = null) {
        $post = $post ?: get_post();
        if (!$post || !is_singular()) {
            return false;
        }
        preg_match_all('/\[rr_hurtigsjekk\b([^\]]*)\]/', $post->post_content, $matches);
        foreach ($matches[1] as $attributes) {
            $atts = shortcode_parse_atts($attributes);
            if (is_array($atts) && isset($atts['guided']) && (string) $atts['guided'] === '1') {
                return true;
            }
        }
        return false;
    }

    public static function guided_market_script($src, $handle) {
        if ((self::$guided || self::is_guided_page()) && strpos(wp_parse_url($src, PHP_URL_PATH) ?: '', '/ridderset-markedssjekk/marked.js') !== false) {
            return plugin_dir_url(__FILE__) . 'marked-guided.js?ver=' . self::VERSION;
        }
        return $src;
    }

    public static function replace_guided_market_runtime() {
        if (!self::$guided && !self::is_guided_page()) {
            return;
        }
        // Page Optimize reads registered sources before script_loader_src filters.
        // Preserve the original handle/dependencies and replace exactly one known runtime.
        foreach (wp_scripts()->registered as $script) {
            if (is_string($script->src) && strpos(wp_parse_url($script->src, PHP_URL_PATH) ?: '', '/ridderset-markedssjekk/marked.js') !== false) {
                $script->src = plugin_dir_url(__FILE__) . 'marked-guided.js';
                $script->ver = self::VERSION;
            }
        }
    }

    private static function enqueue($guided = false) {
        self::$guided = self::$guided || $guided;
        $base = plugin_dir_url(__FILE__);
        $version_path = $guided ? '' : 'previous/';
        wp_enqueue_style('rr-hurtigsjekk', $base . $version_path . 'style.css', array(), self::VERSION);
        wp_enqueue_script('rr-hurtigsjekk-core', $base . 'core.js', array(), self::VERSION, true);
        if (!$guided) {
            wp_enqueue_script('rr-hurtigsjekk-front', $base . 'previous/front.js', array('rr-hurtigsjekk-core'), self::VERSION, true);
            return;
        }
        wp_enqueue_script('rr-hurtigsjekk-context', $base . 'context.js', array(), self::VERSION, true);
        wp_enqueue_script('rr-hurtigsjekk-front', $base . 'front.js', array('rr-hurtigsjekk-core', 'rr-hurtigsjekk-context'), self::VERSION, true);
        wp_enqueue_script('rr-hurtigsjekk-bridge', $base . 'context-bridge.js', array('rr-hurtigsjekk-front'), self::VERSION, true);
    }

    public static function render($atts = array()) {
        static $rendered = false;
        if ($rendered) {
            return '';
        }
        $rendered = true;
        $atts = shortcode_atts(array('guided' => '0'), (array) $atts, 'rr_hurtigsjekk');
        $guided = (string) $atts['guided'] === '1';
        self::enqueue($guided);
        $file = __DIR__ . ($guided ? '/view.html' : '/previous/view.html');
        if (!is_readable($file)) {
            return '<p>Rekrutteringsanalysen er midlertidig utilgjengelig.</p>';
        }
        return strtr(file_get_contents($file), array(
            '{{RRH_API}}' => esc_url(rest_url('ridderset-hurtig/v1/')),
            '{{RRH_ASSETS}}' => esc_url(plugin_dir_url(__FILE__)),
            '{{RRH_MARKET_API}}' => esc_url(rest_url('ridderset-marked/v1/')),
        ));
    }

    public static function routes() {
        register_rest_route('ridderset-hurtig/v1', '/companies', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'companies'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route('ridderset-hurtig/v1', '/units', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'units'),
            'permission_callback' => '__return_true',
        ));
    }

    private static function rate_limit() {
        // Store only a short-lived salted address hash, never the raw address.
        $address = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
        $key = 'rrh_rate_' . substr(hash_hmac('sha256', $address, wp_salt('nonce')), 0, 32);
        $bucket = get_transient($key);
        $now = time();
        if (!is_array($bucket) || $bucket['until'] <= $now) {
            $bucket = array('count' => 0, 'until' => $now + 60);
        }
        if ($bucket['count'] >= 90) {
            return new WP_Error('rrh_rate_limit', 'Mange oppslag på kort tid. Vent litt og prøv igjen.', array('status' => 429));
        }
        $bucket['count']++;
        set_transient($key, $bucket, max(1, $bucket['until'] - $now));
        return true;
    }

    private static function clean($value, $max = 250) {
        if (!is_string($value)) {
            return '';
        }
        $value = sanitize_text_field($value);
        return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
    }

    private static function read($kind, $suffix, $query = array()) {
        $url = self::API . $kind . $suffix;
        if ($query) {
            $url = add_query_arg($query, $url);
        }
        $key = 'rrh_brreg_' . hash('sha256', $url);
        $cached = get_transient($key);
        if (is_array($cached)) {
            return $cached;
        }
        $media = $kind === 'underenheter' ? 'underenhet' : 'enhet';
        $response = wp_safe_remote_get($url, array(
            'timeout' => 8,
            'redirection' => 0,
            'limit_response_size' => 2 * 1024 * 1024,
            'headers' => array('Accept' => 'application/vnd.brreg.enhetsregisteret.' . $media . '.v2+json'),
        ));
        if (is_wp_error($response)) {
            return new WP_Error('rrh_source_unavailable', 'Bedriftsregisteret er utilgjengelig. Prøv igjen eller velg arbeidssted selv.', array('status' => 503));
        }
        $status = wp_remote_retrieve_response_code($response);
        if ($status === 404 || $status === 410) {
            return array('missing' => true, 'retrievedAt' => gmdate('c'));
        }
        if ($status !== 200) {
            return new WP_Error('rrh_source_unavailable', 'Bedriftsregisteret er utilgjengelig. Prøv igjen eller velg arbeidssted selv.', array('status' => $status === 429 ? 429 : 503));
        }
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($body)) {
            return new WP_Error('rrh_source_invalid', 'Bedriftsregisteret returnerte et uventet svar. Prøv igjen senere.', array('status' => 503));
        }
        $result = array('body' => $body, 'retrievedAt' => gmdate('c'));
        set_transient($key, $result, 5 * MINUTE_IN_SECONDS);
        return $result;
    }

    private static function company($row, $kind, $retrieved_at) {
        if (!is_array($row) || !empty($row['slettedato']) || !empty($row['nedleggelsesdato'])) {
            return null;
        }
        $org = isset($row['organisasjonsnummer']) ? (string) $row['organisasjonsnummer'] : '';
        if (!preg_match('/^[0-9]{9}$/D', $org) || empty($row['navn'])) {
            return null;
        }
        // A postal address must not silently become a workplace.
        $address = $kind === 'underenheter' ? ($row['beliggenhetsadresse'] ?? array()) : ($row['forretningsadresse'] ?? array());
        $industry = $row['naeringskode1'] ?? array();
        $lines = isset($address['adresse']) && is_array($address['adresse']) ? $address['adresse'] : array();
        $lines[] = trim(($address['postnummer'] ?? '') . ' ' . ($address['poststed'] ?? ''));
        $lines = array_filter(array_map(array(__CLASS__, 'clean'), $lines));
        $employees = null;
        if (($row['harRegistrertAntallAnsatte'] ?? null) !== false && isset($row['antallAnsatte']) && is_int($row['antallAnsatte']) && $row['antallAnsatte'] >= 0) {
            $employees = $row['antallAnsatte'];
        }
        $town = isset($address['kommunenummer']) ? (string) $address['kommunenummer'] : '';
        return array(
            'name' => self::clean($row['navn']),
            'org' => $org,
            'industryCode' => self::clean($industry['kode'] ?? '', 20),
            'industry' => self::clean($industry['beskrivelse'] ?? '', 400),
            'organization_type_code' => self::clean($row['organisasjonsform']['kode'] ?? '', 20),
            'employees' => $employees,
            'town' => preg_match('/^[0-9]{4}$/D', $town) ? $town : null,
            'townName' => self::clean($address['kommune'] ?? '', 100),
            'address' => implode(', ', $lines),
            'kind' => $kind,
            'parent' => self::clean($row['overordnetEnhet'] ?? '', 9) ?: null,
            'source' => 'Brønnøysundregistrene / Enhetsregisteret',
            'sourceUrl' => self::API . $kind . '/' . $org,
            'retrievedAt' => $retrieved_at,
        );
    }

    private static function list_response($data, $kind, $direct = false) {
        if (is_wp_error($data)) {
            return $data;
        }
        if (!empty($data['missing'])) {
            return rest_ensure_response(array('companies' => array(), 'hasMore' => false));
        }
        $body = $data['body'];
        if (($direct && !isset($body['organisasjonsnummer'])) || (!$direct && !isset($body['_embedded'][$kind]) && ($body['page']['totalElements'] ?? null) !== 0)) {
            return new WP_Error('rrh_source_invalid', 'Bedriftsregisteret returnerte et uventet svar.', array('status' => 503));
        }
        $rows = $direct ? array($body) : ($body['_embedded'][$kind] ?? array());
        if (!is_array($rows)) {
            return new WP_Error('rrh_source_invalid', 'Bedriftsregisteret returnerte et uventet svar.', array('status' => 503));
        }
        $companies = array();
        foreach ($rows as $row) {
            $company = self::company($row, $kind, $data['retrievedAt']);
            if ($company !== null) {
                $companies[] = $company;
            }
        }
        return rest_ensure_response(array(
            'companies' => $companies,
            'hasMore' => !$direct && (($body['page']['totalElements'] ?? count($rows)) > count($rows)),
        ));
    }

    public static function companies($request) {
        $limited = self::rate_limit();
        if (is_wp_error($limited)) {
            return $limited;
        }
        if (!is_string($request->get_param('q'))) {
            return new WP_Error('rrh_invalid_query', 'Skriv et bedriftsnavn eller organisasjonsnummer.', array('status' => 400));
        }
        $query = trim($request->get_param('q'));
        $kind = $request->get_param('kind') ?: 'enheter';
        $length = function_exists('mb_strlen') ? mb_strlen($query) : strlen($query);
        if ($length < 2 || $length > 100 || !in_array($kind, array('enheter', 'underenheter'), true)) {
            return new WP_Error('rrh_invalid_query', 'Skriv 2–100 tegn og velg en gyldig enhetstype.', array('status' => 400));
        }
        $number = preg_replace('/\s+/', '', $query);
        if (preg_match('/^[0-9]{9}$/D', $number)) {
            $data = self::read($kind, '/' . $number);
            if (!is_wp_error($data) && !empty($data['missing']) && $kind === 'enheter') {
                $kind = 'underenheter';
                $data = self::read($kind, '/' . $number);
            }
            return self::list_response($data, $kind, true);
        }
        return self::list_response(self::read($kind, '', array('navn' => $query, 'size' => 12)), $kind);
    }

    public static function units($request) {
        $limited = self::rate_limit();
        if (is_wp_error($limited)) {
            return $limited;
        }
        $org = $request->get_param('org');
        if (!is_string($org)) {
            return new WP_Error('rrh_invalid_org', 'Velg et gyldig organisasjonsnummer.', array('status' => 400));
        }
        if (!preg_match('/^[0-9]{9}$/D', $org)) {
            return new WP_Error('rrh_invalid_org', 'Velg et gyldig organisasjonsnummer.', array('status' => 400));
        }
        return self::list_response(self::read('underenheter', '', array('overordnetEnhet' => $org, 'size' => 100)), 'underenheter');
    }
}

Ridderset_Hurtigsjekk::boot();
