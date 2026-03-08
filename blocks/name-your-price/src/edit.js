import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText, AlignmentToolbar, BlockControls } from '@wordpress/block-editor';
import {
  PanelBody,
  TextControl,
  ToggleControl,
  SelectControl,
} from '@wordpress/components';
import { useState, useEffect, useMemo } from '@wordpress/element';

const settings = window.fcnypEditorSettings || {};
const currencySymbol = settings.currencySymbol || '$';
const currencyCode = settings.currencyCode || 'USD';
const currencyPosition = settings.currencyPosition || 'before';
const decimalSep = settings.decimalSeparator || '.';
const thousandSep = settings.thousandSeparator || ',';
const isZeroDecimal = settings.isZeroDecimal || false;

function isCurrencyBefore() {
  return ['before', 'iso_before', 'symbool_before_iso', 'symbool_and_iso'].includes(currencyPosition);
}

function formatNumber(amount) {
  const decimals = isZeroDecimal ? 0 : 2;
  const parts = amount.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
  return parts.length > 1 ? parts[0] + decimalSep + parts[1] : parts[0];
}

function formatAmount(amount) {
  const price = formatNumber(amount);
  switch (currencyPosition) {
    case 'after': return price + currencySymbol;
    case 'iso_before': return currencyCode + ' ' + price;
    case 'iso_after': return price + ' ' + currencyCode;
    case 'symbool_before_iso': return currencySymbol + price + ' ' + currencyCode;
    case 'symbool_after_iso': return currencyCode + ' ' + price + currencySymbol;
    case 'symbool_and_iso': return currencyCode + ' ' + currencySymbol + price;
    case 'before':
    default: return currencySymbol + price;
  }
}

const frequencyNouns = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', half_yearly: '6 months', yearly: 'year' };
const frequencyLabels = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', quarterly: 'quarterly', half_yearly: 'half-yearly', yearly: 'yearly' };

function getButtonText(template, amount, subMode, interval) {
  let text = template;
  if (text.indexOf('{frequency}') !== -1) {
    text = subMode !== 'off'
      ? text.replace('{frequency}', frequencyNouns[interval] || 'month')
      : text.replace('{frequency}', '');
  }
  if (text.indexOf('{amount}') !== -1) {
    text = amount > 0
      ? text.replace('{amount}', formatAmount(amount))
      : text.replace('{amount}', '');
  }
  return text.replace(/\s+/g, ' ').trim();
}

function getColCount(total) {
  if (total <= 3) return total;
  if (total % 3 === 0) return 3;
  if (total % 2 === 0) return 2;
  return 3;
}

export default function Edit({ attributes, setAttributes }) {
  const blockProps = useBlockProps();
  const {
    min, max, showPresets, allowCustom,
    presetAmounts, buttonText, defaultAmount, productTitle,
    formTitle, formDescription, textAlign,
    subscriptionButtonText, subscriptionMode, billingInterval,
    coverFees, feePercentage, feeFixed, feeText,
  } = attributes;

  const presets = useMemo(() => {
    return presetAmounts
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [presetAmounts]);

  const maxPresets = allowCustom === 'yes' ? 5 : 6;
  const visiblePresets = presets.slice(0, maxPresets);
  const totalButtons = visiblePresets.length + (allowCustom === 'yes' ? 1 : 0);
  const cols = getColCount(totalButtons);

  // Resolve initial amount: default > first preset
  const initialAmount = useMemo(() => {
    const da = parseFloat(defaultAmount);
    if (da > 0) return da;
    if (presets.length > 0) return parseFloat(presets[0]) || 0;
    return 0;
  }, [defaultAmount, presets]);

  const [selectedAmount, setSelectedAmount] = useState(initialAmount);
  const [activePreset, setActivePreset] = useState(null);
  const [customActive, setCustomActive] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [coverFeesChecked, setCoverFeesChecked] = useState(false);

  // Sync when attributes change
  useEffect(() => {
    setSelectedAmount(initialAmount);
    setCustomActive(false);
    // Find matching preset
    const match = visiblePresets.find((p) => parseFloat(p) === initialAmount);
    setActivePreset(match || (initialAmount > 0 ? null : visiblePresets[0] || null));
  }, [initialAmount, presetAmounts]);

  const handlePresetClick = (amount) => {
    setSelectedAmount(amount);
    setActivePreset(amount.toString());
    setCustomActive(false);
  };

  const handleCustomClick = () => {
    setCustomActive(true);
    setActivePreset(null);
    setSelectedAmount(0);
  };

  const handleInputChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setSelectedAmount(val);
    const match = visiblePresets.find((p) => parseFloat(p) === val);
    if (match) {
      setActivePreset(match);
      setCustomActive(false);
    } else {
      setActivePreset(null);
    }
  };

  const before = isCurrencyBefore();
  const isSubscriptionActive = subscriptionMode === 'required' || (subscriptionMode === 'optional' && subscriptionChecked);
  const activeButtonText = isSubscriptionActive ? subscriptionButtonText : buttonText;
  const renderedButtonText = getButtonText(activeButtonText, selectedAmount, isSubscriptionActive ? 'required' : 'off', billingInterval);
  const isInline = showPresets !== 'yes' && subscriptionMode === 'off' && coverFees !== 'optional';
  const layoutClass = isInline ? 'fcnyp-form--inline' : 'fcnyp-form--stacked';

  const renderedFeeText = useMemo(() => {
    let text = feeText || '';
    if (text.indexOf('{fee}') !== -1) {
      if (selectedAmount > 0) {
        const fee = (selectedAmount * parseFloat(feePercentage) / 100) + parseFloat(feeFixed);
        text = text.replace('{fee}', formatAmount(fee));
      } else {
        text = text.replace('{fee}', '');
      }
    }
    return text.replace(/\s+/g, ' ').trim();
  }, [feeText, feePercentage, feeFixed, selectedAmount]);

  const hasHeader = formTitle || formDescription;

  return (
    <div {...blockProps}>
      <BlockControls>
        <AlignmentToolbar
          value={textAlign}
          onChange={(value) => setAttributes({ textAlign: value })}
        />
      </BlockControls>
      <InspectorControls>
        <PanelBody
          title={__('Form Settings', 'fc-name-your-price')}
          initialOpen={true}
        >
          <TextControl
            label={__('Minimum Amount', 'fc-name-your-price')}
            value={min}
            onChange={(value) => setAttributes({ min: value })}
          />
          <TextControl
            label={__('Maximum Amount', 'fc-name-your-price')}
            value={max}
            onChange={(value) => setAttributes({ max: value })}
          />
          <ToggleControl
            label={__('Show Preset Amounts', 'fc-name-your-price')}
            checked={showPresets === 'yes'}
            onChange={(value) =>
              setAttributes({ showPresets: value ? 'yes' : 'no' })
            }
          />
          {showPresets === 'yes' && (
            <TextControl
              label={__('Preset Amounts', 'fc-name-your-price')}
              help={__(
                'Comma-separated list of preset amounts',
                'fc-name-your-price'
              )}
              value={presetAmounts}
              onChange={(value) => setAttributes({ presetAmounts: value })}
            />
          )}
          <ToggleControl
            label={__('Allow Custom Amount', 'fc-name-your-price')}
            help={__(
              'Let visitors enter their own amount',
              'fc-name-your-price'
            )}
            checked={allowCustom === 'yes'}
            onChange={(value) =>
              setAttributes({ allowCustom: value ? 'yes' : 'no' })
            }
          />
          {subscriptionMode !== 'required' && (
            <TextControl
              label={__('Button Text', 'fc-name-your-price')}
              help={__(
                '{amount} — formatted price',
                'fc-name-your-price'
              )}
              value={buttonText}
              onChange={(value) => setAttributes({ buttonText: value })}
            />
          )}
          <TextControl
            label={__('Default Amount', 'fc-name-your-price')}
            value={defaultAmount}
            onChange={(value) => setAttributes({ defaultAmount: value })}
          />
          <TextControl
            label={__('Product Title', 'fc-name-your-price')}
            help={__('Title shown at checkout', 'fc-name-your-price')}
            value={productTitle}
            onChange={(value) => setAttributes({ productTitle: value })}
          />
        </PanelBody>
        <PanelBody
          title={__('Transaction Fees', 'fc-name-your-price')}
          initialOpen={false}
        >
          <SelectControl
            label={__('Cover Fees', 'fc-name-your-price')}
            value={coverFees}
            options={[
              { label: __('Off', 'fc-name-your-price'), value: 'off' },
              { label: __('Optional (visitor chooses)', 'fc-name-your-price'), value: 'optional' },
            ]}
            onChange={(value) => setAttributes({ coverFees: value })}
          />
          {coverFees === 'optional' && (
            <>
              <TextControl
                label={__('Fee Percentage', 'fc-name-your-price')}
                help={__('Percentage of the amount (e.g. 2.9)', 'fc-name-your-price')}
                value={feePercentage}
                onChange={(value) => setAttributes({ feePercentage: value })}
              />
              <TextControl
                label={__('Fixed Fee', 'fc-name-your-price')}
                help={__('Fixed fee amount (e.g. 0.30)', 'fc-name-your-price')}
                value={feeFixed}
                onChange={(value) => setAttributes({ feeFixed: value })}
              />
              <TextControl
                label={__('Fee Text', 'fc-name-your-price')}
                help={__( '{fee} — calculated fee amount', 'fc-name-your-price')}
                value={feeText}
                onChange={(value) => setAttributes({ feeText: value })}
              />
            </>
          )}
        </PanelBody>
        <PanelBody
          title={__('Subscription Settings', 'fc-name-your-price')}
          initialOpen={false}
        >
          <SelectControl
            label={__('Subscription Mode', 'fc-name-your-price')}
            value={subscriptionMode}
            options={[
              { label: __('Off (one-time only)', 'fc-name-your-price'), value: 'off' },
              { label: __('Optional (visitor chooses)', 'fc-name-your-price'), value: 'optional' },
              { label: __('Required (always recurring)', 'fc-name-your-price'), value: 'required' },
            ]}
            onChange={(value) => setAttributes({ subscriptionMode: value })}
          />
          {subscriptionMode !== 'off' && (
            <SelectControl
              label={__('Billing Interval', 'fc-name-your-price')}
              value={billingInterval}
              options={[
                { label: __('Daily', 'fc-name-your-price'), value: 'daily' },
                { label: __('Weekly', 'fc-name-your-price'), value: 'weekly' },
                { label: __('Monthly', 'fc-name-your-price'), value: 'monthly' },
                { label: __('Quarterly', 'fc-name-your-price'), value: 'quarterly' },
                { label: __('Half Yearly', 'fc-name-your-price'), value: 'half_yearly' },
                { label: __('Yearly', 'fc-name-your-price'), value: 'yearly' },
              ]}
              onChange={(value) => setAttributes({ billingInterval: value })}
            />
          )}
          {subscriptionMode !== 'off' && (
            <TextControl
              label={__('Subscription Button Text', 'fc-name-your-price')}
              help={__(
                '{amount} — formatted price, {frequency} — billing period (e.g. "month")',
                'fc-name-your-price'
              )}
              value={subscriptionButtonText}
              onChange={(value) => setAttributes({ subscriptionButtonText: value })}
            />
          )}
        </PanelBody>
      </InspectorControls>

      <div className={`fcnyp-form ${layoutClass}`}>
        <div className="fcnyp-form__header" style={textAlign ? { textAlign } : undefined}>
          <RichText
            tagName="h3"
            className="fcnyp-form__title"
            value={formTitle}
            onChange={(value) => setAttributes({ formTitle: value })}
            placeholder={__('Add a title...', 'fc-name-your-price')}
          />
          <RichText
            tagName="p"
            className="fcnyp-form__description"
            value={formDescription}
            onChange={(value) => setAttributes({ formDescription: value })}
            placeholder={__('Add a description...', 'fc-name-your-price')}
          />
        </div>

        <div className="fcnyp-form__input-wrap">
          {before && (
            <span className="fcnyp-form__currency">{currencySymbol}</span>
          )}
          {allowCustom === 'yes' ? (
            <input
              type="number"
              className="fcnyp-form__amount"
              min={min}
              max={max}
              step={isZeroDecimal ? '1' : '0.01'}
              placeholder={isZeroDecimal ? '0' : '0.00'}
              value={selectedAmount > 0 ? selectedAmount : ''}
              onChange={handleInputChange}
              aria-label={__('Enter amount', 'fc-name-your-price')}
            />
          ) : (
            <span className="fcnyp-form__amount-display">
              {selectedAmount > 0 ? formatNumber(selectedAmount) : ''}
            </span>
          )}
          {!before && (
            <span className="fcnyp-form__currency">{currencySymbol}</span>
          )}
        </div>

        {showPresets === 'yes' && (
          <div className="fcnyp-form__presets" data-cols={cols}>
            {visiblePresets.map((amount) => {
              const numAmount = parseFloat(amount);
              const isActive = activePreset === amount && !customActive;
              return (
                <button
                  key={amount}
                  type="button"
                  className={`fcnyp-form__preset${isActive ? ' fcnyp-form__preset--active' : ''}`}
                  onClick={() => handlePresetClick(numAmount)}
                >
                  {before ? (
                    <><span className="fcnyp-form__preset-currency">{currencySymbol}</span>{amount}</>
                  ) : (
                    <>{amount}<span className="fcnyp-form__preset-currency">{currencySymbol}</span></>
                  )}
                </button>
              );
            })}
            {allowCustom === 'yes' && (
              <button
                type="button"
                className={`fcnyp-form__preset fcnyp-form__preset--custom${customActive ? ' fcnyp-form__preset--active' : ''}`}
                onClick={handleCustomClick}
              >
                {__('Custom Amount', 'fc-name-your-price')}
              </button>
            )}
          </div>
        )}

        {coverFees === 'optional' && (
          <label className="fcnyp-form__cover-fees">
            <input
              type="checkbox"
              className="fcnyp-form__cover-fees-checkbox"
              checked={coverFeesChecked}
              onChange={(e) => setCoverFeesChecked(e.target.checked)}
            />
            <span className="fcnyp-form__cover-fees-label">
              {renderedFeeText}
            </span>
          </label>
        )}
        {subscriptionMode === 'optional' && (
          <label className="fcnyp-form__subscription">
            <input
              type="checkbox"
              className="fcnyp-form__subscription-checkbox"
              checked={subscriptionChecked}
              onChange={(e) => setSubscriptionChecked(e.target.checked)}
            />
            <span className="fcnyp-form__subscription-label">
              {__('Make this', 'fc-name-your-price')}{' '}
              {frequencyLabels[billingInterval] || 'monthly'}
            </span>
          </label>
        )}
        <button type="button" className="fcnyp-form__button">
          {renderedButtonText}
        </button>
        <div className="fcnyp-form__error" aria-live="polite"></div>
      </div>
    </div>
  );
}
