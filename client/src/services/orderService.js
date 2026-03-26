import api from "./api";

export const fetchOrders = async (params = {}) => {
  const { data } = await api.get("/orders", { params });
  return data;
};

export const fetchOrderById = async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

export const createOrder = async (payload) => {
  const { data } = await api.post("/orders", payload);
  return data;
};

export const updateOrder = async (id, payload) => {
  const { data } = await api.put(`/orders/${id}`, payload);
  return data;
};

export const deleteOrder = async (id) => {
  const { data } = await api.delete(`/orders/${id}`);
  return data;
};
