<img width="1183" height="614" alt="Screenshot 2026-03-07 at 23 19 48" src="https://github.com/user-attachments/assets/7045c0fe-276e-4876-8bfa-a7026570f5b7" />

# Name Your Price for FluentCart
A WordPress plugin that adds flexible payment forms powered by [FluentCart](https://fluent.cart). Create "name your price", "pay what you want", donation forms, or simple payment buttons — no product setup required.

Drop a form anywhere on your site using a shortcode or Gutenberg block. Visitors pick a preset amount or type their own, then check out instantly through FluentCart. Items are created on-the-fly at checkout time, so you don't need to configure any products in FluentCart.

## Features

- **On-the-fly payments** — no FluentCart product setup needed; items are created dynamically at checkout
- **Preset amounts** — configurable quick-pick buttons (e.g. $5, $10, $25, $50, $100)
- **Custom amount input** — optional free-text field for any amount
- **Title & description** — optional rich text header above the form (inline-editable in the block editor)
- **Min/max validation** — enforce amount boundaries on both client and server
- **Currency-aware** — automatically uses your FluentCart currency settings (symbol, position, decimal format, zero-decimal currencies)
- **Subscription support** — optional or required recurring billing (daily, weekly, monthly, quarterly, half-yearly, yearly)
- **Transaction fee recovery** — optional checkbox to let visitors cover payment processing fees
- **Gutenberg block** — fully interactive editor preview with inline RichText editing and all settings in the sidebar
- **Shortcode** — `[fc_name_your_price]` for use anywhere shortcodes work
- **Instant checkout** — redirects straight to FluentCart checkout, no cart page needed
- **Extensible** — filter hooks for defaults, presets, validation limits, and variation data

## Use Cases

- **Donations** — let supporters choose their own amount with preset suggestions
- **Pay what you want** — flexible pricing for digital products, services, or content
- **Simple payment buttons** — disable custom input, set a single preset, and use it as a quick buy button
- **Recurring donations** — combine with subscription mode for monthly/yearly giving
- **Tip jars** — small preset amounts with fee recovery to maximize what you receive

## Requirements

- WordPress 6.0+
- PHP 8.1+
- [FluentCart](https://fluent.cart) plugin (listed as a required plugin dependency)

## Installation

1. Download the latest `fc-name-your-price-x.x.x.zip` from the [Releases page](https://github.com/tdrayson/fc-name-your-price/releases)
2. In WordPress, go to **Plugins → Add New → Upload Plugin** and upload the zip
3. Activate the plugin
4. Make sure FluentCart is installed and activated

## Usage

### Gutenberg Block

Search for **"Name Your Price"** in the block inserter. The block provides:

- **Inline editing** — click the title or description directly in the editor to type
- **Live preview** — see exactly how the form will look with real currency formatting
- **Sidebar panels** — Form Settings, Transaction Fees, and Subscription Settings

### Shortcode

Basic usage:
```
[fc_name_your_price]
```

With all available attributes:
```
[fc_name_your_price
  min="5"
  max="500"
  show_presets="yes"
  allow_custom="yes"
  preset_amounts="5,10,25,50,100"
  button_text="Pay {amount}"
  default_amount="25"
  product_title="Donation"
  form_title="Support Our Work"
  form_description="Every contribution makes a difference."
]
```

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `min` | `1` | Minimum allowed amount |
| `max` | `10000` | Maximum allowed amount |
| `show_presets` | `yes` | Show preset amount buttons (`yes` / `no`) |
| `allow_custom` | `yes` | Show a free-text input for custom amounts (`yes` / `no`) |
| `preset_amounts` | `5,10,25,50,100` | Comma-separated list of preset values (max 5 with custom, 6 without) |
| `button_text` | `Pay {amount}` | Submit button label — `{amount}` = formatted price |
| `default_amount` | _(first preset)_ | Pre-selected amount on load |
| `product_title` | `Donation` | Line item title shown at checkout |
| `form_title` | _(empty)_ | Optional heading displayed above the form (supports basic HTML) |
| `form_description` | _(empty)_ | Optional description displayed below the title (supports basic HTML) |

### Subscription Attributes

| Attribute | Default | Description |
|---|---|---|
| `subscription_mode` | `off` | `off` (one-time only), `optional` (visitor chooses), or `required` (always recurring) |
| `billing_interval` | `monthly` | Billing frequency: `daily`, `weekly`, `monthly`, `quarterly`, `half_yearly`, or `yearly` |
| `subscription_button_text` | `Pay {amount} per {frequency}` | Button text when subscription is active — `{frequency}` = billing period (e.g. "month") |

### Transaction Fee Attributes

| Attribute | Default | Description |
|---|---|---|
| `cover_fees` | `off` | `off` or `optional` (shows a checkbox for visitors to cover fees) |
| `fee_percentage` | `2.9` | Percentage of the amount (e.g. Stripe's 2.9%) |
| `fee_fixed` | `0.30` | Fixed fee per transaction (e.g. Stripe's $0.30) |
| `fee_text` | `Cover the {fee} transaction fee` | Checkbox label — `{fee}` = calculated fee amount |

### Examples

**Simple payment button** (fixed $25, no custom input):
```
[fc_name_your_price show_presets="no" allow_custom="no" default_amount="25" button_text="Pay $25"]
```

**Donation form with title:**
```
[fc_name_your_price form_title="Support Our Mission" form_description="Your donation helps us continue our work."]
```

**Monthly subscription (required):**
```
[fc_name_your_price subscription_mode="required" billing_interval="monthly"]
```

**Optional subscription with fee recovery:**
```
[fc_name_your_price subscription_mode="optional" billing_interval="yearly" cover_fees="optional"]
```

## How It Works

The plugin creates a custom item on-the-fly at checkout time using FluentCart's [Custom Product Selling](https://dev.fluentcart.com/modules/custom-product-selling) API. No products need to exist in FluentCart — the form generates an instant checkout URL with the chosen amount, and the integration class validates and builds the line item server-side via the `fluent_cart/cart/validate_custom_item` filter.

This means you can use the plugin as a lightweight payment button or donation form without any FluentCart product configuration. Just drop the block or shortcode on any page.

Prices are passed to FluentCart in cents (e.g. `$10.00` = `1000`).

## Filter Hooks

| Hook | Description | Default |
|---|---|---|
| `fcnyp_default_attributes` | Override default shortcode attributes | See table above |
| `fcnyp_preset_amounts` | Modify the preset amounts array | Parsed from `preset_amounts` attribute |
| `fcnyp_min_amount` | Server-side minimum amount | `1` |
| `fcnyp_max_amount` | Server-side maximum amount | `10000` |
| `fcnyp_product_title` | Override the checkout line item title | Value of `product_title` attribute |
| `fcnyp_variation_data` | Modify the full variation object sent to FluentCart | See `FluentCartIntegration::validateCustomItem()` |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A local WordPress environment with FluentCart installed (e.g. [LocalWP](https://localwp.com/))

### Setup

```bash
cd wp-content/plugins/fc-name-your-price
npm install
```

### Building the Block

The Gutenberg block source lives in `blocks/name-your-price/src/` and needs to be compiled:

```bash
# Production build
npm run build

# Watch for changes during development
npm run start
```

### Project Structure

```
fc-name-your-price/
├── fc-name-your-price.php          # Plugin bootstrap
├── includes/
│   ├── class-shortcode.php         # [fc_name_your_price] shortcode rendering
│   └── class-fluentcart-integration.php  # FluentCart validation hooks
├── assets/
│   ├── css/pricing-form.css        # Frontend styles
│   └── js/pricing-form.js          # Frontend JS (vanilla, no build step)
└── blocks/
    └── name-your-price/
        ├── block.json              # Block registration
        ├── render.php              # Server-side block render
        └── src/
            ├── index.js            # Block registration
            └── edit.js             # Editor preview component
```

## Changelog

### 1.2.1 — 2026-03-08
- Fix hardcoded English JS error messages — now translatable via `wp_localize_script`
- Wrap form in `<form>` element for Enter key submit and screen reader accessibility
- Fix broken form when `allow_custom="no"` and `show_presets="no"` with no default amount — falls back to custom input
- Fix mismatched `preset_amounts` default in block `render.php` (was missing `5`)
- Whitelist `text_align` shortcode attribute to valid alignment values only
- Restrict form title/description HTML to RichText formatting tags (no inline images)
- Add `allowedFormats` to block editor RichText fields to match

### 1.2.0 — 2026-03-08
- Add form title and description with RichText editing in the block editor
- Add transaction fee recovery with configurable percentage, fixed fee, and checkbox text
- Refactor frontend JS to use `this.config` and `this.els` objects
- Move Transaction Fees panel above Subscription Settings in the editor sidebar

### 1.1.0 — 2026-03-07
- Add subscription support with three modes: `off`, `optional`, and `required`
- Add `subscription_mode` and `billing_interval` shortcode attributes
- Add Subscription Settings panel to Gutenberg block
- Support daily, weekly, monthly, quarterly, half-yearly, and yearly billing intervals
- Frequency toggle UI for optional mode, label for required mode

### 1.0.0 — 2026-03-07
- Initial release
- Name-your-price and pay-what-you-want pricing forms
- Gutenberg block with live editor preview
- Shortcode support (`[fc_name_your_price]`)
- FluentCart integration for payment processing
- Preset amount buttons and custom amount input
- Min/max validation on client and server
- Currency-aware formatting via FluentCart settings

## License

GPL v2 or later.
