const express = require("express");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

router.post("/initiate", paymentController.initiate);
router.post("/renew/initiate", paymentController.initiateRenewal);
router.post("/confirm", paymentController.confirm);

module.exports = router;
