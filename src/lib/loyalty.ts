export const calculateRewardPoints = (paidAmount: number, basePoints = 0) =>
  Math.max(Math.floor(Math.max(0, paidAmount) / 1000), Math.max(0, Math.floor(basePoints)));
