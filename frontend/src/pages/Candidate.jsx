import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import "./Candidate.css";

const SearchIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const PlusIcon = () => (
    <span style={{ fontSize: "16px", fontWeight: "700", marginRight: "4px", lineHeight: 1 }}>+</span>
);

const TrashIcon = ({ color = "currentColor" }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={color}>
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

const PaperPlaneIcon = ({ color = "currentColor" }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={color}>
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);

const FilterVariantIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#9E9E9E">
        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const AlertCircleIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SyncIcon = ({ spinning }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
            animation: spinning ? "spin 1s linear infinite" : "none",
            transformOrigin: "center"
        }}
    >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
);

function Candidate() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [editCandidate, setEditCandidate] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [candidateToDelete, setCandidateToDelete] = useState(null);
    const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
    const [messageRecipients, setMessageRecipients] = useState([]);
    const [messageBody, setMessageBody] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyCandidate, setHistoryCandidate] = useState(null);
    const [historyMessages, setHistoryMessages] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formData, setFormData] = useState({ name: "", phone_number: "", email: "" });
    const [formErrors, setFormErrors] = useState({});

    const [toast, setToast] = useState(null);

    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchCandidates = async (query = "", silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = {};
            if (query) params.search = query;

            const response = await api.get("candidates/", { params });
            const data = response.data?.data || response.data || [];
            setCandidates(Array.isArray(data) ? data : []);
        } catch (error) {
            if (!silent) showToast("Failed to fetch candidates", "error");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSyncStatus = async () => {
        setIsSyncing(true);
        try {
            const response = await api.post("messages/sync-status/");
            const updated = response.data?.updated_count || 0;
            await fetchCandidates(search, true);
            if (historyCandidate) {
                fetchCommunicationHistory(historyCandidate, true);
            }
            if (updated > 0) {
                showToast(`Synced ${updated} status update${updated > 1 ? "s" : ""} from WhatsApp`);
            } else {
                showToast("All message statuses are up to date");
            }
        } catch (error) {
            showToast("Failed to sync status from WhatsApp", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchCommunicationHistory = async (candidate, silent = false) => {
        if (!silent) setLoadingHistory(true);
        try {
            const response = await api.get(`candidates/${candidate.id}/messages/`);
            setHistoryMessages(response.data?.history || []);
            fetchCandidates(search, true);
        } catch (error) {
            if (!silent) setHistoryMessages([]);
        } finally {
            if (!silent) setLoadingHistory(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchCandidates(search);
        }, 250);
        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isHistoryOpen && historyCandidate) {
                fetchCommunicationHistory(historyCandidate, true);
            } else {
                fetchCandidates(search, true);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isHistoryOpen, historyCandidate, search]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleOpenAdd = () => {
        setEditCandidate(null);
        setFormData({ name: "", phone_number: "", email: "" });
        setFormErrors({});
        setIsAddEditOpen(true);
    };

    const handleOpenEdit = (candidate) => {
        setEditCandidate(candidate);
        setFormData({
            name: candidate.name || "",
            phone_number: candidate.phone_number || "",
            email: candidate.email || ""
        });
        setFormErrors({});
        setIsAddEditOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!formData.name.trim()) errors.name = "Candidate name is required";
        if (!formData.phone_number.trim()) errors.phone_number = "Mobile number is required";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        try {
            if (editCandidate) {
                const response = await api.put(`candidates/${editCandidate.id}/`, formData);
                const updated = response.data?.data || response.data;
                setCandidates((prev) => prev.map((c) => (c.id === editCandidate.id ? updated : c)));
                showToast("Candidate updated successfully");
            } else {
                const response = await api.post("candidates/", formData);
                const created = response.data?.data || response.data;
                setCandidates((prev) => [created, ...prev]);
                showToast("Candidate added successfully");
            }
            setIsAddEditOpen(false);
        } catch (error) {
            const apiErr = error.response?.data?.error || error.response?.data?.message || "Operation failed";
            if (typeof apiErr === "object") {
                setFormErrors(apiErr);
            } else {
                showToast(String(apiErr), "error");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClickHeaderDelete = () => {
        if (selectedIds.length === 0) {
            showToast("Please select at least one candidate to delete", "error");
            return;
        }
        setCandidateToDelete(null);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        setLoading(true);
        try {
            if (candidateToDelete) {
                await api.delete(`candidates/${candidateToDelete.id}/`);
                setCandidates((prev) => prev.filter((c) => c.id !== candidateToDelete.id));
                setSelectedIds((prev) => prev.filter((id) => id !== candidateToDelete.id));
                showToast("Candidate deleted successfully");
            } else {
                await Promise.all(selectedIds.map((id) => api.delete(`candidates/${id}/`)));
                setCandidates((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
                showToast(`${selectedIds.length} Candidates deleted successfully`);
                setSelectedIds([]);
            }
            setIsDeleteModalOpen(false);
            setCandidateToDelete(null);
        } catch (error) {
            showToast("Failed to delete candidate(s)", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleClickHeaderSendMessage = () => {
        if (selectedIds.length === 0) {
            showToast("Please select at least one candidate to message", "error");
            return;
        }
        const selected = candidates.filter((c) => selectedIds.includes(c.id));
        setMessageRecipients(selected);
        setMessageBody("");
        setIsSendMessageOpen(true);
    };

    const handleSendMessageSubmit = async (e) => {
        e.preventDefault();
        if (!messageBody.trim()) {
            showToast("Please enter a message", "error");
            return;
        }

        setIsSendingMessage(true);
        try {
            if (messageRecipients.length === 1) {
                await api.post("messages/send/", {
                    candidate_id: messageRecipients[0].id,
                    body: messageBody.trim()
                });
                showToast(`Message sent to ${messageRecipients[0].name}`);
            } else {
                await api.post("messages/bulk-send/", {
                    candidate_ids: messageRecipients.map((c) => c.id),
                    body: messageBody.trim()
                });
                showToast(`Message sent to ${messageRecipients.length} candidates`);
            }
            setIsSendMessageOpen(false);
            setMessageBody("");
            setSelectedIds([]);
            await fetchCandidates(search);
            if (historyCandidate && messageRecipients.some((r) => r.id === historyCandidate.id)) {
                fetchCommunicationHistory(historyCandidate);
            }
        } catch (error) {
            const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Failed to send message";
            showToast(errorMsg, "error");
            await fetchCandidates(search);
            if (historyCandidate && messageRecipients.some((r) => r.id === historyCandidate.id)) {
                fetchCommunicationHistory(historyCandidate);
            }
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleOpenHistory = (candidate) => {
        setHistoryCandidate(candidate);
        setIsHistoryOpen(true);
        fetchCommunicationHistory(candidate);
    };

    const handleRetryMessage = async (messageId) => {
        try {
            await api.post(`messages/${messageId}/retry/`);
            showToast("Message retry initiated");
            if (historyCandidate) {
                fetchCommunicationHistory(historyCandidate);
            }
            fetchCandidates(search);
        } catch (error) {
            const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Retry failed";
            showToast(formatErrorMessage(errorMsg), "error");
            if (historyCandidate) {
                fetchCommunicationHistory(historyCandidate);
            }
            fetchCandidates(search);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(candidates.map((c) => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const formatCandidateId = (id) => {
        if (!id) return "A1B2C3";
        return id.replace(/-/g, "").slice(0, 6).toUpperCase();
    };

    const formatDate = (dateString) => {
        if (!dateString) return "NA";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "NA";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatErrorMessage = (error) => {
        if (!error) return "";
        const text = String(error);
        if (text.includes("466") || text.toLowerCase().includes("quota") || text.toLowerCase().includes("correspondent")) {
            return "Green API Free Plan limit: Monthly quota of 3 phone numbers exceeded on this developer instance. You can only send to your 3 registered test numbers.";
        }
        if (text.includes("http") || text.includes("waInstance") || text.includes("Client Error")) {
            return "Failed to send WhatsApp message. Please check provider connection.";
        }
        return text;
    };

    const renderStatusBadge = (status) => {
        const s = (status || "").toLowerCase().trim();
        if (s === "read") {
            return (
                <span className="status-badge read">
                    <CheckIcon />
                    <span>read</span>
                </span>
            );
        }
        if (s === "delivered") {
            return (
                <span className="status-badge delivered">
                    <CheckIcon />
                    <span>Delivered</span>
                </span>
            );
        }
        if (s === "sent") {
            return (
                <span className="status-badge sent">
                    <span>Sent</span>
                </span>
            );
        }
        if (s === "failed") {
            return (
                <span className="status-badge failed">
                    <AlertCircleIcon />
                    <span>Failed</span>
                </span>
            );
        }
        if (s === "pending") {
            return (
                <span className="status-badge pending">
                    <span>Pending</span>
                </span>
            );
        }
        return <span className="status-text-na">NA</span>;
    };

    const paginatedCandidates = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return candidates.slice(start, start + rowsPerPage);
    }, [candidates, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(candidates.length / rowsPerPage) || 1;
    const fillerRowCount = Math.max(0, rowsPerPage - paginatedCandidates.length);
    const hasSelection = selectedIds.length > 0;

    return (
        <div className="full-page-viewport">
            {toast && (
                <div className={`toast-alert ${toast.type}`}>
                    <span>{toast.message}</span>
                </div>
            )}

            <header className="header-container">
                <div className="header-title-text">Candidate communication</div>

                <div className="header-buttons-row">
                    <button className="btn-add-candidate-outlined" onClick={handleOpenAdd}>
                        <PlusIcon />
                        ADD CANDIDATE
                    </button>

                    <button
                        className={`btn-delete-candidate ${hasSelection ? "active" : "inactive"}`}
                        onClick={handleClickHeaderDelete}
                        title={hasSelection ? `Delete ${selectedIds.length} candidate(s)` : "Select candidates to delete"}
                    >
                        <TrashIcon color={hasSelection ? "#FFFFFF" : "#8A8A8A"} />
                        DELETE CANDIDATE
                    </button>

                    <button
                        className={`btn-send-message ${hasSelection ? "active" : "inactive"}`}
                        onClick={handleClickHeaderSendMessage}
                        title={hasSelection ? `Send message to ${selectedIds.length} candidate(s)` : "Select candidates to message"}
                    >
                        <PaperPlaneIcon color={hasSelection ? "#FFFFFF" : "#8A8A8A"} />
                        SEND MESSAGE
                    </button>

                    <button
                        className="btn-sync-status"
                        onClick={handleSyncStatus}
                        disabled={isSyncing}
                        title="Sync latest message status (sent, delivered, read) from WhatsApp"
                    >
                        <SyncIcon spinning={isSyncing} />
                        {isSyncing ? "SYNCING..." : "SYNC STATUS"}
                    </button>

                    <div className="search-input-container">
                        <span className="search-icon-pos">
                            <SearchIcon />
                        </span>
                        <input
                            type="text"
                            className="search-field"
                            placeholder="Search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            </header>

            <div className="table-scroll-wrapper">
                <table className="data-grid-table">
                    <thead>
                        <tr>
                            <th style={{ width: "48px", textAlign: "center" }}>
                                <input
                                    type="checkbox"
                                    className="custom-row-checkbox"
                                    checked={selectedIds.length === candidates.length && candidates.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>
                                <div className="th-content-wrapper">
                                    <span>Full name</span>
                                    <button className="filter-icon-button" title="Filter by name">
                                        <FilterVariantIcon />
                                    </button>
                                </div>
                            </th>
                            <th>
                                <div className="th-content-wrapper">
                                    <span>Mobile number</span>
                                    <button className="filter-icon-button" title="Filter by mobile number">
                                        <FilterVariantIcon />
                                    </button>
                                </div>
                            </th>
                            <th>
                                <div className="th-content-wrapper">
                                    <span>Last message</span>
                                    <button className="filter-icon-button" title="Filter by last message date">
                                        <FilterVariantIcon />
                                    </button>
                                </div>
                            </th>
                            <th>
                                <div className="th-content-wrapper">
                                    <span>Status</span>
                                    <button className="filter-icon-button" title="Filter by status">
                                        <FilterVariantIcon />
                                    </button>
                                </div>
                            </th>
                            <th>
                                <div className="th-content-wrapper">
                                    <span>Candidate ID</span>
                                    <button className="filter-icon-button" title="Filter by candidate ID">
                                        <FilterVariantIcon />
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCandidates.map((candidate) => {
                            const isSelected = selectedIds.includes(candidate.id);
                            return (
                                <tr key={candidate.id} className={`data-row ${isSelected ? "selected" : ""}`}>
                                    <td style={{ textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            className="custom-row-checkbox"
                                            checked={isSelected}
                                            onChange={() => handleSelectRow(candidate.id)}
                                        />
                                    </td>
                                    <td>
                                        <span
                                            className="candidate-name-link"
                                            onClick={() => handleOpenHistory(candidate)}
                                            title="Click to view communication history"
                                        >
                                            {candidate.name}
                                        </span>
                                    </td>
                                    <td>{candidate.phone_number || "NA"}</td>
                                    <td>{candidate.last_message ? formatDate(candidate.last_message) : "NA"}</td>
                                    <td>{renderStatusBadge(candidate.status)}</td>
                                    <td>{formatCandidateId(candidate.id)}</td>
                                </tr>
                            );
                        })}

                        {Array.from({ length: fillerRowCount }).map((_, index) => (
                            <tr key={`filler-${index}`} className="filler-row">
                                <td style={{ textAlign: "center" }}>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="bottom-footer-bar">
                <div className="footer-rows-selector">
                    <span>Rows per page:</span>
                    <select
                        className="footer-select-dropdown"
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                    </select>
                    <span>▾</span>
                </div>

                <div>
                    {candidates.length > 0
                        ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(
                              currentPage * rowsPerPage,
                              candidates.length
                          )} of ${candidates.length}`
                        : "0 of 0"}
                </div>

                <div className="footer-nav-controls">
                    <button
                        className="nav-arrow-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(1)}
                        title="First Page"
                    >
                        |&lt;
                    </button>
                    <button
                        className="nav-arrow-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        title="Previous Page"
                    >
                        &lt;
                    </button>
                    <button
                        className="nav-arrow-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        title="Next Page"
                    >
                        &gt;
                    </button>
                    <button
                        className="nav-arrow-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        title="Last Page"
                    >
                        &gt;|
                    </button>
                </div>
            </footer>

            {isAddEditOpen && (
                <div className="side-drawer-overlay" onClick={() => setIsAddEditOpen(false)}>
                    <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-top-bar">
                            <div className="drawer-top-title">
                                {editCandidate ? "Edit Candidate" : "Add Candidate"}
                            </div>
                            <button
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#757575" }}
                                onClick={() => setIsAddEditOpen(false)}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                            <div className="drawer-content-scroll">
                                <div className="field-item">
                                    <label className="field-label">Candidate Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="field-input"
                                        placeholder="e.g. Krishna Khandelwal"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.name && <div className="field-error-msg">{formErrors.name}</div>}
                                </div>

                                <div className="field-item">
                                    <label className="field-label">Mobile Number *</label>
                                    <input
                                        type="text"
                                        name="phone_number"
                                        className="field-input"
                                        placeholder="e.g. +91 9876543210"
                                        value={formData.phone_number}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.phone_number && (
                                        <div className="field-error-msg">{formErrors.phone_number}</div>
                                    )}
                                </div>

                                <div className="field-item">
                                    <label className="field-label">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="field-input"
                                        placeholder="e.g. candidate@example.com"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.email && <div className="field-error-msg">{formErrors.email}</div>}
                                </div>
                            </div>

                            <div className="drawer-bottom-actions">
                                <button
                                    type="button"
                                    className="btn-dialog-cancel"
                                    onClick={() => setIsAddEditOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-add-candidate-outlined" disabled={loading}>
                                    {loading ? "Saving..." : editCandidate ? "UPDATE CANDIDATE" : "ADD CANDIDATE"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal-scrim-overlay" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <span>
                                {candidateToDelete ? "Delete Candidate" : `Delete ${selectedIds.length} Candidates`}
                            </span>
                            <button
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#757575" }}
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="dialog-body">
                            <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>
                                {candidateToDelete
                                    ? "Are you sure you want to delete this Candidate?"
                                    : `Are you sure you want to delete ${selectedIds.length} Candidates?`}
                            </div>
                            <div style={{ fontSize: "13.5px", color: "#616161", lineHeight: 1.5 }}>
                                {candidateToDelete
                                    ? `This action cannot be undone, and you’ll lose all communication history with ${candidateToDelete.name}.`
                                    : "This action cannot be undone, and you’ll lose all communication history with these candidates."}
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-dialog-cancel"
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-dialog-delete"
                                onClick={handleConfirmDelete}
                                disabled={loading}
                            >
                                {loading ? "Deleting..." : "DELETE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSendMessageOpen && (
                <div className="modal-scrim-overlay" onClick={() => setIsSendMessageOpen(false)}>
                    <div className="dialog-box dialog-box-message" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <span>Send Message</span>
                            <button
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#757575" }}
                                onClick={() => setIsSendMessageOpen(false)}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleSendMessageSubmit}>
                            <div className="dialog-body">
                                <label className="field-label">
                                    {messageRecipients.length === 1
                                        ? "1 Recipient"
                                        : `${messageRecipients.length} Recipients`}
                                </label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                                    {messageRecipients.slice(0, 5).map((r) => (
                                        <span
                                            key={r.id}
                                            style={{
                                                background: "#E3F2FD",
                                                color: "#1565C0",
                                                borderRadius: "14px",
                                                padding: "3px 10px",
                                                fontSize: "12px",
                                                fontWeight: "600"
                                            }}
                                        >
                                            {r.name}
                                        </span>
                                    ))}
                                    {messageRecipients.length > 5 && (
                                        <span
                                            style={{
                                                background: "#EEEEEE",
                                                color: "#616161",
                                                borderRadius: "14px",
                                                padding: "3px 10px",
                                                fontSize: "12px",
                                                fontWeight: "600"
                                            }}
                                        >
                                            +{messageRecipients.length - 5}
                                        </span>
                                    )}
                                </div>

                                <div className="field-item">
                                    <label className="field-label">Message *</label>
                                    <div style={{ fontSize: "12px", color: "#757575", marginBottom: "6px" }}>
                                        Type, or paste the message you want to send.
                                    </div>
                                    <textarea
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            minHeight: "130px",
                                            padding: "12px",
                                            border: "1px solid #E0E0E0",
                                            borderRadius: "4px",
                                            fontSize: "14px",
                                            fontFamily: "inherit",
                                            outline: "none"
                                        }}
                                        placeholder="Type or paste here..."
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        required
                                    ></textarea>
                                </div>
                            </div>

                            <div className="dialog-footer">
                                <button
                                    type="button"
                                    className="btn-dialog-cancel"
                                    onClick={() => setIsSendMessageOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-add-candidate-outlined"
                                    style={{ background: "#2196F3", color: "#FFFFFF", borderColor: "#2196F3" }}
                                    disabled={isSendingMessage}
                                >
                                    {isSendingMessage ? "SENDING..." : "SEND MESSAGE"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isHistoryOpen && (
                <div className="side-drawer-overlay" onClick={() => setIsHistoryOpen(false)}>
                    <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-top-bar">
                            <div className="drawer-top-title">Communication history</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                    onClick={() => fetchCommunicationHistory(historyCandidate)}
                                    title="Refresh & sync WhatsApp status"
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#757575",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "4px"
                                    }}
                                >
                                    <SyncIcon spinning={loadingHistory} />
                                </button>
                                <button
                                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#757575" }}
                                    onClick={() => setIsHistoryOpen(false)}
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>

                        <div className="drawer-content-scroll">
                            {historyCandidate && (
                                <div
                                    style={{
                                        background: "#F8F9FA",
                                        border: "1px solid #E0E0E0",
                                        borderRadius: "6px",
                                        padding: "16px",
                                        marginBottom: "20px"
                                    }}
                                >
                                    <div style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>
                                        {historyCandidate.name}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#616161", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                        <span>{historyCandidate.phone_number || "NA"}</span>
                                        <span>•</span>
                                        <span>Candidate ID: {formatCandidateId(historyCandidate.id)}</span>
                                        {historyCandidate.email && (
                                            <>
                                                <span>•</span>
                                                <span>{historyCandidate.email}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {loadingHistory ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "#757575" }}>
                                    Loading history...
                                </div>
                            ) : historyMessages.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                                    <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>
                                        No communication history
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#757575", marginBottom: "18px" }}>
                                        You have not communicated with this candidate yet. When you send them a message, it will appear here.
                                    </div>
                                    <button
                                        className="btn-add-candidate-outlined"
                                        style={{ margin: "0 auto" }}
                                        onClick={() => {
                                            setIsHistoryOpen(false);
                                            setMessageRecipients([historyCandidate]);
                                            setIsSendMessageOpen(true);
                                        }}
                                    >
                                        SEND MESSAGE
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {historyMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                background: "#FFFFFF",
                                                border: "1px solid #E0E0E0",
                                                borderRadius: "6px",
                                                padding: "14px"
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12px", color: "#757575" }}>
                                                <span>{formatDate(msg.created_at)} | {formatTime(msg.created_at)}</span>
                                                {renderStatusBadge(msg.status)}
                                            </div>
                                            <div style={{ fontSize: "13.5px", color: "#212121", lineHeight: 1.5 }}>
                                                {msg.body}
                                            </div>
                                            {msg.error_message && (
                                                <div style={{ marginTop: "8px", fontSize: "12px", color: "#C62828", background: "#FFEBEE", padding: "6px 10px", borderRadius: "4px", lineHeight: 1.4 }}>
                                                    {formatErrorMessage(msg.error_message)}
                                                </div>
                                            )}
                                            {msg.status === "failed" && (
                                                <div style={{ marginTop: "10px", textAlign: "right" }}>
                                                    <button
                                                        type="button"
                                                        className="btn-add-candidate-outlined"
                                                        style={{ padding: "4px 12px", fontSize: "12px", minHeight: "28px" }}
                                                        onClick={() => handleRetryMessage(msg.id)}
                                                    >
                                                        RETRY SENDING
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="drawer-bottom-actions">
                            <button
                                className="btn-dialog-cancel"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                Close
                            </button>
                            <button
                                className="btn-add-candidate-outlined"
                                onClick={() => {
                                    setIsHistoryOpen(false);
                                    setMessageRecipients([historyCandidate]);
                                    setIsSendMessageOpen(true);
                                }}
                            >
                                SEND MESSAGE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Candidate;
