<?php
// Run with: php tests/wordpress-brreg-cache.php
// WordPress hooks, HTTP and transients are isolated here without WordPress or a database.
define('ABSPATH', __DIR__);
define('MINUTE_IN_SECONDS', 60);

class WP_Error {
    public $code;
    public $data;

    public function __construct($code, $message, $data) {
        $this->code = $code;
        $this->data = $data;
    }
}

class Fixture_Request {
    private $params;

    public function __construct($params) { $this->params = $params; }
    public function get_param($key) { return $this->params[$key] ?? null; }
}

$transients = array();
$http_fixtures = array();
$http_calls = array();

function add_action(...$args) {}
function add_filter(...$args) {}
function add_shortcode(...$args) {}
function wp_salt($scheme) { return 'synthetic-test-salt'; }
function sanitize_text_field($value) { return trim(strip_tags($value)); }
function is_wp_error($value) { return $value instanceof WP_Error; }
function rest_ensure_response($value) { return $value; }
function get_transient($key) { return $GLOBALS['transients'][$key]['value'] ?? false; }
function set_transient($key, $value, $ttl) {
    $GLOBALS['transients'][$key] = array('value' => $value, 'ttl' => $ttl);
}
function add_query_arg($query, $url) { return $url . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986); }
function wp_remote_retrieve_response_code($response) { return $response['status']; }
function wp_remote_retrieve_body($response) { return json_encode($response['payload']); }
function wp_safe_remote_get($url, $args) {
    $GLOBALS['http_calls'][] = $url;
    if (!array_key_exists($url, $GLOBALS['http_fixtures'])) {
        throw new RuntimeException('Missing HTTP fixture for ' . $url);
    }
    return $GLOBALS['http_fixtures'][$url];
}

function same($actual, $expected, $message) {
    if ($actual !== $expected) {
        throw new RuntimeException($message);
    }
}

require $argv[1] ?? __DIR__ . '/../integrations/wordpress/ridderset-hurtigsjekk/ridderset-hurtigsjekk.php';

$api = Ridderset_Hurtigsjekk::API;
$org = '100000001';
$unit_org = '100000002';
$row = array(
    'navn' => 'Syntetisk AS',
    'organisasjonsnummer' => $org,
    'antallAnsatte' => 0,
    'kontaktperson' => 'private fixture marker',
    'forretningsadresse' => array('kommune' => 'Syntetisk kommune', 'kommunenummer' => '1000'),
);
$query = add_query_arg(array('navn' => 'Syntetisk', 'size' => 12), $api . 'enheter');
$legacy_key = 'rrh_brreg_' . hash('sha256', $query);
$cache_key = 'rrh_brreg_v2_' . hash('sha256', $query);
set_transient($legacy_key, array('body' => array(), 'retrievedAt' => '2026-01-01T00:00:00Z'), 300);
$http_fixtures[$query] = array('status' => 200, 'payload' => array(
    '_embedded' => array('enheter' => array($row, array('slettedato' => '2026-01-01'))),
    'page' => array('totalElements' => 2),
));
$request = new Fixture_Request(array('q' => 'Syntetisk'));
$response = Ridderset_Hurtigsjekk::companies($request);
same($http_calls, array($query), 'Expected a versioned cache miss.');
same(count($response['companies']), 1, 'Excluded records must stay excluded.');
same($response['companies'][0]['employees'], 0, 'Registered zero must stay zero.');
same($response['hasMore'], false, 'Pagination counts upstream rows before filtering.');
same($transients[$cache_key], array('value' => $response, 'ttl' => 300), 'Only the public response belongs in the cache.');
same(strpos(serialize($transients[$cache_key]), 'private fixture marker'), false, 'Unmapped fixture fields must stay out of the cache.');
unset($http_fixtures[$query]);
same(Ridderset_Hurtigsjekk::companies($request), $response, 'Cache hit must preserve the response and timestamp.');
same($http_calls, array($query), 'Cache hit must avoid another outbound call.');

$direct = $api . 'enheter/' . $unit_org;
$unit = $api . 'underenheter/' . $unit_org;
$unit_row = array(
    'navn' => 'Syntetisk underenhet',
    'organisasjonsnummer' => $unit_org,
    'overordnetEnhet' => $org,
    'beliggenhetsadresse' => array('kommune' => 'Syntetisk arbeidssted', 'kommunenummer' => '1200'),
);
$http_fixtures[$direct] = array('status' => 410, 'payload' => null);
$http_fixtures[$unit] = array('status' => 200, 'payload' => $unit_row);
$matched_unit = Ridderset_Hurtigsjekk::companies(new Fixture_Request(array('q' => $unit_org)));
same(array_slice($http_calls, -2), array($direct, $unit), 'Missing main entity must fall back to the subunit route.');
same($matched_unit['companies'][0]['parent'], $org, 'Subunit must keep its parent.');
same($matched_unit['companies'][0]['town'], '1200', 'Subunit must retain its workplace.');
same($matched_unit['companies'][0]['employees'], null, 'Unknown employee count must stay unknown.');

$units = add_query_arg(array('overordnetEnhet' => $org, 'size' => 100), $api . 'underenheter');
$http_fixtures[$units] = array('status' => 200, 'payload' => array(
    '_embedded' => array('underenheter' => array($unit_row)),
    'page' => array('totalElements' => 3),
));
$unit_list = Ridderset_Hurtigsjekk::units(new Fixture_Request(array('org' => $org)));
same($unit_list['companies'][0]['org'], $unit_org, 'Listing units must use the normalized projection.');
same($unit_list['hasMore'], true, 'The units route must retain pagination.');

$bad_url = add_query_arg(array('navn' => 'Malformed', 'size' => 12), $api . 'enheter');
$http_fixtures[$bad_url] = array('status' => 200, 'payload' => array('unexpected' => 'fixture'));
$invalid = Ridderset_Hurtigsjekk::companies(new Fixture_Request(array('q' => 'Malformed')));
same($invalid->code, 'rrh_source_invalid', 'Unexpected source shape must remain an error.');
same($invalid->data, array('status' => 503), 'Unexpected source shape must stay unavailable.');
same(get_transient('rrh_brreg_v2_' . hash('sha256', $bad_url)), false, 'Invalid results must stay out of the cache.');
$http_fixtures[$bad_url] = array('status' => 429, 'payload' => null);
$limited = Ridderset_Hurtigsjekk::companies(new Fixture_Request(array('q' => 'Malformed')));
same($limited->data, array('status' => 429), 'Upstream rate limits must stay visible.');

echo "WordPress Brreg cache checks passed.\n";
