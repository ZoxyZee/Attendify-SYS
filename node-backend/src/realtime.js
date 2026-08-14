const clientsByCompany = new Map();

const sendEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const subscribeCompany = (companyId, res) => {
  const key = String(companyId);
  const clients = clientsByCompany.get(key) || new Set();
  clients.add(res);
  clientsByCompany.set(key, clients);

  sendEvent(res, "connected", { company_id: key, at: new Date().toISOString() });

  return () => {
    clients.delete(res);
    if (!clients.size) {
      clientsByCompany.delete(key);
    }
  };
};

export const publishCompanyEvent = (companyId, event, payload = {}) => {
  const clients = clientsByCompany.get(String(companyId));
  if (!clients?.size) {
    return;
  }

  const data = {
    ...payload,
    company_id: String(companyId),
    at: new Date().toISOString()
  };

  for (const client of clients) {
    sendEvent(client, event, data);
  }
};
