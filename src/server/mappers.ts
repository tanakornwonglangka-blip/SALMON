import type { UserDto } from "./types.js";

type Row = Record<string, unknown>;

const num = (value: unknown): number | null => value == null ? null : Number(value);
const str = (value: unknown): string => String(value ?? "");

export function rowToUser(row: Row | undefined): UserDto | null {
  if (!row) return null;
  const firstName = str(row.first_name);
  const lastName = str(row.last_name);
  return {
    id: Number(row.id),
    username: str(row.username),
    email: str(row.email),
    role: row.role as UserDto["role"],
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    deliveryAddress: row.delivery_address == null ? null : str(row.delivery_address),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    merchantId: num(row.merchant_id)
  };
}

export function merchantRow(row: Row) {
  return {
    id: Number(row.id),
    parentMerchantId: num(row.parent_merchant_id),
    name: str(row.name),
    category: str(row.category),
    address: str(row.address),
    location: str(row.location),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    rating: Number(row.rating),
    status: str(row.status),
    eta: str(row.eta)
  };
}

export function menuRow(row: Row) {
  return {
    id: Number(row.id),
    merchantId: Number(row.merchant_id),
    name: str(row.name),
    description: row.description == null ? null : str(row.description),
    price: Number(row.price),
    category: str(row.category),
    available: Boolean(row.available),
    imageUrl1: row.image_url_1 == null ? null : str(row.image_url_1),
    imageUrl2: row.image_url_2 == null ? null : str(row.image_url_2)
  };
}
