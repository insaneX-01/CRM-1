import api from "./api";

export const fetchDashboardStats = async (params = {}) => {
  const { data } = await api.get("/dashboard/stats", { params });
  return data;
};

export const fetchDashboardCharts = async (params = {}) => {
  const { data } = await api.get("/dashboard/charts", { params });
  return data;
};

export const fetchDashboardActivity = async (params = {}) => {
  const { data } = await api.get("/dashboard/activity", { params });
  return data;
};

export const exportDashboardCsv = async (params = {}) => {
  const response = await api.get("/dashboard/export", {
    params,
    responseType: "blob",
  });

  return response.data;
};
