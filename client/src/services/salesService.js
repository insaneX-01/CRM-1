import api from "./api";

export const fetchSalesUsers = async (params = {}) => {
  const { data } = await api.get("/sales", { params });
  return data;
};

export const fetchSalesUserById = async (id) => {
  const { data } = await api.get(`/sales/${id}`);
  return data;
};

export const fetchMySalesProfile = async () => {
  const { data } = await api.get("/sales/profile/me");
  return data;
};

export const fetchSalesPerformance = async (id) => {
  const { data } = await api.get(`/sales/${id}/performance`);
  return data;
};

export const fetchSalesSummary = async (id) => {
  const { data } = await api.get(`/sales/${id}/summary`);
  return data;
};

export const createSalesUser = async (payload) => {
  const { data } = await api.post("/sales", payload);
  return data;
};

export const updateSalesUser = async (id, payload) => {
  const { data } = await api.put(`/sales/${id}`, payload);
  return data;
};

export const deleteSalesUser = async (id) => {
  const { data } = await api.delete(`/sales/${id}`);
  return data;
};
