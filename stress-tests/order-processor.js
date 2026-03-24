// order-processor.js
const PRODUCT_IDS = [22, 23, 24, 25, 26, 40, 41, 42, 43, 44];
const PRICE_MAP = {
  22: 25.00,
  23: 30.00,
  24: 18.00,
  25: 22.00,
  26: 35.00,
  40: 45.00,
  41: 50.00,
  42: 28.00,
  43: 32.00,
  44: 40.00
};

function randomQuantity() {
  return Math.floor(Math.random() * 3) + 1; // 1–3
}

function generateAndSetPayload(context, events, done) {
  const items = PRODUCT_IDS.map(pid => {
    const quantity = randomQuantity();
    const price = PRICE_MAP[pid] || 20.00;
    return {
      product_id: pid,
      quantity: quantity,
      price: price,
      discount_applied: false,
      offer_info: null,
      special_instructions: ""
    };
  });
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalPrice = totalPrice + 15; // delivery_fee = 15, discount = 0

  context.vars.items = items;
  context.vars.totalPrice = totalPrice;
  context.vars.finalPrice = finalPrice;
  return done();
}

module.exports = { generateAndSetPayload };