<?php
if (! defined('ABSPATH')) {
    exit;
}

$shortcode_atts = [
    'min'             => $attributes['min'] ?? '1',
    'max'             => $attributes['max'] ?? '10000',
    'show_presets'    => $attributes['showPresets'] ?? 'yes',
    'allow_custom'    => $attributes['allowCustom'] ?? 'yes',
    'preset_amounts'  => $attributes['presetAmounts'] ?? '5,10,25,50,100',
    'button_text'     => $attributes['buttonText'] ?? __('Pay {amount}', 'fc-name-your-price'),
    'default_amount'  => $attributes['defaultAmount'] ?? '',
    'product_title'      => $attributes['productTitle'] ?? __('Donation', 'fc-name-your-price'),
    'text_align'         => $attributes['textAlign'] ?? '',
    'form_title'         => $attributes['formTitle'] ?? '',
    'form_description'   => $attributes['formDescription'] ?? '',
    'subscription_button_text' => $attributes['subscriptionButtonText'] ?? __('Pay {amount} per {frequency}', 'fc-name-your-price'),
    'subscription_mode'  => $attributes['subscriptionMode'] ?? 'off',
    'billing_interval'   => $attributes['billingInterval'] ?? 'monthly',
    'cover_fees'         => $attributes['coverFees'] ?? 'off',
    'fee_percentage'     => $attributes['feePercentage'] ?? '2.9',
    'fee_fixed'          => $attributes['feeFixed'] ?? '0.30',
    'fee_text'           => $attributes['feeText'] ?? __('Cover the {fee} transaction fee', 'fc-name-your-price'),
];

echo \FCNameYourPrice\Shortcode::render($shortcode_atts);
