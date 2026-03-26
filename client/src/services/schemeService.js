import api from "./api";

export const fetchSchemes = async () => {
  const { data } = await api.get("/schemes");
  return data;
};

export const createScheme = async (payload) => {
  const { data } = await api.post("/schemes", payload);
  return data;
};

export const updateScheme = async (id, payload) => {
  const { data } = await api.put(`/schemes/${id}`, payload);
  return data;
};
