// Fixed category list (not user-editable) — Marc's set from his old
// spreadsheet/tracker. A few categories (Auto, Tax, Utilities) have
// subcategories; the parent itself stays selectable on its own so a charge
// that doesn't need the finer split isn't forced into one.
//
// Keys double as the Prisma `CategoryKey` enum values in schema.prisma — keep
// the two lists in sync if this ever changes.

export type CategoryKey =
  | "AUTO"
  | "AUTO_GAS"
  | "AUTO_REGISTRATION"
  | "AUTO_SERVICE"
  | "BANK_CHARGE"
  | "BEAUTY"
  | "CHARITY"
  | "CHILDCARE"
  | "CLOTHING"
  | "COFFEE"
  | "CREDIT_CARD_PAYMENT"
  | "DESSERT"
  | "DEVICES"
  | "DRINKS"
  | "EATING_OUT"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "GAMBLING"
  | "GIFTS"
  | "GROCERIES"
  | "HEALTH_FITNESS"
  | "HOME_REPAIR"
  | "HOUSEHOLD"
  | "INSURANCE"
  | "INTEREST"
  | "LOAN"
  | "MEDICAL"
  | "MISC"
  | "MORTGAGE"
  | "OTHERS"
  | "PETS"
  | "RENT"
  | "SAVINGS"
  | "TAX"
  | "TAX_FED"
  | "TAX_STATE"
  | "TRANSPORT"
  | "TRAVEL"
  | "TV"
  | "UTILITIES"
  | "UTILITIES_TRASH_RECYCLING"
  | "UTILITIES_GAS_ELECTRIC"
  | "UTILITIES_INTERNET"
  | "UTILITIES_PHONE"
  | "UTILITIES_WATER"
  | "WEDDING"
  | "INCOME_ASCAP"
  | "INCOME_BONUS"
  | "INCOME_GAMBLING"
  | "INCOME_GIFT"
  | "INCOME_OPTIONS"
  | "INCOME_OTHERS"
  | "INCOME_REFUND"
  | "INCOME_SALARY"
  | "INCOME_TAX_REFUND";

type CategoryNode = {
  key: CategoryKey;
  label: string;
  emoji: string;
  children?: { key: CategoryKey; label: string }[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    key: "AUTO",
    label: "Auto",
    emoji: "🚗",
    children: [
      { key: "AUTO_GAS", label: "Gas" },
      { key: "AUTO_REGISTRATION", label: "Registration" },
      { key: "AUTO_SERVICE", label: "Service" },
    ],
  },
  { key: "BANK_CHARGE", label: "Bank Charge", emoji: "🏦" },
  { key: "BEAUTY", label: "Beauty", emoji: "💄" },
  { key: "CHARITY", label: "Charity", emoji: "💛" },
  { key: "CHILDCARE", label: "Childcare", emoji: "🍼" },
  { key: "CLOTHING", label: "Clothing", emoji: "👕" },
  { key: "COFFEE", label: "Coffee", emoji: "☕" },
  { key: "CREDIT_CARD_PAYMENT", label: "Credit Card Payment", emoji: "💳" },
  { key: "DESSERT", label: "Dessert", emoji: "🍰" },
  { key: "DEVICES", label: "Devices", emoji: "📱" },
  { key: "DRINKS", label: "Drinks", emoji: "🍹" },
  { key: "EATING_OUT", label: "Eating Out", emoji: "🍽️" },
  { key: "EDUCATION", label: "Education", emoji: "🎓" },
  { key: "ENTERTAINMENT", label: "Entertainment", emoji: "🎬" },
  { key: "GAMBLING", label: "Gambling", emoji: "🎲" },
  { key: "GIFTS", label: "Gifts", emoji: "🎁" },
  { key: "GROCERIES", label: "Groceries", emoji: "🛒" },
  { key: "HEALTH_FITNESS", label: "Health & Fitness", emoji: "💪" },
  { key: "HOME_REPAIR", label: "Home Repair", emoji: "🔨" },
  { key: "HOUSEHOLD", label: "Household", emoji: "🏠" },
  { key: "INSURANCE", label: "Insurance", emoji: "🛡️" },
  { key: "INTEREST", label: "Interest", emoji: "📈" },
  { key: "LOAN", label: "Loan", emoji: "💵" },
  { key: "MEDICAL", label: "Medical", emoji: "🩺" },
  { key: "MISC", label: "Misc", emoji: "🔖" },
  { key: "MORTGAGE", label: "Mortgage", emoji: "🏡" },
  { key: "OTHERS", label: "Others", emoji: "❔" },
  { key: "PETS", label: "Pets", emoji: "🐾" },
  { key: "RENT", label: "Rent", emoji: "🔑" },
  { key: "SAVINGS", label: "Savings", emoji: "🐷" },
  {
    key: "TAX",
    label: "Tax",
    emoji: "🧾",
    children: [
      { key: "TAX_FED", label: "Federal" },
      { key: "TAX_STATE", label: "State" },
    ],
  },
  { key: "TRANSPORT", label: "Transport", emoji: "🚌" },
  { key: "TRAVEL", label: "Travel", emoji: "✈️" },
  { key: "TV", label: "TV", emoji: "📺" },
  {
    key: "UTILITIES",
    label: "Utilities",
    emoji: "💡",
    children: [
      { key: "UTILITIES_TRASH_RECYCLING", label: "Trash & Recycling" },
      { key: "UTILITIES_GAS_ELECTRIC", label: "Gas & Electric" },
      { key: "UTILITIES_INTERNET", label: "Internet" },
      { key: "UTILITIES_PHONE", label: "Phone" },
      { key: "UTILITIES_WATER", label: "Water" },
    ],
  },
  { key: "WEDDING", label: "Wedding", emoji: "💍" },
];

// Separate from CATEGORY_TREE (expense/reimbursement categories) since the
// two sets are never offered together -- the add-transaction form shows one
// or the other depending on Expense/Reimburse vs Income.
export const INCOME_CATEGORY_TREE: CategoryNode[] = [
  { key: "INCOME_ASCAP", label: "ASCAP", emoji: "🎵" },
  { key: "INCOME_BONUS", label: "Bonus", emoji: "🎉" },
  { key: "INCOME_GAMBLING", label: "Gambling", emoji: "🎲" },
  { key: "INCOME_GIFT", label: "Gift", emoji: "🎁" },
  { key: "INCOME_OPTIONS", label: "Options", emoji: "📈" },
  { key: "INCOME_OTHERS", label: "Others", emoji: "❔" },
  { key: "INCOME_REFUND", label: "Refund", emoji: "↩️" },
  { key: "INCOME_SALARY", label: "Salary", emoji: "💼" },
  { key: "INCOME_TAX_REFUND", label: "Tax Refund", emoji: "🧾" },
];

const ALL_CATEGORY_TREES = [...CATEGORY_TREE, ...INCOME_CATEGORY_TREE];

export const CATEGORY_KEYS = ALL_CATEGORY_TREES.flatMap((c) => [
  c.key,
  ...(c.children?.map((s) => s.key) ?? []),
]) as [CategoryKey, ...CategoryKey[]];

type CategoryInfo = { label: string; fullLabel: string; emoji: string; parent?: CategoryKey };

export const CATEGORY_INFO: Record<CategoryKey, CategoryInfo> = Object.fromEntries(
  ALL_CATEGORY_TREES.flatMap((c) => [
    [c.key, { label: c.label, fullLabel: c.label, emoji: c.emoji }],
    ...(c.children?.map((s) => [
      s.key,
      { label: s.label, fullLabel: `${c.label}: ${s.label}`, emoji: c.emoji, parent: c.key },
    ]) ?? []),
  ]),
) as Record<CategoryKey, CategoryInfo>;

export function categoryLabel(key: string | null | undefined): string | null {
  return key ? (CATEGORY_INFO[key as CategoryKey]?.fullLabel ?? null) : null;
}

export function categoryEmoji(key: string | null | undefined): string | null {
  return key ? (CATEGORY_INFO[key as CategoryKey]?.emoji ?? null) : null;
}

// Rough color association for each category's emoji — not an exact color
// pick, just the hue it reads as (a red car, a green dollar bill). Multi-hue
// emoji (confetti, a gift bow) get two or three stops instead of one; the
// caller blends these into the surface color rather than using them flat.
const CATEGORY_COLOR: Partial<Record<CategoryKey, string[]>> = {
  AUTO: ["#EF4444"],
  BANK_CHARGE: ["#64748B"],
  BEAUTY: ["#EC4899"],
  CHARITY: ["#FBBF24"],
  CHILDCARE: ["#38BDF8"],
  CLOTHING: ["#3B82F6"],
  COFFEE: ["#92400E"],
  CREDIT_CARD_PAYMENT: ["#6366F1", "#8B5CF6"],
  DESSERT: ["#F472B6", "#FDE68A"],
  DEVICES: ["#64748B"],
  DRINKS: ["#FB923C", "#F87171"],
  EATING_OUT: ["#FB923C"],
  EDUCATION: ["#EAB308"],
  ENTERTAINMENT: ["#A78BFA"],
  GAMBLING: ["#EF4444", "#F8FAFC"],
  GIFTS: ["#F87171", "#FBBF24"],
  GROCERIES: ["#22C55E"],
  HEALTH_FITNESS: ["#10B981"],
  HOME_REPAIR: ["#D97706"],
  HOUSEHOLD: ["#FB7185"],
  INSURANCE: ["#3B82F6"],
  INTEREST: ["#22C55E"],
  LOAN: ["#16A34A"],
  MEDICAL: ["#EF4444"],
  MISC: ["#8FA3B8"],
  MORTGAGE: ["#B45309"],
  OTHERS: ["#64748B"],
  PETS: ["#D97706"],
  RENT: ["#EAB308"],
  SAVINGS: ["#F9A8D4"],
  TAX: ["#94A3B8"],
  TRANSPORT: ["#FACC15"],
  TRAVEL: ["#38BDF8"],
  TV: ["#6366F1"],
  UTILITIES: ["#FBBF24"],
  WEDDING: ["#FBBF24", "#93C5FD"],
  INCOME_ASCAP: ["#A78BFA"],
  INCOME_BONUS: ["#F87171", "#FBBF24", "#38BDF8"],
  INCOME_GAMBLING: ["#EF4444", "#F8FAFC"],
  INCOME_GIFT: ["#F87171", "#FBBF24"],
  INCOME_OPTIONS: ["#22C55E"],
  INCOME_OTHERS: ["#64748B"],
  INCOME_REFUND: ["#38BDF8"],
  INCOME_SALARY: ["#92400E"],
  INCOME_TAX_REFUND: ["#22C55E"],
};

// Subcategories (e.g. AUTO_GAS) inherit their parent's color since they
// share its emoji.
export function categoryColor(key: string | null | undefined): string[] | null {
  if (!key) return null;
  const info = CATEGORY_INFO[key as CategoryKey];
  const colorKey = (info?.parent ?? key) as CategoryKey;
  return CATEGORY_COLOR[colorKey] ?? null;
}
