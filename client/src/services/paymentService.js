import api from "./api";

export const fetchPayments = async (params) => {
  const { data } = await api.get("/payments", { params });
  return data;
};

export const fetchPaymentById = async (id) => {
  const { data } = await api.get(`/payments/${id}`);
  return data;
};

export const fetchDealerLedger = async (dealerId) => {
  const { data } = await api.get(`/payments/ledger/${dealerId}`);
  return data;
};

export const createPayment = async (payload) => {
  const normalizedPayload = {
    ...payload,
    paymentMethod: payload.paymentMethod === "Bank" ? "Bank Transfer" : payload.paymentMethod,
  };
  const { data } = await api.post("/payments", normalizedPayload);
  return data;
};
