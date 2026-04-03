export const formatINR = (amount: number): string => {
  const num = Math.round(amount);
  if (num < 0) return '-' + formatINR(-num);
  const str = num.toString();
  if (str.length <= 3) return str;
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return formatted + ',' + lastThree;
};
