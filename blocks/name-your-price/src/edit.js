import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
  PanelBody,
  TextControl,
  ToggleControl,
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

function getButtonText(template, amount) {
  if (template.indexOf('{amount}') === -1) return template;
  if (amount > 0) return template.replace('{amount}', formatAmount(amount));
  return template.replace('{amount}', '').replace(/\s+/g, ' ').trim();
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
  const renderedButtonText = getButtonText(buttonText, selectedAmount);
  const layoutClass = showPresets === 'yes' ? 'fcnyp-form--stacked' : 'fcnyp-form--inline';

  return (
    <div {...blockProps}>
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
              'Show an input field for custom amounts',
              'fc-name-your-price'
            )}
            checked={allowCustom === 'yes'}
            onChange={(value) =>
              setAttributes({ allowCustom: value ? 'yes' : 'no' })
            }
          />
          <TextControl
            label={__('Button Text', 'fc-name-your-price')}
            help={__(
              'Use {amount} to show the amount dynamically',
              'fc-name-your-price'
            )}
            value={buttonText}
            onChange={(value) => setAttributes({ buttonText: value })}
          />
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
      </InspectorControls>

      <div className={`fcnyp-form ${layoutClass}`}>
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

        <button type="button" className="fcnyp-form__button">
          {renderedButtonText}
        </button>
        <div className="fcnyp-form__error" aria-live="polite"></div>
      </div>
    </div>
  );
}
