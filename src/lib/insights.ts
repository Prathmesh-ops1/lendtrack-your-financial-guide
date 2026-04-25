// Static rotating "Smart Financial Insights" tips.
export interface Insight {
  title: string;
  body: string;
  tag: string;
}

export const INSIGHTS: Insight[] = [
  {
    tag: "Loan tip",
    title: "Refinance high-interest loans",
    body: "Switching a loan from 14% to 10.5% can save you thousands per year on EMIs. Check with your bank for balance-transfer offers.",
  },
  {
    tag: "Cards",
    title: "Use the right card for rewards",
    body: "You may be losing ₹1,000–₹2,000/month in rewards. Match each spend category (fuel, groceries, travel) to the card that pays best.",
  },
  {
    tag: "Insurance",
    title: "Review your policy before renewal",
    body: "Compare plans 30 days before expiry. Newer policies often offer better cover at a lower premium for the same age band.",
  },
  {
    tag: "Budgeting",
    title: "Keep EMIs under 40% of income",
    body: "If your total EMIs exceed 40% of monthly income, you're over-leveraged. Consider consolidating or pre-paying the costliest debt first.",
  },
  {
    tag: "Credit score",
    title: "Pay before the due date, not on it",
    body: "Paying 3–5 days early avoids any clearing-delay penalties and keeps your credit utilisation low when reported to bureaus.",
  },
  {
    tag: "Savings",
    title: "Automate a 'safety buffer'",
    body: "Keep at least 1.5x your monthly EMIs as a buffer in your account. It prevents shortfalls from late salary credits.",
  },
  {
    tag: "Cards",
    title: "Avoid revolving credit",
    body: "Paying only the minimum due means 36–42% APR on the rest. Always clear the full credit-card outstanding to stay debt-free.",
  },
  {
    tag: "Loan tip",
    title: "Pre-pay when bonuses come in",
    body: "Putting an annual bonus into loan pre-payment cuts the principal directly and shortens your tenure dramatically.",
  },
];

export function pickInsightForToday(seed = new Date()): Insight {
  const dayKey = Math.floor(seed.getTime() / (1000 * 60 * 60 * 24));
  return INSIGHTS[dayKey % INSIGHTS.length];
}
