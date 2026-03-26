import api from "./api";

export const login = async ({ email, password }) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const dealerLogin = async ({ email, password }) => {
  const { data } = await api.post("/auth/dealer-login", { email, password });
  return data;
};

export const salesLogin = async ({ email, password }) => {
  const { data } = await api.post("/auth/sales-login", { email, password });
  return data;
};

export const register = async ({ name, email, password, role, area, phone, businessName, address }) => {
  const { data } = await api.post("/auth/register", {
    name,
    email,
    password,
    role,
    area,
    phone,
    businessName,
    address,
  });
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get("/auth/profile");
  return data;
};
