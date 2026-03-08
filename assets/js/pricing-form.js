(function () {
  'use strict';

  /**
   * Name Your Price form controller.
   *
   * Manages preset selection, custom input, amount display,
   * button text updates, validation, and checkout redirect.
   */
  class PricingForm {
    /**
     * @param {HTMLElement} el - The .fcnyp-form root element.
     */
    constructor(el) {
      this.el = el;

      this.els = {
        input:                el.querySelector('.fcnyp-form__amount'),
        amountDisplay:        el.querySelector('.fcnyp-form__amount-display'),
        button:               el.querySelector('.fcnyp-form__button'),
        error:                el.querySelector('.fcnyp-form__error'),
        presets:              el.querySelectorAll('.fcnyp-form__preset'),
        subscriptionCheckbox: el.querySelector('.fcnyp-form__subscription-checkbox'),
        coverFeesCheckbox:    el.querySelector('.fcnyp-form__cover-fees-checkbox'),
        coverFeesLabel:       el.querySelector('.fcnyp-form__cover-fees-label'),
      };

      this.config = {
        min:            parseFloat(el.dataset.min) || 1,
        max:            parseFloat(el.dataset.max) || 10000,
        checkoutUrl:    el.dataset.checkoutUrl || '/',
        nonce:          el.dataset.nonce || '',
        signature:      el.dataset.signature || '',
        productTitle:   el.dataset.productTitle || 'Donation',
        currencyPos:    el.dataset.currencyPosition || 'before',
        currencySymbol: el.dataset.currencySymbol || '$',
        currencyCode:   el.dataset.currencyCode || 'USD',
        decimalSep:     el.dataset.decimalSeparator || '.',
        thousandSep:    el.dataset.thousandSeparator || ',',
        isZeroDecimal:  el.dataset.isZeroDecimal === 'true',
        errorMin:           (window.fcnypI18n && window.fcnypI18n.errorMin) || 'Please enter an amount of at least {amount}',
        errorMax:           (window.fcnypI18n && window.fcnypI18n.errorMax) || 'Maximum amount is {amount}',
        buttonTemplate:             el.dataset.buttonText || 'Pay',
        buttonTemplateOnetime:      el.dataset.buttonTextOnetime || el.dataset.buttonText || 'Pay',
        buttonTemplateSubscription: el.dataset.buttonTextSubscription || el.dataset.buttonText || 'Pay',
        subscriptionMode:  el.dataset.subscriptionMode || 'off',
        billingInterval:   el.dataset.billingInterval || 'monthly',
        frequencyNoun:     el.dataset.frequencyNoun || 'month',
        coverFeesMode:  el.dataset.coverFees || 'off',
        feePercentage:  parseFloat(el.dataset.feePercentage) || 0,
        feeFixed:       parseFloat(el.dataset.feeFixed) || 0,
        feeText:        el.dataset.feeText || '',
      };

      this.paymentType    = this.config.subscriptionMode === 'required' ? 'subscription' : 'onetime';
      this.coverFees      = false;
      this.selectedAmount = this.els.input && this.els.input.value
        ? parseFloat(this.els.input.value)
        : parseFloat(el.dataset.defaultAmount) || 0;

      this.autoSelectFirstPreset();
      this.updateAmountDisplay();
      this.updateButtonText();
      this.updateFeeText();
      this.bindEvents();
    }

    /**
     * If no amount is selected, auto-select the first non-custom preset.
     */
    autoSelectFirstPreset() {
      if (this.selectedAmount || !this.els.presets.length) {
        return;
      }

      var first = this.els.presets[0];

      if (first.dataset.amount === 'custom') {
        return;
      }

      this.selectedAmount = parseFloat(first.dataset.amount);
      first.classList.add('fcnyp-form__preset--active');

      if (this.els.input) {
        this.els.input.value = this.selectedAmount;
      }
    }

    /**
     * Bind click and input event listeners.
     */
    bindEvents() {
      this.els.presets.forEach(function (preset) {
        preset.addEventListener('click', this.onPresetClick.bind(this, preset));
      }.bind(this));

      if (this.els.input) {
        this.els.input.addEventListener('input', this.onInputChange.bind(this));
      }

      this.el.addEventListener('submit', this.onSubmit.bind(this));

      if (this.els.subscriptionCheckbox) {
        this.els.subscriptionCheckbox.addEventListener('change', this.onSubscriptionToggle.bind(this));
      }

      if (this.els.coverFeesCheckbox) {
        this.els.coverFeesCheckbox.addEventListener('change', this.onCoverFeesToggle.bind(this));
      }
    }

    /**
     * Handle the subscription checkbox toggle.
     */
    onSubscriptionToggle() {
      this.paymentType = this.els.subscriptionCheckbox.checked ? 'subscription' : 'onetime';
      this.updateButtonText();
    }

    /**
     * Handle the cover fees checkbox toggle.
     */
    onCoverFeesToggle() {
      this.coverFees = this.els.coverFeesCheckbox.checked;
    }

    /**
     * Calculate the transaction fee for a given amount.
     *
     * @param {number} amount - The base amount.
     * @return {number} The fee amount.
     */
    calculateFee(amount) {
      return (amount * this.config.feePercentage / 100) + this.config.feeFixed;
    }

    /**
     * Update the fee label text with the current fee amount.
     */
    updateFeeText() {
      if (!this.els.coverFeesLabel || !this.config.feeText) {
        return;
      }

      var text = this.config.feeText;
      if (text.indexOf('{fee}') !== -1) {
        if (this.selectedAmount > 0) {
          var fee = this.calculateFee(this.selectedAmount);
          text = text.replace('{fee}', this.formatAmount(fee));
        } else {
          text = text.replace('{fee}', '');
        }
      }

      this.els.coverFeesLabel.textContent = text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Handle a preset button click.
     *
     * @param {HTMLElement} preset - The clicked preset button.
     */
    onPresetClick(preset) {
      this.els.presets.forEach(function (p) {
        p.classList.remove('fcnyp-form__preset--active');
      });
      preset.classList.add('fcnyp-form__preset--active');

      if (preset.dataset.amount === 'custom') {
        if (this.els.input) {
          this.els.input.value = '';
          this.els.input.focus();
        }
        this.selectedAmount = 0;
      } else {
        this.selectedAmount = parseFloat(preset.dataset.amount);
        if (this.els.input) {
          this.els.input.value = this.selectedAmount;
        }
      }

      this.updateAmountDisplay();
      this.updateButtonText();
      this.updateFeeText();
      this.clearError();
    }

    /**
     * Handle typing in the custom amount input.
     */
    onInputChange() {
      this.selectedAmount = parseFloat(this.els.input.value) || 0;

      this.els.presets.forEach(function (p) {
        var matches = parseFloat(p.dataset.amount) === this.selectedAmount;
        p.classList.toggle('fcnyp-form__preset--active', matches);
      }.bind(this));

      this.updateAmountDisplay();
      this.updateButtonText();
      this.updateFeeText();
      this.clearError();
    }

    /**
     * Handle the submit/checkout button click.
     */
    onSubmit(e) {
      e.preventDefault();

      if (!this.selectedAmount || this.selectedAmount < this.config.min) {
        this.showError(this.config.errorMin.replace('{amount}', this.formatAmount(this.config.min)));
        return;
      }

      if (this.selectedAmount > this.config.max) {
        this.showError(this.config.errorMax.replace('{amount}', this.formatAmount(this.config.max)));
        return;
      }

      var totalAmount = this.selectedAmount;
      if (this.coverFees && this.config.coverFeesMode === 'optional') {
        totalAmount += this.calculateFee(this.selectedAmount);
      }

      var params = new URLSearchParams({
        'fluent-cart': 'instant_checkout',
        item_id: 'fcnyp_' + Date.now(),
        quantity: '1',
        is_custom: 'true',
        amount: totalAmount.toString(),
        base_amount: this.selectedAmount.toString(),
        product_title: this.config.productTitle,
        payment_type: this.paymentType,
        billing_interval: this.config.billingInterval,
        fcnyp_min: this.config.min.toString(),
        fcnyp_max: this.config.max.toString(),
        fcnyp_subscription_mode: this.config.subscriptionMode,
        _fcnyp_nonce: this.config.nonce,
        _fcnyp_sig: this.config.signature,
      });

      window.location.href = this.config.checkoutUrl + '?' + params.toString();
    }

    /**
     * Format a number with the store's decimal and thousand separators.
     *
     * @param {number} amount - The amount to format.
     * @return {string} Formatted number string.
     */
    formatNumber(amount) {
      var decimals = this.config.isZeroDecimal ? 0 : 2;
      var parts = amount.toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.config.thousandSep);
      return parts.length > 1 ? parts[0] + this.config.decimalSep + parts[1] : parts[0];
    }

    /**
     * Format an amount with the full currency symbol and position.
     *
     * @param {number} amount - The amount to format.
     * @return {string} Formatted currency string.
     */
    formatAmount(amount) {
      var price = this.formatNumber(amount);

      switch (this.config.currencyPos) {
        case 'after':              return price + this.config.currencySymbol;
        case 'iso_before':         return this.config.currencyCode + ' ' + price;
        case 'iso_after':          return price + ' ' + this.config.currencyCode;
        case 'symbool_before_iso': return this.config.currencySymbol + price + ' ' + this.config.currencyCode;
        case 'symbool_after_iso':  return this.config.currencyCode + ' ' + price + this.config.currencySymbol;
        case 'symbool_and_iso':    return this.config.currencyCode + ' ' + this.config.currencySymbol + price;
        case 'before':
        default:                   return this.config.currencySymbol + price;
      }
    }

    /**
     * Update the display-only amount element (when custom input is disabled).
     */
    updateAmountDisplay() {
      if (!this.els.amountDisplay) {
        return;
      }

      this.els.amountDisplay.textContent = this.selectedAmount > 0
        ? this.formatNumber(this.selectedAmount)
        : '';
    }

    /**
     * Update the submit button text, replacing {amount} and {frequency} placeholders.
     */
    updateButtonText() {
      if (!this.els.button) {
        return;
      }

      var text = this.paymentType === 'subscription'
        ? this.config.buttonTemplateSubscription
        : this.config.buttonTemplateOnetime;

      // Replace {frequency}
      if (text.indexOf('{frequency}') !== -1) {
        if (this.paymentType === 'subscription') {
          text = text.replace('{frequency}', this.config.frequencyNoun);
        } else {
          text = text.replace('{frequency}', '');
        }
      }

      // Replace {amount}
      if (text.indexOf('{amount}') !== -1) {
        if (this.selectedAmount > 0) {
          text = text.replace('{amount}', this.formatAmount(this.selectedAmount));
        } else {
          text = text.replace('{amount}', '');
        }
      }

      this.els.button.textContent = text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Display a validation error message.
     *
     * @param {string} msg - The error message to display.
     */
    showError(msg) {
      if (!this.els.error) {
        return;
      }

      this.els.error.textContent = msg;
    }

    /**
     * Clear the validation error message.
     */
    clearError() {
      if (!this.els.error) {
        return;
      }

      this.els.error.textContent = '';
    }
  }

  /**
   * Initialise all pricing forms on the page.
   */
  function initAll() {
    document.querySelectorAll('.fcnyp-form').forEach(function (el) {
      new PricingForm(el);
    });
  }

  document.addEventListener('DOMContentLoaded', initAll);
})();
