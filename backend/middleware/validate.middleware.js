export const validateProduct = (req, res, next) => {
  const { name, fk_product_category, price } = req.body;

  if (!name || !fk_product_category || !price) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["name", "fk_product_category", "price"],
    });
  }

  if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({ error: "Price must be a positive number" });
  }

  next();
};

export const validateClient = (req, res, next) => {
  const { name, contact_person, location, phone1 } = req.body;

  if (!name || !contact_person || !location || !phone1) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["name", "contact_person", "location", "phone1"],
    });
  }

  next();
};

export const validateOrder = (req, res, next) => {
  const { fk_order_client, fk_order_product, qty, unit_price } = req.body;

  if (!fk_order_client || !fk_order_product || !qty || !unit_price) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["fk_order_client", "fk_order_product", "qty", "unit_price"],
    });
  }

  if (typeof qty !== "number" || qty <= 0) {
    return res
      .status(400)
      .json({ error: "Quantity must be a positive number" });
  }

  if (typeof unit_price !== "number" || unit_price <= 0) {
    return res
      .status(400)
      .json({ error: "Unit price must be a positive number" });
  }

  next();
};

export const validateBatch = (req, res, next) => {
  const { fk_batch_product, batch_number, mfg_date, exp_date, init_qty, cost } =
    req.body;

  const errors = {};

  // Check required fields
  if (!fk_batch_product) {
    errors.fk_batch_product = "Product is required";
  }
  if (!batch_number) {
    errors.batch_number = "Batch number is required";
  }
  if (!mfg_date) {
    errors.mfg_date = "Manufacturing date is required";
  }
  if (!exp_date) {
    errors.exp_date = "Expiry date is required";
  }
  if (!init_qty) {
    errors.init_qty = "Initial quantity is required";
  }
  if (!cost) {
    errors.cost = "Cost is required";
  }

  // Validate number types and ranges
  if (typeof init_qty !== "number" || init_qty <= 0) {
    errors.init_qty = "Initial quantity must be a positive number";
  }
  if (typeof cost !== "number" || cost <= 0) {
    errors.cost = "Cost must be a positive number";
  }
  if (typeof fk_batch_product !== "number" || fk_batch_product <= 0) {
    errors.fk_batch_product = "Invalid product selected";
  }

  // Validate dates
  const mfgDate = new Date(mfg_date);
  const expDate = new Date(exp_date);

  if (isNaN(mfgDate.getTime())) {
    errors.mfg_date = "Invalid manufacturing date format";
  }
  if (isNaN(expDate.getTime())) {
    errors.exp_date = "Invalid expiry date format";
  }

  // Check if expiry date is after manufacturing date
  if (mfgDate && expDate && expDate <= mfgDate) {
    errors.exp_date = "Expiry date must be after manufacturing date";
  }

  // Return errors if any
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      errors: errors,
    });
  }

  if (expDate <= mfgDate) {
    return res
      .status(400)
      .json({ error: "Expiry date must be after manufacturing date" });
  }

  if (mfgDate >= expDate) {
    return res
      .status(400)
      .json({ error: "Expiry date must be after manufacturing date" });
  }

  next();
};

export const validateBatchOrder = (req, res, next) => {
  const { fk_batch_order_batch, fk_batch_order_order, qty, description } = req.body;
  const errors = {};

  // Check required fields
  if (!fk_batch_order_batch) {
    errors.fk_batch_order_batch = "Batch ID is required";
  }
  if (!fk_batch_order_order) {
    errors.fk_batch_order_order = "Order ID is required";
  }
  if (!qty) {
    errors.qty = "Quantity is required";
  }

  // Validate types and ranges
  if (typeof fk_batch_order_batch !== "number" || fk_batch_order_batch <= 0) {
    errors.fk_batch_order_batch = "Batch ID must be a positive number";
  }
  if (typeof fk_batch_order_order !== "number" || fk_batch_order_order <= 0) {
    errors.fk_batch_order_order = "Order ID must be a positive number";
  }
  if (typeof qty !== "number" || qty <= 0) {
    errors.qty = "Quantity must be a positive number";
  }

  // Validate description if provided
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      errors.description = "Description must be a string";
    } else if (description.length > 200) {
      errors.description = "Description cannot exceed 200 characters";
    }
  }

  // Return errors if any
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      errors: errors,
    });
  }

  next();
};

export const validateCategory = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      error: "Category name is required and must be a non-empty string",
      required: ["name"],
    });
  }

  next();
};
