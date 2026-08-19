import api from "./client";

export const AuthAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

export const LeadsAPI = {
  list: (params) => api.get("/leads", { params }).then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data.lead),
  create: (body) => api.post("/leads", body).then((r) => r.data.lead),
  update: (id, body) => api.patch(`/leads/${id}`, body).then((r) => r.data.lead),
  reassign: (id, partnerId) => api.patch(`/leads/${id}/reassign`, { partnerId }).then((r) => r.data.lead),
  advanceStage: (id, body) => api.post(`/leads/${id}/advance-stage`, body).then((r) => r.data.lead),
  setStage: (id, stage) => api.post(`/leads/${id}/set-stage`, { stage }).then((r) => r.data.lead),
  editStageDetails: (id, body) => api.patch(`/leads/${id}/stage-details`, body).then((r) => r.data.lead),
  submitFinalVerification: (id, body) => api.post(`/leads/${id}/submit-final-verification`, body).then((r) => r.data.lead),
  fixDisbursement: (id, body) => api.post(`/leads/${id}/fix-disbursement`, body).then((r) => r.data.lead),
  close: (id, body) => api.post(`/leads/${id}/close`, body).then((r) => r.data.lead),
  reopen: (id) => api.post(`/leads/${id}/reopen`).then((r) => r.data.lead),
  requestDelete: (id, reason) => api.post(`/leads/${id}/request-delete`, { reason }).then((r) => r.data.lead),
  approveDelete: (id, approve) => api.post(`/leads/${id}/approve-delete`, { approve }).then((r) => r.data),
  remove: (id) => api.delete(`/leads/${id}`).then((r) => r.data),
  assignBackendTeam: (leadId, userId) => api.post(`/leads/${leadId}/assign-backend-team`, { userId }).then((r) => r.data.lead),
  unassignBackendTeam: (leadId, userId) => api.post(`/leads/${leadId}/unassign-backend-team`, { userId }).then((r) => r.data.lead),
};

export const VerificationAPI = {
  queues: (params) => api.get("/verification/queue", { params }).then((r) => r.data),
  approve: (id, field) => api.post(`/verification/${id}/${field}/approve`).then((r) => r.data.lead),
  reject: (id, field, reason) => api.post(`/verification/${id}/${field}/reject`, { reason }).then((r) => r.data.lead),
};

export const AccountingAPI = {
  list: (params) => api.get("/accounting", { params }).then((r) => r.data),
  getEntry: (leadId, field) => api.get(`/accounting/${leadId}/${field}`).then((r) => r.data),
  setRate: (leadId, field, ratePct) => api.patch(`/accounting/${leadId}/${field}/rate`, { ratePct }).then((r) => r.data.entry),
  setExpected: (leadId, field, expectedAmount) =>
    api.patch(`/accounting/${leadId}/${field}/expected`, { expectedAmount }).then((r) => r.data.entry),
  setInvoiceRaised: (leadId, field, invoiceRaised) =>
    api.patch(`/accounting/${leadId}/${field}/invoice-raised`, { invoiceRaised }).then((r) => r.data.entry),
  addInstallment: (leadId, field, body) => api.post(`/accounting/${leadId}/${field}/installments`, body).then((r) => r.data.entry),
  removeInstallment: (leadId, field, idx) =>
    api.delete(`/accounting/${leadId}/${field}/installments/${idx}`).then((r) => r.data.entry),
  reconcileInstallment: (leadId, field, idx) =>
    api.patch(`/accounting/${leadId}/${field}/installments/${idx}/reconcile`).then((r) => r.data.entry),
};

export const ExpensesAPI = {
  list: (leadId) => api.get(`/expenses/${leadId}`).then((r) => r.data.expenses),
  add: (leadId, body) => api.post(`/expenses/${leadId}`, body).then((r) => r.data.expense),
  remove: (id) => api.delete(`/expenses/${id}`).then((r) => r.data),
};

export const RemindersAPI = {
  board: () => api.get("/reminders/board").then((r) => r.data),
  listForLead: (leadId) => api.get(`/reminders/lead/${leadId}`).then((r) => r.data.reminders),
  add: (leadId, body) => api.post(`/reminders/lead/${leadId}`, body).then((r) => r.data.reminder),
  markDone: (id) => api.patch(`/reminders/${id}/done`).then((r) => r.data.reminder),
  markPending: (id) => api.patch(`/reminders/${id}/pending`).then((r) => r.data.reminder),
  remove: (id) => api.delete(`/reminders/${id}`).then((r) => r.data),
};

export const TaskAPI = {
  listAll: (params) => api.get(`/tasks/all`, { params }).then((r) => r.data),
  listForLead: (leadId) => api.get(`/tasks/lead/${leadId}`).then((r) => r.data.tasks),
  create: (leadId, body) => api.post(`/tasks/lead/${leadId}`, body).then((r) => r.data.task),
  update: (taskId, body) => api.put(`/tasks/${taskId}`, body).then((r) => r.data.task),
  delete: (taskId) => api.delete(`/tasks/${taskId}`).then((r) => r.data),
  addComment: (taskId, text) => api.post(`/tasks/${taskId}/comments`, { text }).then((r) => r.data.task),
  deleteComment: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`).then((r) => r.data.task),
};

export const NotificationsAPI = {
  list: (params) => api.get("/notifications", { params }).then((r) => r.data),
};

export const TeamAPI = {
  get: () => api.get("/team").then((r) => r.data),
  listAll: () => api.get("/team/all").then((r) => r.data.users),
  addUser: (body) => api.post("/team/users", body).then((r) => r.data.user),
  updateUser: (id, body) => api.patch(`/team/users/${id}`, body).then((r) => r.data.user),
  removeUser: (id) => api.delete(`/team/users/${id}`).then((r) => r.data),
  getBackendTeamMembers: () => api.get("/leads/backend-team/members").then((r) => r.data.users),
};

export const SettingsAPI = {
  get: () => api.get("/settings").then((r) => r.data),
  addProduct: (name, color) => api.post("/settings/products", { name, color }).then((r) => r.data.item),
  toggleProduct: (id) => api.patch(`/settings/products/${id}/toggle`).then((r) => r.data.item),
  setProductColor: (id, color) => api.patch(`/settings/products/${id}/color`, { color }).then((r) => r.data.item),
  addBank: (product, name) => api.post(`/settings/banks/${encodeURIComponent(product)}`, { name }).then((r) => r.data.item),
  toggleBank: (id) => api.patch(`/settings/banks/${id}/toggle`).then((r) => r.data.item),
  addExpenseType: (name) => api.post("/settings/expense-types", { name }).then((r) => r.data.item),
  toggleExpenseType: (id) => api.patch(`/settings/expense-types/${id}/toggle`).then((r) => r.data.item),
  addCompanyBankAccount: (name) => api.post("/settings/company-bank-accounts", { name }).then((r) => r.data.item),
  toggleCompanyBankAccount: (id) => api.patch(`/settings/company-bank-accounts/${id}/toggle`).then((r) => r.data.item),
  addDigitalChannel: (name) => api.post("/settings/digital-channels", { name }).then((r) => r.data.item),
  toggleDigitalChannel: (id) => api.patch(`/settings/digital-channels/${id}/toggle`).then((r) => r.data.item),
  addDSACode: (name) => api.post("/settings/dsa-codes", { name }).then((r) => r.data.item),
  toggleDSACode: (id) => api.patch(`/settings/dsa-codes/${id}/toggle`).then((r) => r.data.item),
};

export const NotesAPI = {
  listForLead: (leadId, type = "note") => api.get(`/notes/lead/${leadId}`, { params: { type } }).then((r) => r.data.notes),
  add: (leadId, text, type = "note") => api.post(`/notes/lead/${leadId}`, { text, type }).then((r) => r.data.note),
  update: (id, text) => api.patch(`/notes/${id}`, { text }).then((r) => r.data.note),
  remove: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
};

export const AttachmentsAPI = {
  listForLead: (leadId) => api.get(`/attachments/lead/${leadId}`).then((r) => r.data.attachments),
  add: (leadId, files) => {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    return api
      .post(`/attachments/lead/${leadId}`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.attachments);
  },
  update: (id, { file, label } = {}) => {
    const form = new FormData();
    if (file) form.append("files", file);
    if (label !== undefined) form.append("label", label);
    return api.patch(`/attachments/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.attachment);
  },
  remove: (id) => api.delete(`/attachments/${id}`).then((r) => r.data),
};

export const UploadAPI = {
  image: (file) => {
    const form = new FormData();
    form.append("image", file);
    return api.post("/uploads/image", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.url);
  },
};

export const KYCAPI = {
  get: (leadId) => api.get(`/kyc/${leadId}`).then((r) => r.data),
  update: (leadId, body) => api.put(`/kyc/${leadId}`, body).then((r) => r.data),
  addReference: (leadId, body) => api.post(`/kyc/${leadId}/references`, body).then((r) => r.data),
  removeReference: (leadId, referenceId) => api.delete(`/kyc/${leadId}/references/${referenceId}`).then((r) => r.data),
  share: (leadId) => api.post(`/kyc/${leadId}/share`).then((r) => r.data),
  revokeAll: (leadId) => api.post(`/kyc/${leadId}/revoke-all`).then((r) => r.data),
  getByToken: (token) => api.get(`/kyc/public/${token}`).then((r) => r.data),
  updateByToken: (token, body) => api.put(`/kyc/public/${token}`, body).then((r) => r.data),
};

export const ForumAPI = {
  get: (leadId) => api.get(`/forum/${leadId}`).then((r) => r.data),
  share: (leadId, emails) => api.post(`/forum/${leadId}/share`, { emails }).then((r) => r.data),
  unshare: (leadId, email) => api.post(`/forum/${leadId}/unshare`, { email }).then((r) => r.data),
  revokeAll: (leadId) => api.post(`/forum/${leadId}/revoke-all`).then((r) => r.data),
  addMessage: (leadId, body) => api.post(`/forum/${leadId}/messages`, body).then((r) => r.data),
  getByToken: (token) => api.get(`/forum/public/${token}`).then((r) => r.data),
};
