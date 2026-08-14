import { ObjectId } from "mongodb";

export const serialize = (value) => {
  if (value instanceof ObjectId) {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
};

export const sanitizeUser = (user) => {
  const output = serialize(user);
  if (output) {
    delete output.password_hash;
  }
  return output;
};
