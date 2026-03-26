import api from "./api";

export const fetchLeads = async (params = {}) => {
  const { data } = await api.get("/leads", { params });
  return data;
};

export const fetchLeadById = async (id) => {
  const { data } = await api.get(`/leads/${id}`);
  return data;
};

export const fetchLeadActivity = async (id) => {
  const { data } = await api.get(`/leads/${id}/activity`);
  return data;
};

export const fetchLeadNotes = async (id) => {
  const { data } = await api.get(`/leads/${id}/notes`);
  return data;
};

export const createLead = async (payload) => {
  const { data } = await api.post("/leads", payload);
  return data;
};

export const updateLead = async (id, payload) => {
  const { data } = await api.put(`/leads/${id}`, payload);
  return data;
};

export const updateLeadStatus = async (id, payload) => {
  const { data } = await api.patch(`/leads/${id}/status`, payload);
  return data;
};

export const deleteLead = async (id) => {
  const { data } = await api.delete(`/leads/${id}`);
  return data;
};

export const assignLead = async (id, payload) => {
  const requestBody =
    typeof payload === "string" ? { dealerId: payload } : payload;
  const { data } = await api.put(`/leads/${id}/assign`, requestBody);
  return data;
};

export const assignLeadToSales = async (id, payload) => {
  const requestBody =
    typeof payload === "string" ? { salesId: payload } : payload;
  const { data } = await api.put(`/leads/${id}/assign-sales`, requestBody);
  return data;
};

export const addLeadNote = async (id, payload) => {
  const { data } = await api.post(`/leads/${id}/notes`, payload);
  return data;
};

export const exportLeadsCsv = async (params = {}) => {
  const response = await api.get("/leads/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};
