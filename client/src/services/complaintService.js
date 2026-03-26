import api from "./api";

export const fetchComplaints = async (params) => {
  const { data } = await api.get("/complaints", { params });
  return data;
};

export const fetchComplaintById = async (id) => {
  const { data } = await api.get(`/complaints/${id}`);
  return data;
};

export const fetchComplaintActivity = async (id) => {
  const { data } = await api.get(`/complaints/${id}/activity`);
  return data;
};

export const createComplaint = async (payload) => {
  const { data } = await api.post("/complaints", payload);
  return data;
};

export const updateComplaint = async (id, payload) => {
  const { data } = await api.put(`/complaints/${id}`, payload);
  return data;
};

export const deleteComplaint = async (id) => {
  const { data } = await api.delete(`/complaints/${id}`);
  return data;
};
