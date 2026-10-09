const Address = require("../models/Address");

// Accepts "9876543210", "+91 98765 43210", "91-9876543210" or "09876543210"
// and returns the bare 10-digit mobile number (or null if it is not one).
// The country code is only stripped when 10 digits remain, so a valid number
// that happens to start with 91 (e.g. 9123456789) is left intact.
const PHONE_REGEX = /^(?:\+?91|0)?([6-9]\d{9})$/;

const normalisePhone = (raw) => {
  const match = raw.replace(/[\s-]/g, "").match(PHONE_REGEX);
  return match ? match[1] : null;
};
const PINCODE_REGEX = /^[1-9]\d{5}$/; // 6-digit Indian PIN code

const STRING_FIELDS = [
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "country",
];

// Trims string fields and validates phone/pincode. Returns { data } or { error }.
const cleanAddressBody = (body, { partial }) => {
  const data = {};

  for (const field of STRING_FIELDS) {
    if (body[field] === undefined) continue;

    if (typeof body[field] !== "string") {
      return { error: `${field} must be a string` };
    }

    data[field] = body[field].trim();
  }

  if (data.phone !== undefined) {
    const phone = normalisePhone(data.phone);

    if (!phone) {
      return { error: "Please provide a valid 10-digit phone number" };
    }

    data.phone = phone;
  }

  if (data.pincode !== undefined && !PINCODE_REGEX.test(data.pincode)) {
    return { error: "Please provide a valid 6-digit pincode" };
  }

  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") {
      return { error: "isDefault must be true or false" };
    }

    data.isDefault = body.isDefault;
  }

  if (!partial) {
    const required = [
      "fullName",
      "phone",
      "addressLine1",
      "city",
      "state",
      "pincode",
    ];

    if (required.some((field) => !data[field])) {
      return { error: "Required address fields are missing" };
    }
  } else {
    const requiredWhenSent = ["fullName", "addressLine1", "city", "state"];

    if (requiredWhenSent.some((field) => data[field] === "")) {
      return { error: "Required address fields cannot be empty" };
    }
  }

  return { data };
};

const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({
      user: req.user.userId,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const { data, error } = cleanAddressBody(req.body, { partial: false });

    if (error) {
      return res.status(400).json({ message: error });
    }

    const existingCount = await Address.countDocuments({
      user: req.user.userId,
    });

    // The first address is always the default.
    const isDefault = existingCount === 0 ? true : data.isDefault === true;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user.userId },
        { isDefault: false }
      );
    }

    const address = await Address.create({
      ...data,
      user: req.user.userId,
      country: data.country || "India",
      isDefault,
    });

    res.status(201).json({
      message: "Address created successfully",
      address,
    });
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    const { data, error } = cleanAddressBody(req.body, { partial: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (data.isDefault === true) {
      await Address.updateMany(
        {
          user: req.user.userId,
          _id: { $ne: address._id },
        },
        { isDefault: false }
      );
    }

    // The only way to move the default is to mark another address as default,
    // so a user is never left without one.
    if (data.isDefault === false && address.isDefault) {
      delete data.isDefault;
    }

    Object.assign(address, data);

    await address.save();

    res.status(200).json({
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    // If the default was deleted, promote the most recent remaining address.
    if (address.isDefault) {
      const replacement = await Address.findOne({
        user: req.user.userId,
      }).sort({ createdAt: -1 });

      if (replacement) {
        replacement.isDefault = true;
        await replacement.save();
      }
    }

    res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
