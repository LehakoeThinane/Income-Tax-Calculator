# Income Tax Calculator

A WordPress plugin for estimating South African income tax, PAYE, UIF, medical tax credits, and monthly take-home pay.

## Features

- Annual and monthly income input
- PAYE calculation
- UIF calculation with monthly cap
- Medical tax credit support
- Monthly take-home summary
- On-page breakdown and summary table
- Brand colour customization from WordPress settings
- PDF summary download
- Save PDF summary to the WordPress Media Library

## Installation

1. Copy the plugin folder into `wp-content/plugins/`.
2. Activate **SA Tax Calculator** in WordPress.
3. Go to **Settings > SA Tax Calculator** to configure branding and PDF settings.
4. Add the shortcode below to any page or post:

```text
[sa_tax_calculator]
```

## Included Files

- `sa-tax-calculator.php` - main plugin bootstrap and WordPress integration
- `assets/js/calculator.js` - calculator logic and PDF generation flow
- `assets/css/calculator.css` - frontend styling
- `assets/vendor/jspdf/jspdf.umd.min.js` - local jsPDF browser bundle

## Notes

- This calculator provides an estimate and is not a substitute for formal tax advice or payroll software.
- The repository is kept public-safe by excluding local editor files, generated PDFs, and other development artifacts.
- Environment-specific deployment details should be kept outside the repository.

## Roadmap Ideas

- Tax year switching
- More advanced payroll scenarios
- Additional SARS-aligned calculation rules
- Export history or saved calculations

## License

This project is currently provided without an explicit open-source license.
