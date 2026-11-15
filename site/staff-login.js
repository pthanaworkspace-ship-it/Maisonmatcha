import { $, api, setToken, getToken, toast, fieldError, clearErrors } from './club-common.js';
const next = (() => { const n = new URLSearchParams(location.search).get('next') || '/staff/club'; return n.startsWith('/') && !n.startsWith('//') ? n : '/staff/club'; })();
(async () => {
  if (getToken()) { try { await api('/auth/me'); location.replace(next); return; } catch { setToken(''); } }
  let setup = false;
  try { setup = (await api('/auth/setup-needed')).needed; } catch (e) { $('#msg').textContent = e.message; }
  if (setup) { $('#setupBox').classList.remove('hidden'); $('#p2box').classList.remove('hidden'); $('#p2').required = true; $('#p').autocomplete = 'new-password'; $('#b').textContent = 'ສ້າງບັນຊີ'; $('#title').textContent = 'ສ້າງບັນຊີຜູ້ດູແລ (ຄັ້ງທຳອິດ)'; }
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(); const b = $('#b'); b.disabled = true;
    try {
      const body = { username: $('#u').value, password: $('#p').value };
      if (setup) { if ($('#p').value !== $('#p2').value) { fieldError($('#p2'), 'ລະຫັດຜ່ານບໍ່ກົງກັນ'); b.disabled = false; return; } body.display_name = $('#dn').value; }
      const r = await api(setup ? '/auth/setup' : '/auth/login', { method: 'POST', body });
      setToken(r.token); location.replace(next);
    } catch (err) { toast(err.message, 'err'); if (err.field) fieldError($(err.field === 'username' ? '#u' : '#p'), err.message); } finally { b.disabled = false; }
  });
})();
