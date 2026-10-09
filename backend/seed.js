const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("./models/Category");
const Product = require("./models/Product");

const categoriesData = [
  {
    name: "Kurtas",
    slug: "kurtas",
    description: "Classic Indian silhouettes tailored with precision and breathable fabrics for everyday refinement.",
    image: "",
    isActive: true,
  },
  {
    name: "Kurtis",
    slug: "kurtis",
    description: "Contemporary and relaxed kurtis designed for effortless elegance and movement.",
    image: "",
    isActive: true,
  },
  {
    name: "Everyday",
    slug: "everyday",
    description: "Subtle and dependable daily staples crafted with soft handloom-inspired textiles.",
    image: "",
    isActive: true,
  },
  {
    name: "Festive",
    slug: "festive",
    description: "Rich tones, delicate weaves, and celebratory silhouettes for memorable occasions.",
    image: "",
    isActive: true,
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Upsert categories
    const categoryMap = {};
    for (const cat of categoriesData) {
      const savedCat = await Category.findOneAndUpdate(
        { slug: cat.slug },
        cat,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      categoryMap[cat.slug] = savedCat._id;
    }
    console.log("Categories seeded successfully.");

    const productsData = [
      {
        name: "Classic Ivory Kurta",
        slug: "classic-ivory-kurta",
        description: "Soft cotton, mandarin collar, easy straight fit tailored for effortless all-day wear.",
        price: 1499,
        category: categoryMap["kurtas"],
        images: ["/images/products/ivory-kurta.jpg"],
        variants: [
          { size: "S", color: "Ivory", stock: 15 },
          { size: "M", color: "Ivory", stock: 25 },
          { size: "L", color: "Ivory", stock: 20 },
          { size: "XL", color: "Ivory", stock: 12 },
          { size: "M", color: "Slate", stock: 10 },
          { size: "L", color: "Slate", stock: 8 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Midnight Navy Kurta",
        slug: "midnight-navy-kurta",
        description: "Cotton-linen blend with fine tonal piping and handcrafted mother-of-pearl buttons.",
        price: 1699,
        category: categoryMap["kurtas"],
        images: ["/images/products/navy-kurta.jpg"],
        variants: [
          { size: "S", color: "Navy", stock: 10 },
          { size: "M", color: "Navy", stock: 20 },
          { size: "L", color: "Navy", stock: 18 },
          { size: "XL", color: "Navy", stock: 14 },
          { size: "XXL", color: "Navy", stock: 6 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Sand Beige Kurti",
        slug: "sand-beige-kurti",
        description: "Relaxed A-line kurti in breathable textured cotton with subtle side seam detailing.",
        price: 1399,
        category: categoryMap["kurtis"],
        images: ["/images/products/beige-kurti.jpg"],
        variants: [
          { size: "XS", color: "Sand Beige", stock: 12 },
          { size: "S", color: "Sand Beige", stock: 20 },
          { size: "M", color: "Sand Beige", stock: 25 },
          { size: "L", color: "Sand Beige", stock: 15 },
        ],
        gender: "women",
        isActive: true,
      },
      {
        name: "Charcoal Everyday Kurta",
        slug: "charcoal-everyday-kurta",
        description: "A dependable daily kurta with a clean placket and textured slub cotton weave.",
        price: 1599,
        category: categoryMap["everyday"],
        images: ["/images/products/charcoal-kurta.jpg"],
        variants: [
          { size: "S", color: "Charcoal", stock: 14 },
          { size: "M", color: "Charcoal", stock: 22 },
          { size: "L", color: "Charcoal", stock: 19 },
          { size: "XL", color: "Charcoal", stock: 10 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Heritage Navy Kurta",
        slug: "heritage-navy-kurta",
        description: "Textured weave with quiet gold-thread stitch details along the collar and cuffs.",
        price: 1799,
        category: categoryMap["festive"],
        images: ["/images/products/heritage-navy.jpg"],
        variants: [
          { size: "S", color: "Heritage Navy", stock: 8 },
          { size: "M", color: "Heritage Navy", stock: 15 },
          { size: "L", color: "Heritage Navy", stock: 14 },
          { size: "XL", color: "Heritage Navy", stock: 10 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Ivory Straight Kurti",
        slug: "ivory-straight-kurti",
        description: "Straight cut silhouette with three-quarter sleeves and fine hand-stitched hem finish.",
        price: 1499,
        category: categoryMap["kurtis"],
        images: ["/images/products/ivory-straight.jpg"],
        variants: [
          { size: "XS", color: "Ivory", stock: 10 },
          { size: "S", color: "Ivory", stock: 18 },
          { size: "M", color: "Ivory", stock: 20 },
          { size: "L", color: "Ivory", stock: 12 },
        ],
        gender: "women",
        isActive: true,
      },
      {
        name: "Muted Slate Kurta",
        slug: "muted-slate-kurta",
        description: "Soft slate cotton tailored for everyday ease with breathable natural fiber construction.",
        price: 1599,
        category: categoryMap["everyday"],
        images: ["/images/products/slate-kurta.jpg"],
        variants: [
          { size: "S", color: "Muted Slate", stock: 12 },
          { size: "M", color: "Muted Slate", stock: 20 },
          { size: "L", color: "Muted Slate", stock: 18 },
          { size: "XL", color: "Muted Slate", stock: 8 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Heritage Ivory Kurta",
        slug: "heritage-ivory-kurta",
        description: "Our most-loved celebratory silhouette in pure ivory with tonal embroidery accents.",
        price: 1599,
        category: categoryMap["festive"],
        images: ["/images/products/heritage-ivory.jpg"],
        variants: [
          { size: "S", color: "Ivory", stock: 15 },
          { size: "M", color: "Ivory", stock: 25 },
          { size: "L", color: "Ivory", stock: 20 },
          { size: "XL", color: "Ivory", stock: 12 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Midnight Blue Kurta",
        slug: "midnight-blue-kurta",
        description: "Deep indigo and midnight shades with structured silhouette and subtle luster.",
        price: 1699,
        category: categoryMap["festive"],
        images: ["/images/products/midnight-blue.jpg"],
        variants: [
          { size: "S", color: "Midnight Blue", stock: 10 },
          { size: "M", color: "Midnight Blue", stock: 18 },
          { size: "L", color: "Midnight Blue", stock: 15 },
          { size: "XL", color: "Midnight Blue", stock: 9 },
        ],
        gender: "men",
        isActive: true,
      },
      {
        name: "Classic Beige Kurti",
        slug: "classic-beige-kurti",
        description: "A timeless kurti that pairs seamlessly with traditional bottoms or contemporary denim.",
        price: 1449,
        category: categoryMap["kurtis"],
        images: ["/images/products/beige-classic.jpg"],
        variants: [
          { size: "XS", color: "Classic Beige", stock: 14 },
          { size: "S", color: "Classic Beige", stock: 22 },
          { size: "M", color: "Classic Beige", stock: 20 },
          { size: "L", color: "Classic Beige", stock: 14 },
        ],
        gender: "women",
        isActive: true,
      },
      {
        name: "Deep Charcoal Kurta",
        slug: "deep-charcoal-kurta",
        description: "Understated, crisp tailoring made to repeat across seasons and everyday occasions.",
        price: 1649,
        category: categoryMap["everyday"],
        images: ["/images/products/deep-charcoal.jpg"],
        variants: [
          { size: "S", color: "Charcoal", stock: 12 },
          { size: "M", color: "Charcoal", stock: 24 },
          { size: "L", color: "Charcoal", stock: 18 },
          { size: "XL", color: "Charcoal", stock: 11 },
        ],
        gender: "men",
        isActive: true,
      },
    ];

    for (const prod of productsData) {
      await Product.findOneAndUpdate(
        { slug: prod.slug },
        prod,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
    console.log("Products seeded successfully.");

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedDB();
