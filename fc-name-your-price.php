<?php

/**
 * Plugin Name: Name Your Price for FluentCart
 * Description: Name-your-price and pay-what-you-want forms powered by FluentCart.
 * Version: 1.0.0
 * Author: Taylor Drayson
 * Text Domain: fc-name-your-price
 * Requires Plugins: fluent-cart
 * Requires at least: 6.0
 * Requires PHP: 8.1
 */

if (! defined('ABSPATH')) {
    exit;
}

define('FCNYP_VERSION', '1.0.0');
define('FCNYP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FCNYP_PLUGIN_URL', plugin_dir_url(__FILE__));

add_action('plugins_loaded', 'fcnyp_init');
add_action('init', 'fcnyp_register_block');
add_action('init', 'fcnyp_register_editor_assets', 20);

/**
 * Load plugin classes and register hooks.
 *
 * @return void
 */
function fcnyp_init()
{
    require_once FCNYP_PLUGIN_DIR . 'includes/class-shortcode.php';
    require_once FCNYP_PLUGIN_DIR . 'includes/class-fluentcart-integration.php';

    \FCNameYourPrice\Shortcode::register();
    \FCNameYourPrice\FluentCartIntegration::register();
}

/**
 * Register the Gutenberg block.
 *
 * @return void
 */
function fcnyp_register_block()
{
    if (! file_exists(FCNYP_PLUGIN_DIR . 'blocks/name-your-price/block.json')) {
        return;
    }

    register_block_type(FCNYP_PLUGIN_DIR . 'blocks/name-your-price');
}

/**
 * Inject currency settings into the block editor script.
 *
 * @return void
 */
function fcnyp_register_editor_assets()
{
    if (! class_exists('\\FluentCart\\Api\\CurrencySettings')) {
        return;
    }

    $currencySettings = \FluentCart\Api\CurrencySettings::get();
    $decimalSep = ($currencySettings['decimal_separator'] ?? 'dot') === 'comma' ? ',' : '.';

    $data = wp_json_encode([
        'currencySymbol'   => $currencySettings['currency_sign'] ?? '$',
        'currencyCode'     => $currencySettings['currency'] ?? 'USD',
        'currencyPosition' => $currencySettings['currency_position'] ?? 'before',
        'decimalSeparator' => $decimalSep,
        'thousandSeparator' => $decimalSep === ',' ? '.' : ',',
        'isZeroDecimal'    => $currencySettings['is_zero_decimal'] ?? false,
    ]);

    wp_add_inline_script(
        'fc-name-your-price-form-editor-script',
        "window.fcnypEditorSettings = {$data};",
        'before'
    );
}
