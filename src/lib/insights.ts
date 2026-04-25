// Static rotating "Smart Financial Insights" tips.
// Each tip is data-driven feeling and includes a quantified ₹ savings figure.
export interface Insight {
  title: string;
  body: string;
  tag: string;
  savings: string; // e.g. "₹12,000/year"
}

export const INSIGHTS: Insight[] = [
  {
    tag: "Loan tip",
    title: "Refinance from 14% → 10.5%",
    body: "On a ₹5L outstanding loan, dropping the rate by 3.5% shaves your EMI by ~₹1,000/month. Ask your bank for a balance-transfer offer.",
    savings: "Save ₹12,000/year",
  },
  {
    tag: "Cards",
    title: "Use the right card per category",
    body: "You're losing ~₹1,500/month in rewards by paying fuel & groceries on a flat-rate card. Switch to a category-bonus card (5%) for those spends.",
    savings: "Save ₹18,000/year",
  },
  {
    tag: "Insurance",
    title: "Compare plans before renewal",
    body: "Your policy expires in ~20 days. New plans in your age band are 18–25% cheaper for the same cover. Compare before auto-renewal.",
    savings: "Save ₹3,000/year",
  },
  {
    tag: "Budgeting",
    title: "Keep EMIs under 40% of income",
    body: "If EMIs cross 40% of monthly income you're over-leveraged. Pre-pay the costliest debt first to free up ~₹2,000/month in interest.",
    savings: "Save ₹24,000/year",
  },
  {
    tag: "Credit score",
    title: "Pay 3 days before the due date",
    body: "Paying early keeps reported utilisation under 30% and protects your credit score — a 50-point bump can drop loan interest by 0.5%.",
    savings: "Save ₹6,000/year",
  },
  {
    tag: "Savings",
    title: "Park 1.5x EMI as a buffer",
    body: "A safety buffer in a sweep-FD earns ~6.5% while preventing late fees on missed payments (~₹500/instance).",
    savings: "Save ₹4,000/year",
  },
  {
    tag: "Cards",
    title: "Stop revolving credit-card dues",
    body: "Paying only the minimum due charges you 36–42% APR on the rest. Clearing a ₹50,000 outstanding in full saves you huge interest.",
    savings: "Save ₹15,000/year",
  },
  {
    tag: "Loan tip",
    title: "Pre-pay with your annual bonus",
    body: "Putting ₹1,00,000 from your bonus into loan principal cuts ~14 months off a 5-year tenure and lowers total interest paid.",
    savings: "Save ₹35,000 over loan life",
  },
];

export function pickInsightForToday(seed = new Date()): Insight {
  const dayKey = Math.floor(seed.getTime() / (1000 * 60 * 60 * 24));
  return INSIGHTS[dayKey % INSIGHTS.length];
}
