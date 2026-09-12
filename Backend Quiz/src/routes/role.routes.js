const express = require("express");
const roleController = require("../controllers/role.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", authorizeRoles("super_admin"), roleController.list);
router.post("/", authorizeRoles("super_admin"), roleController.create);
router.patch("/:roleId", authorizeRoles("super_admin"), roleController.update);
router.delete("/:roleId", authorizeRoles("super_admin"), roleController.remove);

module.exports = router;
