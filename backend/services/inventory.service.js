const Product = require("../models/Product");

// Atomically take stock for each line. If any line cannot be fulfilled,
// everything already taken is put back and the failing line is returned.
// Works on any MongoDB deployment (no transaction required).
const reserveStock = async (lines) => {
  const reserved = [];

  for (const line of lines) {
    const result = await Product.updateOne(
      {
        _id: line.product,
        isActive: true,
        variants: {
          $elemMatch: {
            size: line.size,
            color: line.color,
            stock: { $gte: line.quantity },
          },
        },
      },
      { $inc: { "variants.$.stock": -line.quantity } }
    );

    if (result.modifiedCount !== 1) {
      await restoreStock(reserved);

      return { ok: false, failedLine: line };
    }

    reserved.push(line);
  }

  return { ok: true };
};

const restoreStock = async (lines) => {
  for (const line of lines) {
    await Product.updateOne(
      {
        _id: line.product,
        variants: {
          $elemMatch: { size: line.size, color: line.color },
        },
      },
      { $inc: { "variants.$.stock": line.quantity } }
    );
  }
};

module.exports = { reserveStock, restoreStock };
