# Kita Kita

**Kita Kita** is a simple, easy-to-use cash register web app for startup businesses. It helps owners record their sales and expenses, then turns those numbers into clear calculations that guide how they manage their money as the business grows.

## Features

- **Register:** quickly record a sale (money in) or an expense (money out) with an amount, description, category, and date.
- **Insights:** see total revenue, total expenses, net profit, profit margin, cash on hand, and average monthly spend.
- **Guidance:** plain-language tips based on your own numbers:
  - **Runway:** how many months your cash will last if you spend more than you earn.
  - **Gross margin:** how much of each sale remains after inventory or materials.
  - **Break-even:** the monthly sales needed to cover your fixed costs.
  - **Cash reserve warning:** a prompt when your cash covers less than 3 months of expenses.
- **Profit split:** a starter suggestion for dividing a profitable month (30% reserve, 40% reinvest, 20% pay yourself, 10% tax).
- **History:** view and delete entries, export everything to CSV, or reset to the sample data.
- **Settings:** set your opening cash balance and currency symbol.
- **Light and dark mode:** follows your device setting.
- **Accessible and responsive:** works from small phones to desktop, with keyboard navigation, screen-reader labels, and AA colour contrast. See [`docs/UI-UX-CHANGES.md`](docs/UI-UX-CHANGES.md).

> The guidance is based only on the numbers you enter. It is a starting point, not financial or tax advice.

## Tech Stack

| Area | Tools |
|---|---|
| Core | React 18, Vite, JavaScript, JSX |
| Styling | CSS, Flexbox, CSS Grid |
| Data | Static JSON / mock data (`src/data/`), saved in the browser's localStorage |
| DevOps | Git and GitHub, deployed with Vercel or Netlify |

## Project Structure

```
KitaKita/
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
├── docs/
│   └── UI-UX-CHANGES.md      # UI/UX change log, design tokens, a11y checklist, test results
└── src/
    ├── main.jsx              # app entry point
    ├── App.jsx               # state, tabs, saving to localStorage
    ├── styles.css            # all styling (design tokens at the top)
    ├── components/
    │   ├── Register.jsx      # add sales and expenses
    │   ├── Dashboard.jsx     # insights, chart, profit split
    │   ├── History.jsx       # entries list, CSV export, reset
    │   ├── Settings.jsx      # opening balance and currency
    │   └── TxRow.jsx         # one entry row
    ├── data/
    │   ├── transactions.json # sample (mock) transactions
    │   └── categories.json   # sale and expense categories
    └── utils/
        └── finance.js        # all calculations and guidance rules
```

## How the Calculations Work

- **Cash on hand** = opening balance + total sales − total expenses.
- **Net profit** = total sales − total expenses. **Profit margin** = net profit ÷ total sales.
- **Runway** = cash on hand ÷ monthly net burn, using the average of the last 3 months with entries. It only appears when monthly spending is higher than monthly sales.
- **Gross margin** = (average monthly sales − average monthly inventory/materials cost) ÷ average monthly sales.
- **Break-even sales** = average monthly fixed costs ÷ gross margin. Fixed costs are every expense category except Inventory / materials.

## Deployment

- **Deployed on Vercel**: (https://kita-kita-o1e12b5sk-ihalik-250000000758-5824.vercel.app/)
- **Deployed on Netlify**: (https://visionary-palmier-2f25d1.netlify.app)

Both services redeploy automatically each time `main` is updated.

## Use of Artificial Intelligence

The creation of this project involved the assistance of Artificial Intelligence. The initial design, code, and documentation were generated with help from Claude, an AI assistant made by Anthropic, and were then reviewed, tested, and adjusted by the project author.

## Author

- Back-End Developer/Project Manager - Isaiah Smile Halik
- Back-End Developer/Front-End Developer/Asst. Project Manager - Mark Daniel Cona
- Front-End Developer/UI-Developer/Project Coordinator - Art Xenos Guadalquiver
