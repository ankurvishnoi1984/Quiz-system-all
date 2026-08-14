const express = require("express");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

router.post("/initiate", paymentController.initiate);
router.post("/confirm", paymentController.confirm);

module.exports = router;
