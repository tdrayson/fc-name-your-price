# Name Your Price for FluentCart

A WordPress plugin that adds "name your price" and "pay what you want" forms powered by [FluentCart](https://fluent.cart).

Use a shortcode or Gutenberg block to drop a pricing form anywhere on your site. Visitors pick a preset amount or type their own, then check out instantly through FluentCart — no product setup required.

## Features

- **Preset amounts** — configurable quick-pick buttons (e.g. $10, $25, $50, $100)
- **Custom amount input** — optional free-text field for any amount
- **Min/max validation** — enforce amount boundaries on both client and server
- **Currency-aware** — automatically uses your FluentCart currency settings (symbol, position, decimal format, zero-decimal currencies)
- **Gutenberg block** — fully interactive editor preview with all settings in the sidebar
- **Shortcode** — `[fc_name_your_price]` for use anywhere shortcodes work
- **Instant checkout** — redirects straight to FluentCart checkout, no cart page needed
- **Extensible** — filter hooks for defaults, presets, validation limits, and variation data

## Requirements

- WordPress 6.0+
- PHP 8.1+
- [FluentCart](https://fluent.cart) plugin (listed as a required plugin dependency)

## Installation

1. Download or clone this repository into `wp-content/plugins/fc-name-your-price`
2. Activate the plugin in **Plugins → Installed Plugins**
3. Make sure FluentCart is installed and activated

## Usage

### Shortcode

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
  preset_amounts="10,25,50,100"
  button_text="Donate {amount}"
  default_amount="25"
  product_title="Donation"
]
```

| Attribute | Default | Description |
|---|---|---|
| `min` | `1` | Minimum allowed amount |
| `max` | `10000` | Maximum allowed amount |
| `show_presets` | `yes` | Show preset amount buttons (`yes` / `no`) |
| `allow_custom` | `yes` | Show a free-text input for custom amounts (`yes` / `no`) |
| `preset_amounts` | `10,25,50,100` | Comma-separated list of preset values (max 5 with custom, 6 without) |
| `button_text` | `Donate {amount}` | Submit button label — `{amount}` is replaced with the formatted price |
| `default_amount` | _(first preset)_ | Pre-selected amount on load |
| `product_title` | `Donation` | Line item title shown at checkout |

### Gutenberg Block

Search for **"Name Your Price"** in the block inserter. All attributes are configurable in the block sidebar under **Form Settings**.

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

### How It Works

The plugin creates a custom item on-the-fly at checkout time using FluentCart's [Custom Product Selling](https://dev.fluentcart.com/modules/custom-product-selling) API. No products need to exist in FluentCart — the form generates an instant checkout URL with the chosen amount, and the integration class validates and builds the line item server-side via the `fluent_cart/cart/validate_custom_item` filter.

Prices are passed to FluentCart in cents (e.g. `$10.00` = `1000`).

## License

GPL v2 or later.
