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
      this.el             = el;
      this.input          = el.querySelector('.fcnyp-form__amount');
      this.amountDisplay  = el.querySelector('.fcnyp-form__amount-display');
      this.button         = el.querySelector('.fcnyp-form__button');
      this.errorEl        = el.querySelector('.fcnyp-form__error');
      this.presets        = el.querySelectorAll('.fcnyp-form__preset');
      this.min            = parseFloat(el.dataset.min) || 1;
      this.max            = parseFloat(el.dataset.max) || 10000;
      this.checkoutUrl    = el.dataset.checkoutUrl || '/';
      this.productTitle   = el.dataset.productTitle || 'Donation';
      this.currencyPos    = el.dataset.currencyPosition || 'before';
      this.currencySymbol = el.dataset.currencySymbol || '$';
      this.currencyCode   = el.dataset.currencyCode || 'USD';
      this.decimalSep     = el.dataset.decimalSeparator || '.';
      this.thousandSep    = el.dataset.thousandSeparator || ',';
      this.isZeroDecimal  = el.dataset.isZeroDecimal === 'true';
      this.buttonTemplate = el.dataset.buttonText || 'Donate Now';

      var defaultAmount    = parseFloat(el.dataset.defaultAmount) || 0;
      this.selectedAmount  = this.input && this.input.value ? parseFloat(this.input.value) : defaultAmount;

      this.autoSelectFirstPreset();
      this.updateAmountDisplay();
      this.updateButtonText();
      this.bindEvents();
    }

    /**
     * If no amount is selected, auto-select the first non-custom preset.
     */
    autoSelectFirstPreset() {
      if (this.selectedAmount || !this.presets.length) {
        return;
      }

      var first = this.presets[0];

      if (first.dataset.amount === 'custom') {
        return;
      }

      this.selectedAmount = parseFloat(first.dataset.amount);
      first.classList.add('fcnyp-form__preset--active');

      if (this.input) {
        this.input.value = this.selectedAmount;
      }
    }

    /**
     * Bind click and input event listeners.
     */
    bindEvents() {
      this.presets.forEach(function (preset) {
        preset.addEventListener('click', this.onPresetClick.bind(this, preset));
      }.bind(this));

      if (this.input) {
        this.input.addEventListener('input', this.onInputChange.bind(this));
      }

      if (this.button) {
        this.button.addEventListener('click', this.onSubmit.bind(this));
      }
    }

    /**
     * Handle a preset button click.
     *
     * @param {HTMLElement} preset - The clicked preset button.
     */
    onPresetClick(preset) {
      this.presets.forEach(function (p) {
        p.classList.remove('fcnyp-form__preset--active');
      });
      preset.classList.add('fcnyp-form__preset--active');

      if (preset.dataset.amount === 'custom') {
        if (this.input) {
          this.input.value = '';
          this.input.focus();
        }
        this.selectedAmount = 0;
      } else {
        this.selectedAmount = parseFloat(preset.dataset.amount);
        if (this.input) {
          this.input.value = this.selectedAmount;
        }
      }

      this.updateAmountDisplay();
      this.updateButtonText();
      this.clearError();
    }

    /**
     * Handle typing in the custom amount input.
     */
    onInputChange() {
      this.selectedAmount = parseFloat(this.input.value) || 0;

      this.presets.forEach(function (p) {
        var matches = parseFloat(p.dataset.amount) === this.selectedAmount;
        p.classList.toggle('fcnyp-form__preset--active', matches);
      }.bind(this));

      this.updateAmountDisplay();
      this.updateButtonText();
      this.clearError();
    }

    /**
     * Handle the submit/checkout button click.
     */
    onSubmit() {
      if (!this.selectedAmount || this.selectedAmount < this.min) {
        this.showError('Please enter an amount of at least ' + this.formatAmount(this.min));
        return;
      }

      if (this.selectedAmount > this.max) {
        this.showError('Maximum amount is ' + this.formatAmount(this.max));
        return;
      }

      var params = new URLSearchParams({
        'fluent-cart': 'instant_checkout',
        item_id: 'fcnyp_' + Date.now(),
        quantity: '1',
        is_custom: 'true',
        donation_amount: this.selectedAmount.toString(),
        product_title: this.productTitle,
      });

      window.location.href = this.checkoutUrl + '?' + params.toString();
    }

    /**
     * Format a number with the store's decimal and thousand separators.
     *
     * @param {number} amount - The amount to format.
     * @return {string} Formatted number string.
     */
    formatNumber(amount) {
      var decimals = this.isZeroDecimal ? 0 : 2;
      var parts = amount.toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.thousandSep);
      return parts.length > 1 ? parts[0] + this.decimalSep + parts[1] : parts[0];
    }

    /**
     * Format an amount with the full currency symbol and position.
     *
     * @param {number} amount - The amount to format.
     * @return {string} Formatted currency string.
     */
    formatAmount(amount) {
      var price = this.formatNumber(amount);

      switch (this.currencyPos) {
        case 'after':              return price + this.currencySymbol;
        case 'iso_before':         return this.currencyCode + ' ' + price;
        case 'iso_after':          return price + ' ' + this.currencyCode;
        case 'symbool_before_iso': return this.currencySymbol + price + ' ' + this.currencyCode;
        case 'symbool_after_iso':  return this.currencyCode + ' ' + price + this.currencySymbol;
        case 'symbool_and_iso':    return this.currencyCode + ' ' + this.currencySymbol + price;
        case 'before':
        default:                   return this.currencySymbol + price;
      }
    }

    /**
     * Update the display-only amount element (when custom input is disabled).
     */
    updateAmountDisplay() {
      if (!this.amountDisplay) {
        return;
      }

      this.amountDisplay.textContent = this.selectedAmount > 0
        ? this.formatNumber(this.selectedAmount)
        : '';
    }

    /**
     * Update the submit button text, replacing {amount} with the formatted value.
     */
    updateButtonText() {
      if (!this.button) {
        return;
      }

      var text = this.buttonTemplate;

      if (text.indexOf('{amount}') === -1) {
        this.button.textContent = text;
        return;
      }

      if (this.selectedAmount > 0) {
        text = text.replace('{amount}', this.formatAmount(this.selectedAmount));
      } else {
        text = text.replace('{amount}', '').replace(/\s+/g, ' ').trim();
      }

      this.button.textContent = text;
    }

    /**
     * Display a validation error message.
     *
     * @param {string} msg - The error message to display.
     */
    showError(msg) {
      if (!this.errorEl) {
        return;
      }

      this.errorEl.textContent = msg;
    }

    /**
     * Clear the validation error message.
     */
    clearError() {
      if (!this.errorEl) {
        return;
      }

      this.errorEl.textContent = '';
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
