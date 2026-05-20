import { Roles } from "../domain/entities.js";
import { appState } from "./state.js";

const protectedRoutes = {
  portal: [Roles.ADMIN, Roles.MERCHANT],
  merchant: [Roles.ADMIN, Roles.MERCHANT],
  users: [Roles.ADMIN, Roles.MERCHANT, Roles.USER]
};

export function readRoute() {
  const route = window.location.hash.replace("#/", "") || "user";
  return ["user", "portal", "merchant", "users"].includes(route) ? route : "user";
}

export function syncRoute() {
  appState.route = readRoute();
  if ([Roles.ADMIN, Roles.MERCHANT].includes(appState.user?.role) && appState.route === "user") {
    window.location.hash = "#/portal";
    appState.route = "portal";
    return false;
  }
  const allowedRoles = protectedRoutes[appState.route];
  if (allowedRoles && !allowedRoles.includes(appState.user?.role)) {
    window.location.hash = "#/user";
    appState.route = "user";
    return false;
  }
  return true;
}
