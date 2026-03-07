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
        $amount = isset($_GET['donation_amount']) ? floatval($_GET['donation_amount']) : 0;
        $min    = apply_filters('fcnyp_min_amount', 1);
        $max    = apply_filters('fcnyp_max_amount', 10000);

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

        $productTitle = apply_filters(
            'fcnyp_product_title',
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            sanitize_text_field(wp_unslash($_GET['product_title'] ?? __('Donation', 'fc-name-your-price')))
        );

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
            'payment_type'      => 'onetime',
            'fulfillment_type'  => 'digital',
            'sold_individually' => 1,
            'other_info'        => [
                'payment_type' => 'onetime',
            ],
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
