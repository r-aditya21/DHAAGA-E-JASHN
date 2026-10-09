// One-off: sets `gender` on products created before the field existed.
//   node scripts/backfill-gender.js          (preview, writes nothing)
//   node scripts/backfill-gender.js --apply  (saves the changes)
//
// It guesses from the product name ("kurti" -> women, "kurta" -> men) and
// leaves anything else as unisex. Review the preview, then fix odd ones in the
// admin panel.
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

const guess = (name) => {
  if (/kurti/i.test(name)) return "women";
  if (/kurta/i.test(name)) return "men";
  return "unisex";
};

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGODB_URI);

  const products = await Product.find({
    $or: [{ gender: { $exists: false } }, { gender: null }],
  });

  for (const product of products) {
    const gender = guess(product.name);
    console.log(`${apply ? "set " : "would set"} ${gender.padEnd(6)} <- ${product.name}`);
    if (apply) {
      await Product.updateOne({ _id: product._id }, { $set: { gender } });
    }
  }

  console.log(`${products.length} product(s) ${apply ? "updated" : "found (preview only)"}.`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
