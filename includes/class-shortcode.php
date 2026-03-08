<?php

namespace FCNameYourPrice;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Handles the [fc_name_your_price] shortcode rendering.
 */
class Shortcode
{
    /**
     * Register the shortcode with WordPress.
     *
     * @return void
     */
    public static function register()
    {
        add_shortcode('fc_name_your_price', [self::class, 'render']);
    }

    /**
     * Get the default shortcode attributes.
     *
     * @return array<string, string>
     */
    public static function getDefaults()
    {
        return apply_filters('fcnyp_default_attributes', [
            'min'            => '1',
            'max'            => '10000',
            'show_presets'   => 'yes',
            'allow_custom'   => 'yes',
            'preset_amounts' => '5,10,25,50,100',
            'button_text'    => __('Pay {amount}', 'fc-name-your-price'),
            'default_amount'    => '',
            'product_title'     => __('Donation', 'fc-name-your-price'),
            'text_align'        => '',
            'form_title'        => '',
            'form_description'  => '',
            'subscription_button_text' => __('Pay {amount} per {frequency}', 'fc-name-your-price'),
            'subscription_mode' => 'off',
            'billing_interval'  => 'monthly',
            'cover_fees'        => 'off',
            'fee_percentage'    => '2.9',
            'fee_fixed'         => '0.30',
            'fee_text'          => __('Cover the {fee} transaction fee', 'fc-name-your-price'),
        ]);
    }

    /**
     * Render the shortcode output.
     *
     * @param array|string $atts Shortcode attributes.
     * @return string HTML output.
     */
    public static function render($atts)
    {
        $atts = shortcode_atts(self::getDefaults(), $atts, 'fc_name_your_price');

        $currencySettings = \FluentCart\Api\CurrencySettings::get();
        $decimalSepSetting = $currencySettings['decimal_separator'] ?? 'dot';

        $atts['currency_symbol']    = $currencySettings['currency_sign'] ?? '$';
        $atts['currency_position']  = $currencySettings['currency_position'] ?? 'before';
        $atts['currency_code']      = $currencySettings['currency'] ?? 'USD';
        $atts['is_zero_decimal']    = $currencySettings['is_zero_decimal'] ?? false;
        $atts['decimal_separator']  = $decimalSepSetting === 'comma' ? ',' : '.';
        $atts['thousand_separator'] = $atts['decimal_separator'] === ',' ? '.' : ',';
        $atts['currency_before']    = self::isCurrencyBefore($atts['currency_position']);

        self::enqueueAssets();

        $presetAmounts = apply_filters(
            'fcnyp_preset_amounts',
            array_map('trim', explode(',', $atts['preset_amounts']))
        );

        $showPresets = $atts['show_presets'] === 'yes';
        $allowCustom = $atts['allow_custom'] === 'yes';

        if (empty($atts['default_amount']) && ! empty($presetAmounts[0])) {
            $atts['default_amount'] = $presetAmounts[0];
        }

        // If there's no way to select an amount, fall back to allowing custom input.
        if (! $allowCustom && ! $showPresets && empty($atts['default_amount'])) {
            $allowCustom = true;
        }

        // For subscription modes, use the subscription button text
        if ($atts['subscription_mode'] === 'optional') {
            $atts['button_text_onetime']     = $atts['button_text'];
            $atts['button_text_subscription'] = $atts['subscription_button_text'];
        } elseif ($atts['subscription_mode'] === 'required') {
            $atts['button_text'] = $atts['subscription_button_text'];
        }

        $atts['rendered_button_text'] = self::renderButtonText($atts);

        $dataString  = self::buildDataString($atts);
        $isInline    = ! $showPresets && $atts['subscription_mode'] === 'off' && $atts['cover_fees'] !== 'optional';
        $layoutClass = $isInline ? 'fcnyp-form--inline' : 'fcnyp-form--stacked';
        $uniqueId    = 'fcnyp-' . wp_unique_id();

        ob_start();
        self::renderForm($uniqueId, $atts, $presetAmounts, $dataString, $showPresets, $allowCustom, $layoutClass);
        return ob_get_clean();
    }

    /**
     * Determine if the currency symbol is displayed before the amount.
     *
     * @param string $position Currency position setting from FluentCart.
     * @return bool
     */
    private static function isCurrencyBefore($position)
    {
        return in_array($position, ['before', 'iso_before', 'symbool_before_iso', 'symbool_and_iso'], true);
    }

    /**
     * Enqueue frontend CSS and JS assets.
     *
     * @return void
     */
    private static function enqueueAssets()
    {
        wp_enqueue_style('fcnyp-form', FCNYP_PLUGIN_URL . 'assets/css/pricing-form.css', [], FCNYP_VERSION);
        wp_enqueue_script('fcnyp-form', FCNYP_PLUGIN_URL . 'assets/js/pricing-form.js', [], FCNYP_VERSION, true);
    }

    /**
     * Build the HTML data attribute string for the form container.
     *
     * @param array $atts Processed shortcode attributes.
     * @return string Space-prefixed data attribute string.
     */
    private static function buildDataString($atts)
    {
        $dataAttrs = [
            'min'                => floatval($atts['min']),
            'max'                => floatval($atts['max']),
            'currency-symbol'    => esc_attr($atts['currency_symbol']),
            'currency-code'      => esc_attr($atts['currency_code']),
            'currency-position'  => esc_attr($atts['currency_position']),
            'decimal-separator'  => esc_attr($atts['decimal_separator']),
            'thousand-separator' => esc_attr($atts['thousand_separator']),
            'is-zero-decimal'    => $atts['is_zero_decimal'] ? 'true' : 'false',
            'error-min'          => esc_attr__('Please enter an amount of at least {amount}', 'fc-name-your-price'),
            'error-max'          => esc_attr__('Maximum amount is {amount}', 'fc-name-your-price'),
            'product-title'      => esc_attr($atts['product_title']),
            'checkout-url'       => esc_url(site_url('/')),
            'button-text'        => esc_attr($atts['button_text']),
            'allow-custom'       => $atts['allow_custom'] === 'yes' ? 'true' : 'false',
            'default-amount'     => floatval($atts['default_amount']),
            'subscription-mode'   => esc_attr($atts['subscription_mode']),
            'billing-interval'    => esc_attr($atts['billing_interval']),
            'frequency-noun'      => esc_attr(self::getFrequencyNoun($atts['billing_interval'])),
        ];

        if ($atts['subscription_mode'] === 'optional') {
            $dataAttrs['button-text-onetime']      = esc_attr($atts['button_text_onetime']);
            $dataAttrs['button-text-subscription']  = esc_attr($atts['subscription_button_text']);
        }

        if ($atts['cover_fees'] === 'optional') {
            $dataAttrs['cover-fees']    = 'optional';
            $dataAttrs['fee-percentage'] = floatval($atts['fee_percentage']);
            $dataAttrs['fee-fixed']     = floatval($atts['fee_fixed']);
            $dataAttrs['fee-text']      = esc_attr($atts['fee_text']);
        }

        $output = '';
        foreach ($dataAttrs as $key => $value) {
            $output .= sprintf(' data-%s="%s"', esc_attr($key), esc_attr($value));
        }

        return $output;
    }

    /**
     * Render the form HTML.
     *
     * @param string $uniqueId      Unique DOM id for this form instance.
     * @param array  $atts          Processed shortcode attributes.
     * @param array  $presetAmounts List of preset amount values.
     * @param string $dataString    HTML data attribute string.
     * @param bool   $showPresets   Whether to show preset buttons.
     * @param bool   $allowCustom   Whether the custom input is enabled.
     * @param string $layoutClass   CSS layout modifier class.
     * @return void
     */
    private static function renderForm($uniqueId, $atts, $presetAmounts, $dataString, $showPresets, $allowCustom, $layoutClass)
    {
        $defaultAmount = floatval($atts['default_amount']);
        $displayNumber = self::formatDisplayNumber($defaultAmount, $atts);
        $presets       = $showPresets ? self::preparePresets($presetAmounts, $allowCustom) : null;
        ?>
        <form id="<?php echo esc_attr($uniqueId); ?>" class="fcnyp-form <?php echo esc_attr($layoutClass); ?>"<?php echo $dataString; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
            <?php
            $headerStyle = '';
            $allowedAligns = ['left', 'center', 'right'];
            if (! empty($atts['text_align']) && in_array($atts['text_align'], $allowedAligns, true)) {
                $headerStyle = sprintf(' style="text-align:%s"', esc_attr($atts['text_align']));
            }
            ?>
            <?php if (! empty($atts['form_title'])) : ?>
            <div class="fcnyp-form__header"<?php echo $headerStyle; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
                <h3 class="fcnyp-form__title"><?php echo wp_kses($atts['form_title'], self::getAllowedFormattingTags()); ?></h3>
                <?php if (! empty($atts['form_description'])) : ?>
                    <p class="fcnyp-form__description"><?php echo wp_kses($atts['form_description'], self::getAllowedFormattingTags()); ?></p>
                <?php endif; ?>
            </div>
            <?php elseif (! empty($atts['form_description'])) : ?>
            <div class="fcnyp-form__header"<?php echo $headerStyle; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
                <p class="fcnyp-form__description"><?php echo wp_kses($atts['form_description'], self::getAllowedFormattingTags()); ?></p>
            </div>
            <?php endif; ?>
            <div class="fcnyp-form__input-wrap">
                <?php if ($atts['currency_before']) : ?>
                    <span class="fcnyp-form__currency"><?php echo esc_html($atts['currency_symbol']); ?></span>
                <?php endif; ?>
                <?php if ($allowCustom) : ?>
                <input
                    type="number"
                    class="fcnyp-form__amount"
                    min="<?php echo esc_attr($atts['min']); ?>"
                    max="<?php echo esc_attr($atts['max']); ?>"
                    step="<?php echo $atts['is_zero_decimal'] ? '1' : '0.01'; ?>"
                    placeholder="<?php echo $atts['is_zero_decimal'] ? '0' : '0.00'; ?>"
                    <?php if ($defaultAmount > 0) : ?>
                        value="<?php echo esc_attr($atts['default_amount']); ?>"
                    <?php endif; ?>
                    aria-label="<?php esc_attr_e('Enter amount', 'fc-name-your-price'); ?>"
                />
                <?php else : ?>
                <span class="fcnyp-form__amount-display"><?php echo esc_html($displayNumber); ?></span>
                <?php endif; ?>
                <?php if (! $atts['currency_before']) : ?>
                    <span class="fcnyp-form__currency"><?php echo esc_html($atts['currency_symbol']); ?></span>
                <?php endif; ?>
            </div>
            <?php if ($presets) : ?>
            <div class="fcnyp-form__presets" data-cols="<?php echo esc_attr($presets['cols']); ?>">
                <?php foreach ($presets['amounts'] as $amount) : ?>
                    <button
                        type="button"
                        class="fcnyp-form__preset <?php echo self::getPresetActiveClass($amount, $atts['default_amount']); ?>"
                        data-amount="<?php echo esc_attr($amount); ?>"
                    >
                        <?php if ($atts['currency_before']) : ?>
                            <span class="fcnyp-form__preset-currency"><?php echo esc_html($atts['currency_symbol']); ?></span><?php echo esc_html($amount); ?>
                        <?php else : ?>
                            <?php echo esc_html($amount); ?><span class="fcnyp-form__preset-currency"><?php echo esc_html($atts['currency_symbol']); ?></span>
                        <?php endif; ?>
                    </button>
                <?php endforeach; ?>
                <?php if ($allowCustom) : ?>
                    <button type="button" class="fcnyp-form__preset fcnyp-form__preset--custom" data-amount="custom">
                        <?php esc_html_e('Custom Amount', 'fc-name-your-price'); ?>
                    </button>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            <?php if ($atts['cover_fees'] === 'optional') : ?>
            <label class="fcnyp-form__cover-fees">
                <input type="checkbox" class="fcnyp-form__cover-fees-checkbox" />
                <span class="fcnyp-form__cover-fees-label">
                    <?php echo esc_html(self::renderFeeText($atts)); ?>
                </span>
            </label>
            <?php endif; ?>
            <?php if ($atts['subscription_mode'] === 'optional') : ?>
            <label class="fcnyp-form__subscription">
                <input type="checkbox" class="fcnyp-form__subscription-checkbox" />
                <span class="fcnyp-form__subscription-label">
                    <?php
                    /* translators: %s: billing interval label (e.g. "monthly", "yearly") */
                    printf(esc_html__('Make this %s', 'fc-name-your-price'), esc_html(self::getBillingLabel($atts['billing_interval'])));
                    ?>
                </span>
            </label>
            <?php endif; ?>
            <button type="submit" class="fcnyp-form__button"><?php echo esc_html($atts['rendered_button_text']); ?></button>
            <div class="fcnyp-form__error" aria-live="polite"></div>
        </form>
        <?php
    }

    /**
     * Format the default amount for the display-only element.
     *
     * @param float $amount The default amount.
     * @param array $atts   Processed shortcode attributes.
     * @return string Formatted number string, or empty if no amount.
     */
    private static function formatDisplayNumber($amount, $atts)
    {
        if ($amount <= 0) {
            return '';
        }

        $decimals = $atts['is_zero_decimal'] ? 0 : 2;

        return number_format($amount, $decimals, $atts['decimal_separator'], $atts['thousand_separator']);
    }

    /**
     * Prepare preset amounts, column count, and total buttons for rendering.
     *
     * @param array $presetAmounts Raw preset amount values.
     * @param bool  $allowCustom   Whether the custom amount button is shown.
     * @return array{amounts: array, cols: int}
     */
    private static function preparePresets($presetAmounts, $allowCustom)
    {
        $maxPresets = $allowCustom ? 5 : 6;
        $amounts    = array_slice($presetAmounts, 0, $maxPresets);
        $totalButtons = count($amounts) + ($allowCustom ? 1 : 0);

        return [
            'amounts' => $amounts,
            'cols'    => self::getColumnCount($totalButtons),
        ];
    }

    /**
     * Get the active CSS class for a preset button.
     *
     * @param string $amount        The preset amount value.
     * @param string $defaultAmount The currently selected default amount.
     * @return string The active class or empty string.
     */
    private static function getPresetActiveClass($amount, $defaultAmount)
    {
        return ($defaultAmount === $amount) ? 'fcnyp-form__preset--active' : '';
    }

    /**
     * Calculate the optimal grid column count for preset buttons.
     *
     * @param int $totalButtons Total number of buttons including custom.
     * @return int Column count (1-3).
     */
    private static function getColumnCount($totalButtons)
    {
        if ($totalButtons <= 3) {
            return $totalButtons;
        }

        if ($totalButtons % 3 === 0) {
            return 3;
        }

        if ($totalButtons % 2 === 0) {
            return 2;
        }

        return 3;
    }

    /**
     * Get a human-readable label for a billing interval.
     *
     * @param string $interval The billing interval key.
     * @return string Translated label.
     */
    private static function getBillingLabel($interval)
    {
        $labels = [
            'daily'       => __('daily', 'fc-name-your-price'),
            'weekly'      => __('weekly', 'fc-name-your-price'),
            'monthly'     => __('monthly', 'fc-name-your-price'),
            'quarterly'   => __('quarterly', 'fc-name-your-price'),
            'half_yearly' => __('half-yearly', 'fc-name-your-price'),
            'yearly'      => __('yearly', 'fc-name-your-price'),
        ];

        return $labels[$interval] ?? $labels['monthly'];
    }

    /**
     * Get a short frequency noun for display (e.g. "per month").
     *
     * @param string $interval The billing interval key.
     * @return string Translated short label.
     */
    private static function getFrequencyNoun($interval)
    {
        $nouns = [
            'daily'       => __('day', 'fc-name-your-price'),
            'weekly'      => __('week', 'fc-name-your-price'),
            'monthly'     => __('month', 'fc-name-your-price'),
            'quarterly'   => __('quarter', 'fc-name-your-price'),
            'half_yearly' => __('six months', 'fc-name-your-price'),
            'yearly'      => __('year', 'fc-name-your-price'),
        ];

        return $nouns[$interval] ?? $nouns['monthly'];
    }

    /**
     * Get the allowed HTML tags for form title and description fields.
     *
     * Matches the formatting options available in the RichText block editor component.
     *
     * @return array<string, array<string, bool>>
     */
    private static function getAllowedFormattingTags()
    {
        return [
            'strong' => [],
            'em'     => [],
            'br'     => [],
            's'      => [],
            'del'    => [],
            'sub'    => [],
            'sup'    => [],
            'a'      => [
                'href'   => true,
                'target' => true,
                'rel'    => true,
            ],
            'code'   => [],
            'mark'   => [
                'style' => true,
                'class' => true,
            ],
            'kbd'    => [],
            'bdo'    => [
                'dir' => true,
            ],
            'img'    => [
                'src'    => true,
                'alt'    => true,
                'class'  => true,
                'width'  => true,
                'height' => true,
            ],
            'span'   => [
                'style' => true,
                'class' => true,
                'lang'  => true,
            ],
        ];
    }

    /**
     * Render the button text, replacing {amount} and {frequency} placeholders.
     *
     * @param array $atts Processed shortcode attributes.
     * @return string Rendered button text.
     */
    private static function renderButtonText($atts)
    {
        $text = $atts['button_text'];

        // Replace {frequency}
        if (strpos($text, '{frequency}') !== false) {
            if ($atts['subscription_mode'] !== 'off') {
                $text = str_replace('{frequency}', self::getFrequencyNoun($atts['billing_interval']), $text);
            } else {
                $text = str_replace('{frequency}', '', $text);
            }
        }

        // Replace {amount}
        if (strpos($text, '{amount}') !== false) {
            $amount = floatval($atts['default_amount']);

            if ($amount <= 0) {
                $text = str_replace('{amount}', '', $text);
            } else {
                $priceInCents = round($amount * 100);
                $formatted    = \FluentCart\Api\CurrencySettings::getFormattedPrice($priceInCents);
                $text         = str_replace('{amount}', $formatted, $text);
            }
        }

        return trim(preg_replace('/\s+/', ' ', $text));
    }

    /**
     * Render the fee checkbox text, replacing the {fee} placeholder with the
     * calculated fee based on the default amount.
     *
     * @param array $atts Processed shortcode attributes.
     * @return string Rendered fee text.
     */
    private static function renderFeeText($atts)
    {
        $text       = $atts['fee_text'];
        $amount     = floatval($atts['default_amount']);
        $percentage = floatval($atts['fee_percentage']);
        $fixed      = floatval($atts['fee_fixed']);

        if (strpos($text, '{fee}') !== false) {
            if ($amount > 0) {
                $fee          = ($amount * $percentage / 100) + $fixed;
                $feeInCents   = round($fee * 100);
                $formattedFee = \FluentCart\Api\CurrencySettings::getFormattedPrice($feeInCents);
                $text         = str_replace('{fee}', $formattedFee, $text);
            } else {
                $text = str_replace('{fee}', '', $text);
            }
        }

        return trim(preg_replace('/\s+/', ' ', $text));
    }
}
