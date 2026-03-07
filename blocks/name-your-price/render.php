<?php
if (! defined('ABSPATH')) {
    exit;
}

$shortcode_atts = [
    'min'             => $attributes['min'] ?? '1',
    'max'             => $attributes['max'] ?? '10000',
    'show_presets'    => $attributes['showPresets'] ?? 'yes',
    'allow_custom'    => $attributes['allowCustom'] ?? 'yes',
    'preset_amounts'  => $attributes['presetAmounts'] ?? '10,25,50,100',
    'button_text'     => $attributes['buttonText'] ?? __('Donate Now', 'fc-name-your-price'),
    'default_amount'  => $attributes['defaultAmount'] ?? '',
    'product_title'   => $attributes['productTitle'] ?? __('Donation', 'fc-name-your-price'),
];

echo \FCNameYourPrice\Shortcode::render($shortcode_atts);
