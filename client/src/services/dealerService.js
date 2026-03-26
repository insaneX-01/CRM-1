import api from "./api";

export const fetchDealers = async (params = {}) => {
  const { data } = await api.get("/dealers", { params });
  return data;
};

export const fetchDealerById = async (id) => {
  const { data } = await api.get(`/dealers/${id}`);
  return data;
};

export const fetchMyDealerProfile = async () => {
  const { data } = await api.get("/dealers/profile/me");
  return data;
};

export const fetchDealerSummary = async (id) => {
  const { data } = await api.get(`/dealers/${id}/summary`);
  return data;
};

export const fetchDealerPerformance = async (id) => {
  const { data } = await api.get(`/dealers/${id}/performance`);
  return data;
};

export const createDealer = async (payload) => {
  const { data } = await api.post("/dealers", payload);
  return data;
};

export const updateDealer = async (id, payload) => {
  const { data } = await api.put(`/dealers/${id}`, payload);
  return data;
};

export const deleteDealer = async (id) => {
  const { data } = await api.delete(`/dealers/${id}`);
  return data;
};

export const exportDealersCsv = async (params = {}) => {
  const response = await api.get("/dealers/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};
