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

> The guidance is based only on the numbers you enter. It is a starting point, not financial or tax advice.

## Tech Stack

| Area | Tools |
|---|---|
| Core | React 18, Vite, JavaScript, JSX |
| Styling | CSS, Flexbox, CSS Grid |
| Data | Static JSON / mock data (`src/data/`), saved in the browser's localStorage |
| DevOps | Git and GitHub, deployed with Vercel or Netlify |

## Getting Started

You need [Node.js](https://nodejs.org) (LTS version) installed.

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open the `localhost` link shown in the terminal (usually `http://localhost:5173`).

Other commands:

```bash
npm run build     # create a production build in dist/
npm run preview   # preview the production build locally
```

> Do not open `index.html` directly or with Live Server. It is a React + Vite app and must be run with `npm run dev`.

## Project Structure

```
KitaKita/
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
└── src/
    ├── main.jsx              # app entry point
    ├── App.jsx               # state, tabs, saving to localStorage
    ├── styles.css            # all styling
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

## Git and GitHub Workflow

```bash
git switch -c feature/your-feature     # create a branch for your work
git add .
git commit -m "Describe your change"
git push -u origin feature/your-feature
```

Open a Pull Request on GitHub, get it reviewed, and merge it into `main`. Do not commit directly to `main`.

## Deployment

- **Deployed on Vercel**: (https://kita-kita-5l2kg0w6e-ihalik-250000000758-5824.vercel.app/)
- **Deployed on Netlify**: (https://visionary-palmier-2f25d1.netlify.app)

Both services redeploy automatically each time `main` is updated.

## Use of Artificial Intelligence

The creation of this project involved the assistance of Artificial Intelligence. The initial design, code, and documentation were generated with help from Claude, an AI assistant made by Anthropic, and were then reviewed, tested, and adjusted by the project author.

## Author

Back-End Developer/Project Manager - Isaiah Smile Halik
Back-End Developer/Front-End Developer/Asst. Project Manager - Mark Daniel Cona
Front-End Developer/UI-Developer/Project Coordinator - Art Xenos Guadalquiver
