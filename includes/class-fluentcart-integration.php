<?php

namespace FCNameYourPrice;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Hooks into FluentCart's custom item validation to handle name-your-price items.
 */
class FluentCartIntegration
{
    /**
     * Register FluentCart filter hooks.
     *
     * @return void
     */
    public static function register()
    {
        add_filter('fluent_cart/cart/validate_custom_item', [self::class, 'validateCustomItem'], 10, 2);
        add_filter('fluent_cart/payment/validate_custom_item', [self::class, 'validatePaymentItem'], 10, 2);
    }

    /**
     * Validate a custom cart item and build its variation data.
     *
     * Only processes items prefixed with "fcnyp_". Returns a WP_Error
     * for invalid amounts, or an object with the variation data on success.
     *
     * @param mixed $variation The existing variation (null for new items).
     * @param array $item      The cart item data containing item_id.
     * @return object|\WP_Error|mixed Variation object, WP_Error, or passthrough.
     */
    public static function validateCustomItem($variation, $item)
    {
        $itemId = $item['item_id'] ?? '';

        if (strpos((string) $itemId, 'fcnyp_') !== 0) {
            return $variation;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $nonce = isset($_GET['_fcnyp_nonce']) ? sanitize_text_field($_GET['_fcnyp_nonce']) : '';

        if (! wp_verify_nonce($nonce, 'fcnyp_checkout')) {
            wp_safe_redirect(home_url('/'));
            exit;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $productTitle = sanitize_text_field(wp_unslash($_GET['product_title'] ?? __('Donation', 'fc-name-your-price')));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $subscriptionMode = isset($_GET['fcnyp_subscription_mode']) ? sanitize_text_field($_GET['fcnyp_subscription_mode']) : 'off';
        $allowedIntervals = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $billingInterval = isset($_GET['billing_interval']) && in_array($_GET['billing_interval'], $allowedIntervals, true)
            ? $_GET['billing_interval']
            : 'monthly';
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $min = isset($_GET['fcnyp_min']) ? floatval($_GET['fcnyp_min']) : 1;
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $max = isset($_GET['fcnyp_max']) ? floatval($_GET['fcnyp_max']) : 10000;

        // Verify the signature matches the form config to prevent tampering.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $signature = isset($_GET['_fcnyp_sig']) ? sanitize_text_field($_GET['_fcnyp_sig']) : '';
        $expectedPayload = implode('|', [$productTitle, $subscriptionMode, $billingInterval, $min, $max]);
        $expectedSignature = hash_hmac('sha256', $expectedPayload, wp_salt('nonce'));

        if (! hash_equals($expectedSignature, $signature)) {
            wp_safe_redirect(home_url('/'));
            exit;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $amount = isset($_GET['amount']) ? floatval($_GET['amount']) : 0;
        $min    = apply_filters('fcnyp_min_amount', $min);
        $max    = apply_filters('fcnyp_max_amount', $max);

        if ($amount <= 0) {
            return new \WP_Error(
                'fcnyp_invalid_amount',
                __('Please enter a valid amount.', 'fc-name-your-price')
            );
        }

        if ($amount < $min) {
            return new \WP_Error(
                'fcnyp_amount_too_low',
                /* translators: %s: formatted minimum amount */
                sprintf(__('Minimum amount is %s.', 'fc-name-your-price'), self::formatPrice($min))
            );
        }

        if ($amount > $max) {
            return new \WP_Error(
                'fcnyp_amount_too_high',
                /* translators: %s: formatted maximum amount */
                sprintf(__('Maximum amount is %s.', 'fc-name-your-price'), self::formatPrice($max))
            );
        }

        $priceInCents = round($amount * 100);

        $productTitle = apply_filters('fcnyp_product_title', $productTitle);

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $paymentType = isset($_GET['payment_type']) && $_GET['payment_type'] === 'subscription'
            ? 'subscription'
            : 'onetime';

        // Enforce subscription mode from the signed config.
        if ($paymentType === 'subscription' && $subscriptionMode === 'off') {
            $paymentType = 'onetime';
        }

        $otherInfo = ['payment_type' => $paymentType];

        if ($paymentType === 'subscription') {
            $otherInfo['repeat_interval'] = $billingInterval;
        }

        return (object) apply_filters('fcnyp_variation_data', [
            'item_id'           => $itemId,
            'object_id'         => $itemId,
            'post_id'           => 0,
            'quantity'          => 1,
            'price'             => $priceInCents,
            'unit_price'        => $priceInCents,
            'line_total'        => $priceInCents,
            'post_title'        => $productTitle,
            'title'             => $productTitle,
            'is_custom'         => true,
            'payment_type'      => $paymentType,
            'fulfillment_type'  => 'digital',
            'sold_individually' => 1,
            'other_info'        => $otherInfo,
        ], $amount, $item);
    }

    /**
     * Validate a custom item during payment processing.
     *
     * Passes through items that don't belong to this plugin.
     *
     * @param array $items Array of [product, variation].
     * @param array $data  Payment data.
     * @return array The items array.
     */
    public static function validatePaymentItem($items, $data)
    {
        [$product, $variation] = $items;

        $itemId = $variation->object_id ?? ($variation->item_id ?? '');

        if (strpos((string) $itemId, 'fcnyp_') !== 0) {
            return $items;
        }

        return [$product, $variation];
    }

    /**
     * Format an amount in the store currency using FluentCart's formatter.
     *
     * @param float $amount Amount in major currency units (e.g. dollars).
     * @return string Formatted price string.
     */
    private static function formatPrice($amount)
    {
        return \FluentCart\Api\CurrencySettings::getFormattedPrice(round($amount * 100));
    }
}
