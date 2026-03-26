import api from "./api";

export const fetchAdminSummary = async () => {
  const { data } = await api.get("/analytics/summary");
  return data;
};

export const fetchDealerSummary = async () => {
  const { data } = await api.get("/analytics/dealer");
  return data;
};
