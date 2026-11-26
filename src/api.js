// Talks to the Google Apps Script web app attached to your sheet.
// POSTs use Content-Type text/plain so the browser skips the CORS preflight
// (Apps Script web apps do not answer OPTIONS requests).

const KEY_URL = 'orders.scriptUrl';
const KEY_TOKEN = 'orders.token';

export const getConfig = () => ({
  url: localStorage.getItem(KEY_URL) || import.meta.env.VITE_SCRIPT_URL || '',
  token: localStorage.getItem(KEY_TOKEN) || import.meta.env.VITE_TOKEN || '',
});

export const saveConfig = ({ url, token }) => {
  localStorage.setItem(KEY_URL, url.trim());
  localStorage.setItem(KEY_TOKEN, token.trim());
};

export const clearConfig = () => {
  localStorage.removeItem(KEY_URL);
  localStorage.removeItem(KEY_TOKEN);
};

async function parse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Unexpected response. Check the Web App URL and that access is set to "Anyone".');
  }
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function listOrders() {
  const { url, token } = getConfig();
  const res = await fetch(`${url}?action=list&token=${encodeURIComponent(token)}`);
  return (await parse(res)).orders;
}

async function post(body) {
  const { url, token } = getConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, token }),
  });
  return parse(res);
}

export const addOrder = (order) => post({ action: 'add', order }).then((d) => d.order);
export const updateOrder = (order) => post({ action: 'update', order }).then((d) => d.order);
export const deleteOrder = (id) => post({ action: 'delete', id });
