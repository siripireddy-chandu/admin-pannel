import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

function AdminPortal() {
  const [activeTab, setActiveTab] = useState("Tab1");
  const [iframeLoading, setIframeLoading] = useState(true);

  // Modal state & Loader control indicators
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [blockDate, setBlockDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([{ startTime: "", endTime: "" }]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  const scriptURL =
    "https://script.google.com/macros/s/AKfycbxPV-ktlGx4iRuywZj9AHDzSDS4B58I5KAWB-JAonEHQe37fckieZHhLTTVfGrNOFBNlA/exec";

  // Helper utility function to translate 24-hr layout string structures to 12-hr format
  const convertTo12Hour = (timeStr) => {
    if (!timeStr) return "";
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Fetch blocked slots directly from the Google Sheet on load
  const fetchBlockedSlots = async () => {
    setModalLoading(true);
    try {
      const response = await fetch(scriptURL);
      const data = await response.json();
      setBlockedSlots(data);
    } catch (error) {
      console.error("Error reading slots:", error);
      Swal.fire({
        target: document.getElementById("portalModalBackdrop") || "body", // 👈 Ensures visibility inside modal
        icon: "error",
        title: "Fetch Failed",
        text: "Could not sync currently blocked slots data.",
        confirmButtonColor: "#0d6efd",
      });
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab("Tab1");

    const interval = setInterval(() => {
      setIframeLoading(true);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Sync sheet collection changes on window launch
  useEffect(() => {
    if (showBlockModal) {
      fetchBlockedSlots();
    }
  }, [showBlockModal]);

  const handleTabClick = (tabName) => {
    if (tabName === "BlockModalOpen") {
      setShowBlockModal(true);
    } else {
      setActiveTab(tabName);
      setIframeLoading(true);
    }
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleTimeSlotChange = (index, e) => {
    const { name, value } = e.target;
    const updatedSlots = [...timeSlots];
    updatedSlots[index][name] = value;
    setTimeSlots(updatedSlots);
  };

  const addTimeSlotRow = () => {
    setTimeSlots([...timeSlots, { startTime: "", endTime: "" }]);
  };

  const removeTimeSlotRow = (index) => {
    if (timeSlots.length === 1) return;
    const updatedSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(updatedSlots);
  };

  // Handle slot deletion via SweetAlert configuration layouts
  const handleDeleteSlot = async (slotToDelete, index) => {
    const formattedStart = convertTo12Hour(slotToDelete.startTime);
    const formattedEnd = convertTo12Hour(slotToDelete.endTime);

    const result = await Swal.fire({
      target: document.getElementById("portalModalBackdrop") || "body", // 👈 Dynamically positions alert context layer inside active modal viewport container boundary
      title: "Unblock Time Slot?",
      text: `Are you sure you want to remove the lockout window on ${slotToDelete.date} from ${formattedStart} to ${formattedEnd}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    setModalLoading(true);
    const payload = new URLSearchParams();
    payload.append("action", "deleteSlot");
    payload.append("date", slotToDelete.date);
    payload.append("startTime", slotToDelete.startTime);
    payload.append("endTime", slotToDelete.endTime);

    try {
      await fetch(scriptURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      setBlockedSlots(blockedSlots.filter((_, i) => i !== index));
      Swal.fire({
        target: document.getElementById("portalModalBackdrop") || "body", // 👈 Appends the alert wrapper directly into modal layer frame context layout
        icon: "success",
        title: "Unblocked",
        text: "The time window has been successfully restored.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Deletion error details:", error);
      Swal.fire({
        target: document.getElementById("portalModalBackdrop") || "body",
        icon: "error",
        title: "Action Failed",
        text: "Something went wrong while communicating with the server.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (!blockDate) return;

    const validSlots = timeSlots.filter(
      (slot) => slot.startTime && slot.endTime,
    );
    if (validSlots.length === 0) return;

    setModalLoading(true);
    try {
      const requests = validSlots.map(async (slot) => {
        const payload = new URLSearchParams();
        payload.append("action", "blockSlot");
        payload.append("date", blockDate);
        payload.append("startTime", slot.startTime);
        payload.append("endTime", slot.endTime);

        return fetch(scriptURL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: payload.toString(),
        });
      });

      await Promise.all(requests);

      const newlyBlocked = validSlots.map((slot) => ({
        date: blockDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      setBlockedSlots([...blockedSlots, ...newlyBlocked]);

      Swal.fire({
        target: document.getElementById("portalModalBackdrop") || "body", // 👈 Ensures visibility inside modal
        icon: "success",
        title: "Operational Locks Saved",
        text: `${validSlots.length} slot adjustments deployed successfully!`,
        confirmButtonColor: "#0d6efd",
      });

      setBlockDate("");
      setTimeSlots([{ startTime: "", endTime: "" }]);
      setShowBlockModal(false);
    } catch (error) {
      console.error("Sync structural error:", error);
      Swal.fire({
        target: document.getElementById("portalModalBackdrop") || "body",
        icon: "error",
        title: "Submission Error",
        text: "Could not apply scheduling block configurations.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="bg-light min-vh-100 py-4 font-sans position-relative">
      {/* Premium Top Sub-Navigation Dashboard Panel */}
      <div className="container max-w-1000 mb-5 pt-3">
        <div className="card border-0 shadow-sm bg-dark p-2 rounded-4 d-flex flex-row justify-content-between align-items-center">
          <div className="d-flex gap-2">
            <button
              className={`btn px-4 py-2.5 rounded-3 fw-semibold transition-all ${activeTab === "Tab1" ? "btn-light text-dark" : "btn-dark text-secondary"}`}
              onClick={() => handleTabClick("Tab1")}
            >
              CASH ON DELIVERY DATA
            </button>
            <button
              className={`btn px-4 py-2.5 rounded-3 fw-semibold transition-all ${activeTab === "Tab2" ? "btn-light text-dark" : "btn-dark text-secondary"}`}
              onClick={() => handleTabClick("Tab2")}
            >
              REQUEST CALL DATA
            </button>
          </div>
          <button
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleTabClick("BlockModalOpen")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z" />
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 4a.5.5 0 0 0-.5.5v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3a.5.5 0 0 0-.5-.5" />
            </svg>
            BLOCK TIME SLOTS
          </button>
        </div>
      </div>

      {/* Frame Panels Container View */}
      <div className="container max-w-1000">
        {activeTab === "Tab1" && (
          <div className="card border-0 shadow-sm p-4 rounded-4 bg-white">
            <h4 className="fw-bold text-dark mb-4">
              Cash on Delivery Analytics
            </h4>
            <div
              className="position-relative overflow-hidden rounded-3 border"
              style={{ minHeight: "600px" }}
            >
              {iframeLoading && (
                <div className="loading-blur-overlay">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                  ></div>
                </div>
              )}
              <iframe
                src="https://script.google.com/macros/s/AKfycbyxhOTrUIJKxe-4Q9wz0URt4xKNssCfbfqajPraST5aR0CuPuxfpjNF1hpbJvbgzRCx/exec"
                width="100%"
                height="800px"
                style={{ border: "none" }}
                title="Cash on Delivery Data"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}

        {activeTab === "Tab2" && (
          <div className="card border-0 shadow-sm p-4 rounded-4 bg-white">
            <h4 className="fw-bold text-dark mb-4">Request a Call Log</h4>
            <div
              className="position-relative overflow-hidden rounded-3 border"
              style={{ minHeight: "600px" }}
            >
              {iframeLoading && (
                <div className="loading-blur-overlay">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                  ></div>
                </div>
              )}
              <iframe
                src="https://script.google.com/macros/s/AKfycbyvsMcypP9XB-5uZlFA6CjtMy6KsdR4FwexMKcdmwl0meRun7XTYtjSal43Jxan1V07/exec"
                width="100%"
                height="800px"
                style={{ border: "none" }}
                title="Request Call Data"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modern Dynamic Multi-Slot Modal Layout */}
      {showBlockModal && (
        /* ADDED UNIQUE ID ATTRIBUTE TARGET LAYER TO ALIGN POP-UP VIEWS OVER COMPONENT BACKDROP */
        <div
          id="portalModalBackdrop"
          className="modal-custom-backdrop d-flex align-items-center justify-content-center"
        >
          <div
            className="card border-0 shadow-lg p-4 rounded-4 bg-white modal-custom-content animate-fade-in position-relative"
            style={{ maxWidth: "600px" }}
          >
            {/* Overlay Loading Spinner Inside Modal */}
            {modalLoading && (
              <div className="loading-blur-overlay rounded-4">
                <div
                  className="spinner-border text-primary"
                  role="status"
                ></div>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold text-dark mb-0">
                Create Scheduling Override
              </h4>
              <button
                type="button"
                className="btn-close shadow-none"
                onClick={() => setShowBlockModal(false)}
              ></button>
            </div>

            {/* Displays active overrides with 12-Hour conversion format */}
            <div className="mb-4 p-3 bg-light rounded-3 border border-light-subtle">
              <h6 className="fw-bold text-dark mb-2 small text-uppercase tracking-wider">
                Currently Blocked Slots
              </h6>
              <div style={{ maxHeight: "140px", overflowY: "auto" }}>
                {blockedSlots.length === 0 ? (
                  <span className="text-muted small">
                    No active blocked slots found.
                  </span>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {blockedSlots.map((slot, index) => (
                      <span
                        key={index}
                        className="badge bg-dark-subtle text-dark-emphasis border py-2 px-2.5 rounded-2 small font-monospace d-flex align-items-center gap-2"
                      >
                        <span>
                          {slot.date} | {convertTo12Hour(slot.startTime)} -{" "}
                          {convertTo12Hour(slot.endTime)}
                        </span>
                        <button
                          type="button"
                          className="btn-close"
                          style={{ fontSize: "0.65rem", padding: "2px" }}
                          onClick={() => handleDeleteSlot(slot, index)}
                          title="Unblock this slot"
                        ></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleBlockSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">
                  Target Block Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-lg border-light-subtle bg-light-subtle custom-focus"
                  min={new Date().toISOString().split("T")[0]}
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary d-flex justify-content-between align-items-center">
                  <span>New Time Windows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary py-1 px-2 fw-semibold"
                    onClick={addTimeSlotRow}
                  >
                    + Add Another Slot
                  </button>
                </label>

                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {timeSlots.map((slot, index) => (
                    <div className="row g-2 mb-2 align-items-end" key={index}>
                      <div className="col">
                        {index === 0 && (
                          <span className="text-muted d-block small mb-1">
                            Start Time
                          </span>
                        )}
                        <input
                          type="time"
                          className="form-control border-light-subtle bg-light-subtle custom-focus"
                          name="startTime"
                          value={slot.startTime}
                          onChange={(e) => handleTimeSlotChange(index, e)}
                          required
                        />
                      </div>
                      <div className="col">
                        {index === 0 && (
                          <span className="text-muted d-block small mb-1">
                            End Time
                          </span>
                        )}
                        <input
                          type="time"
                          className="form-control border-light-subtle bg-light-subtle custom-focus"
                          name="endTime"
                          value={slot.endTime}
                          onChange={(e) => handleTimeSlotChange(index, e)}
                          required
                        />
                      </div>
                      <div className="col-auto">
                        <button
                          type="button"
                          className="btn btn-light border text-danger"
                          disabled={timeSlots.length === 1}
                          onClick={() => removeTimeSlotRow(index)}
                          style={{ minHeight: "38px" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-grid gap-2 pt-2">
                <button
                  type="submit"
                  className="btn btn-primary py-3 rounded-3 fw-semibold shadow-sm"
                >
                  Apply Operational Lockout
                </button>
                <button
                  type="button"
                  className="btn btn-light py-2.5 rounded-3 fw-semibold border text-secondary"
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS Styling Architecture */}
      <style>{`
        .max-w-1000 { max-width: 1000px; margin: 0 auto; width: 100%; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .custom-focus:focus {
          background-color: #fff !important;
          border-color: #86b7fe !important;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15) !important;
        }
        .loading-blur-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 10;
        }
        .modal-custom-backdrop {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
          z-index: 9999; padding: 20px;
        }
        .modal-custom-content { max-width: 520px; width: 100%; transform: translateY(0); }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Fixed overlay stack ordering issue inside custom backdrop containers */
        .swal2-container { z-index: 100000 !important; }
      `}</style>
    </div>
  );
}
 
export default AdminPortal;
