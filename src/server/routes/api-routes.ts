import { Router } from "express";
import * as auth from "../controllers/auth-controller.js";
import * as checkout from "../controllers/checkout-controller.js";
import * as history from "../controllers/history-controller.js";
import * as merchant from "../controllers/merchant-controller.js";
import * as profile from "../controllers/profile-controller.js";
import * as portal from "../controllers/portal-controller.js";
import * as publicController from "../controllers/public-controller.js";
import * as users from "../controllers/users-controller.js";
import { asyncHandler } from "../utils.js";

export const apiRoutes = Router();

apiRoutes.get("/me", publicController.me);
apiRoutes.get("/restaurants", publicController.restaurants);
apiRoutes.get("/portal", portal.portal);
apiRoutes.get("/merchant-management", merchant.merchantManagement);
apiRoutes.get("/history", history.history);
apiRoutes.get("/users", users.users);

apiRoutes.post("/auth/login", auth.login);
apiRoutes.post("/auth/register", auth.register);
apiRoutes.post("/auth/logout", auth.logout);
apiRoutes.post("/user-profile", profile.updateUserProfile);
apiRoutes.post("/menu-items", merchant.saveMenuItem);
apiRoutes.post("/menu-items/delete", merchant.deleteMenuItem);
apiRoutes.post("/merchant-profile", merchant.updateMerchant);
apiRoutes.post("/sub-merchants", merchant.saveSubMerchant);
apiRoutes.post("/checkout", asyncHandler(checkout.checkout));
apiRoutes.post("/payment-redirect-check", asyncHandler(checkout.checkPaymentRedirect));
apiRoutes.get("/payments/:transactionId/status", asyncHandler(checkout.paymentStatus));
apiRoutes.post("/payments/octopus/notify", asyncHandler(checkout.octopusNotify));
apiRoutes.post("/payments/octopus/callback", asyncHandler(checkout.octopusNotify));
