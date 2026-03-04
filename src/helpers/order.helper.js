export const getFinalAmountAfterDiscount = (order) => {
  if (!order) return 0;

  /* ================= PRODUCTS ================= */
  const productTotal =
    order.products?.reduce((sum, item) => {
      const price =
        Number(item.salePrice ?? item.product?.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0) || 0;

  /* ================= BASE CHARGES ================= */
  const installationCharge =
    Number(order.installationCharge) || 0;

  const miscCost =
    Number(order.miscellaneousCost) || 0;

  const fittingCost =
    Number(order.fittingCost) || 0;

  /* ================= GROSS ================= */
  const grossSubtotal =
    productTotal +
    installationCharge +
    miscCost +
    fittingCost;

  /* ================= DISCOUNT ================= */
  let discountAmount = 0;

  if (order.discount?.type === "percentage") {
    const pct = Math.max(
      0,
      Math.min(100, Number(order.discount?.value) || 0)
    );
    discountAmount = grossSubtotal * (pct / 100);
  }

  if (order.discount?.type === "amount") {
    const amount = Number(order.discount?.value) || 0;
    discountAmount = Math.min(grossSubtotal, amount);
  }

  /* ================= FINAL ================= */
  const finalAmount = grossSubtotal - discountAmount;

  return Number(finalAmount.toFixed(2));
};