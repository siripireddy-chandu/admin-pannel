import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import SignaturePad from "signature_pad";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "../firebase";
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

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  const [consentDate, setConsentDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [clientName, setClientName] = useState("");
  const [proName, setProName] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeSignature, setActiveSignature] = useState(null);

  const signatureModalCanvas = useRef(null);
  const signatureModalPad = useRef(null);
  const [clientSignatureImage, setClientSignatureImage] = useState("");
  const [proSignatureImage, setProSignatureImage] = useState("");
  const [clientSignatureData, setClientSignatureData] = useState("");
  const [proSignatureData, setProSignatureData] = useState("");

  const clientSignatureCanvas = useRef(null);
  const proSignatureCanvas = useRef(null);

  const clientSignaturePad = useRef(null);
  const proSignaturePad = useRef(null);

  const CONSENT_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz6Ye6MuWMhwWewJ6oYBlFCGWF-BoIArwXKDc5fGbbwT43M7RkNXl2YboVt0RPzyrjG/exec";

  const clearClientSignature = () => {
    if (clientSignaturePad.current) {
      clientSignaturePad.current.clear();
    }
  };

  const clearProSignature = () => {
    if (proSignaturePad.current) {
      proSignaturePad.current.clear();
    }
  };

  const openSignatureModal = (type) => {
    setActiveSignature(type);
    setShowSignatureModal(true);

    setTimeout(() => {
      const canvas = signatureModalCanvas.current;

      if (!canvas) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;

      const ctx = canvas.getContext("2d");

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);

      signatureModalPad.current = new SignaturePad(canvas, {
        minWidth: 1,
        maxWidth: 3,
        penColor: "#000",
      });

      // Load existing signature when editing
      const existingSignature =
        type === "client" ? clientSignatureData : proSignatureData;

      if (existingSignature) {
        signatureModalPad.current.fromDataURL(existingSignature);
      }
    }, 100);
  };

  const closeSignatureModal = () => {
    if (signatureModalPad.current) {
      signatureModalPad.current.off();
      signatureModalPad.current = null;
    }

    setShowSignatureModal(false);
    setActiveSignature(null);
  };

  const clearSignatureModal = () => {
    if (signatureModalPad.current) {
      signatureModalPad.current.clear();
    }
  };

  const saveSignatureFromModal = () => {
    if (!signatureModalPad.current || signatureModalPad.current.isEmpty()) {
      Swal.fire({
        icon: "warning",
        title: "Signature Required",
        text: "Please provide a signature.",
      });

      return;
    }

    // Get signature directly from the BIG modal canvas
    const signatureData = signatureModalPad.current.toDataURL("image/png");

    if (activeSignature === "client") {
      setClientSignatureData(signatureData);
      setClientSignatureImage(signatureData);
    }

    if (activeSignature === "pro") {
      setProSignatureData(signatureData);
      setProSignatureImage(signatureData);
    }

    closeSignatureModal();
  };

  const closeConsentModal = () => {
    setShowConsentModal(false);

    clientSignaturePad.current = null;
    proSignaturePad.current = null;

    setClientSignatureData("");
    setProSignatureData("");
  };

  const openConsentModal = () => {
    setShowConsentModal(true);

    setTimeout(() => {
      if (clientSignatureCanvas.current) {
        clientSignaturePad.current = new SignaturePad(
          clientSignatureCanvas.current,
          {
            minWidth: 1,
            maxWidth: 2.5,
          },
        );
      }

      if (proSignatureCanvas.current) {
        proSignaturePad.current = new SignaturePad(proSignatureCanvas.current, {
          minWidth: 1,
          maxWidth: 2.5,
        });
      }
    }, 300);
  };

  const pdfYFromTop = (pageHeight, topPercent, elementHeightPercent = 0) => {
    return pageHeight * (1 - topPercent / 100 - elementHeightPercent / 100);
  };

  const saveSignedConsent = async () => {
    if (!clientName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Client Name Required",
        text: "Please enter the client's name.",
      });
      return;
    }

    if (!clientSignatureData) {
      Swal.fire({
        icon: "warning",
        title: "Client Signature Required",
        text: "Please ask the client to sign.",
      });
      return;
    }

    if (!proName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Pro Name Required",
        text: "Please enter the professional's name.",
      });
      return;
    }

    if (!proSignatureData) {
      Swal.fire({
        icon: "warning",
        title: "Pro Signature Required",
        text: "Please provide the professional's signature.",
      });
      return;
    }

    try {
      setConsentLoading(true);

      // Load original consent PDF
      const response = await fetch("/lhr-consent-template.pdf");

      if (!response.ok) {
        throw new Error("Consent PDF template not found");
      }

      const existingPdfBytes = await response.arrayBuffer();

      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const page = pdfDoc.getPages()[0];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // DATE
      // ==========================================
      // DATE
      // ==========================================

      // DATE
      page.drawText(consentDate, {
        x: pageWidth * 0.08, // 1.5 cm left
        y: pdfYFromTop(pageHeight, 87.2), // very slightly down
        size: 9,
        font,
      });

      // CLIENT NAME
      page.drawText(clientName, {
        x: pageWidth * 0.115, // 1.5 cm left
        y: pdfYFromTop(pageHeight, 89.5), // slightly down
        size: 9,
        font,
      });

      // PRO NAME
      page.drawText(proName, {
        x: pageWidth * 0.805, // 1.5 cm left
        y: pdfYFromTop(pageHeight, 89.5), // slightly down
        size: 9,
        font,
      });

      // ==========================================
      // CLIENT SIGNATURE
      // ==========================================

      const clientSignatureImage = await pdfDoc.embedPng(clientSignatureData);

      page.drawImage(clientSignatureImage, {
        x: pageWidth * 0.205,

        // IMPORTANT:
        // Move signature DOWN to the Signature row
        y: pdfYFromTop(pageHeight, 91.0),

        width: pageWidth * 0.13,
        height: pageHeight * 0.025,
      });

      // ==========================================
      // PRO SIGNATURE
      // ==========================================

      const proSignatureImage = await pdfDoc.embedPng(proSignatureData);

      page.drawImage(proSignatureImage, {
        x: pageWidth * 0.855,

        // IMPORTANT:
        // Same row as Client Signature
        y: pdfYFromTop(pageHeight, 91.0),

        width: pageWidth * 0.13,
        height: pageHeight * 0.025,
      });

      // Create final PDF Base64
      const finalPdfBase64 = await pdfDoc.saveAsBase64({
        dataUri: false,
      });

      const safeClientName = clientName.trim().replace(/[^a-z0-9]/gi, "_");

      const fileName = `LHR_Consent_${safeClientName}_${consentDate}.pdf`;

      const payload = new URLSearchParams();

      payload.append("action", "saveConsent");

      payload.append("clientName", clientName);

      payload.append("date", consentDate);

      payload.append("proName", proName);

      payload.append("fileName", fileName);

      payload.append("pdfBase64", finalPdfBase64);

      const uploadResponse = await fetch(CONSENT_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      });

      const result = await uploadResponse.json();

      console.log("Consent upload result:", result);

      if (!result.success) {
        throw new Error(result.message || "Failed to save consent");
      }

      Swal.fire({
        icon: "success",
        title: "Consent Saved",
        text: "The signed consent has been saved to Google Drive.",
        confirmButtonColor: "#0d6efd",
      });

      closeConsentModal();

      setClientName("");
      setProName("");

      setConsentDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Consent upload error:", error);

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error.message || "Unable to save consent.",
      });
    } finally {
      setConsentLoading(false);
    }
  };
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

 useEffect(() => {
  const setupNotifications = async () => {
    try {
      alert("1. Notification setup started");

      if (!("Notification" in window)) {
        alert("2. Notifications NOT supported");
        return;
      }

      const permission = await Notification.requestPermission();
      alert("3. Permission: " + permission);

      if (permission !== "granted") {
        alert("STOP: Permission not granted");
        return;
      }

      const messaging = await getFirebaseMessaging();

      if (!messaging) {
        alert("STOP: Firebase Messaging not supported");
        return;
      }

      alert("4. Firebase Messaging OK");

      const registration =
        await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );

      alert(
        "5. Service Worker OK\n" +
        registration.scope
      );

      alert("6. Generating FCM token...");

      const token = await getToken(messaging, {
        vapidKey:
          "BFZvjzngbQ8QUtGDtMSNLTj-jExq-DJqGzFv9dV-JnuUddrE56J0KhpuPmov9mYpaTwqSxAFv7BkoUnCI3Z4cWw",
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        alert("7. FCM TOKEN IS EMPTY");
        return;
      }

      alert(
        "7. FCM TOKEN GENERATED!\n\n" +
        token.substring(0, 30) +
        "..."
      );

      const formData = new URLSearchParams();

      formData.append("action", "registerToken");
      formData.append("token", token);
      formData.append(
        "device",
        `${navigator.platform} - ${navigator.userAgent}`
      );

      await fetch(
        "https://script.google.com/macros/s/AKfycbwuiSSV27FQPWSlRpwJyudjwnXR3QoCcMys83nV4qj9LTUvG_K4myXR7Ce_laoxfgiE/exec",
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      alert("8. TOKEN SENT TO GOOGLE SHEETS");

    } catch (error) {
      alert(
        "ERROR:\n\n" +
        error.name +
        "\n\n" +
        error.message
      );

      console.error(
        "Notification setup failed:",
        error
      );
    }
  };

  setupNotifications();
}, []);

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
          <button
            className="btn btn-success px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2 shadow-sm"
            onClick={openConsentModal}
          >
            COLLECT CONSENT
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

      {showConsentModal && (
        <div className="exact-consent-backdrop">
          <div className="exact-consent-modal">
            {consentLoading && (
              <div className="consent-processing-overlay">
                <div className="consent-processing-loader">
                  <video
                    src="/document-processing-animation-gif-download-15109350.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="consent-processing-video"
                  />

                  <div className="consent-processing-text">
                    Saving Consent...
                  </div>
                </div>
              </div>
            )}

            {/* HEADER */}

            <div className="exact-consent-header">
              <h5 className="mb-0 fw-bold">Collect Consent</h5>

              <button
                type="button"
                className="btn-close"
                onClick={closeConsentModal}
                disabled={consentLoading}
              />
            </div>

            {/* PDF */}

            <div className="exact-consent-scroll">
              <div className="pdf-template-wrapper">
                {/* EXACT ORIGINAL DESIGN */}

                <img
                  src="/lhr-consent-template.png"
                  alt="LHR Consent Form"
                  className="pdf-template-image"
                />

                {/* DATE */}

                <input
                  type="date"
                  className="pdf-date-input"
                  value={consentDate}
                  onChange={(e) => setConsentDate(e.target.value)}
                />

                {/* CLIENT NAME */}

                <input
                  type="text"
                  className="pdf-client-name-input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />

                {/* PRO NAME */}

                <input
                  type="text"
                  className="pdf-pro-name-input"
                  value={proName}
                  onChange={(e) => setProName(e.target.value)}
                />

                {/* CLIENT SIGNATURE */}

                <div
                  className="pdf-client-signature signature-click-area"
                  onClick={() => openSignatureModal("client")}
                >
                  {clientSignatureImage ? (
                    <img
                      src={clientSignatureImage}
                      alt="Client Signature"
                      className="signature-preview-image"
                    />
                  ) : (
                    <span className="signature-placeholder">
                      Tap here to sign
                    </span>
                  )}

                  <button
                    type="button"
                    className="signature-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearClientSignature();
                      setClientSignatureImage("");
                    }}
                  >
                    Clear
                  </button>
                </div>

                {/* PRO SIGNATURE */}

                <div
                  className="pdf-pro-signature signature-click-area"
                  onClick={() => openSignatureModal("pro")}
                >
                  {proSignatureImage ? (
                    <img
                      src={proSignatureImage}
                      alt="Professional Signature"
                      className="signature-preview-image"
                    />
                  ) : (
                    <span className="signature-placeholder">
                      Tap here to sign
                    </span>
                  )}

                  <button
                    type="button"
                    className="signature-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProSignature();
                      setProSignatureImage("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* BUTTONS */}

            <div className="exact-consent-actions">
              <button
                type="button"
                className="btn btn-light border"
                onClick={closeConsentModal}
                disabled={consentLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-success px-4"
                onClick={saveSignedConsent}
                disabled={consentLoading}
              >
                {consentLoading ? "Saving..." : "SAVE SIGNED CONSENT"}
              </button>
            </div>
          </div>
          {showSignatureModal && (
            <div className="signature-modal-backdrop">
              <div className="signature-modal">
                <div className="signature-modal-header">
                  <div>
                    <h5>
                      {activeSignature === "client"
                        ? "Client Signature"
                        : "Professional Signature"}
                    </h5>

                    <small>Sign inside the box below</small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeSignatureModal}
                  />
                </div>

                <div className="signature-modal-body">
                  <div className="signature-writing-area">
                    <canvas ref={signatureModalCanvas} />

                    <div className="signature-line">Sign here</div>
                  </div>
                </div>

                <div className="signature-modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={clearSignatureModal}
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    className="btn btn-success px-4"
                    onClick={saveSignatureFromModal}
                  >
                    DONE
                  </button>
                </div>
              </div>
            </div>
          )}
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

.exact-consent-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.65);

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
}

.exact-consent-modal {
  width: min(95vw, 1000px);
  height: 95vh;

  background: white;

  border-radius: 14px;
  overflow: hidden;

  display: flex;
  flex-direction: column;

  position: relative;

  box-shadow:
    0 20px 70px
    rgba(0, 0, 0, 0.4);
}

.exact-consent-header {
  padding: 16px 22px;

  border-bottom:
    1px solid #ddd;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.exact-consent-scroll {
  flex: 1;

  overflow: auto;

  background: #e5e5e5;

  padding: 25px;

  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pdf-template-wrapper {
  position: relative;

  width: min(100%, 768px);

  flex-shrink: 0;
}

.pdf-template-image {
  display: block;

  width: 100%;
  height: auto;

  user-select: none;
}


/* =========================
   FORM FIELDS
   ========================= */

.pdf-date-input,
.pdf-client-name-input,
.pdf-pro-name-input {
  position: absolute;
  border: none;
  outline: none;
  background: transparent;
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #000;
  padding: 0;
  margin: 0;
}

/* =========================
   DATE
   ========================= */

.pdf-date-input {
  left: 7%;
  top: 86.7%;
  width: 22%;
  height: 2%;
}


/* =========================
   CLIENT NAME
   ========================= */

.pdf-client-name-input {
  left: 12%;
  top: 89.0%;
  width: 32%;
  height: 2%;
}


/* =========================
   PRO NAME
   ========================= */

.pdf-pro-name-input {
  left: 80%;
  top: 89.0%;
  width: 18%;
  height: 2%;
}


/* =========================
   SIGNATURES
   ========================= */

.pdf-client-signature,
.pdf-pro-signature {
  position: absolute;
}


/* Client signature goes AFTER
   "Client's Signature:" label */
.pdf-client-signature {
  left: 15%;
  top: 90.6%;
  width: 32%;
  height: 2.5%;
}


/* Pro signature goes AFTER
   "Pro's Signature:" label */
.pdf-pro-signature {
  left: 84%;
  top: 90.6%;
  width: 18%;
  height: 2.5%;
}


.pdf-client-signature canvas,
.pdf-pro-signature canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
  touch-action: none;
  background: transparent;
}

.signature-clear-btn {
  position: absolute;

  right: 0;
  top: 100%;

  margin-top: 2px;

  font-size: 10px;

  border: 1px solid #aaa;

  background: white;

  padding: 2px 7px;

  border-radius: 3px;
}

/* ==========================================
   SIGNATURE CLICK AREA
   ========================================== */

.signature-click-area {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.signature-click-area:hover {
  background: rgba(13, 110, 253, 0.08);
}

.signature-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;

  font-size: 10px;
  color: #777;

  pointer-events: none;
}

.signature-preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;

  pointer-events: none;
}


/* ==========================================
   SIGNATURE MODAL
   ========================================== */

.signature-modal-backdrop {
  position: fixed;
  inset: 0;

  z-index: 20000;

  background: rgba(0, 0, 0, 0.65);

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
}


.signature-modal {
  width: min(95vw, 850px);

  background: white;

  border-radius: 16px;

  overflow: hidden;

  box-shadow:
    0 20px 70px rgba(0, 0, 0, 0.4);

  display: flex;
  flex-direction: column;
}


/* HEADER */

.signature-modal-header {
  padding: 18px 22px;

  border-bottom: 1px solid #ddd;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.signature-modal-header h5 {
  margin: 0;
  font-weight: 700;
}

.signature-modal-header small {
  color: #777;
}


/* BODY */

.signature-modal-body {
  padding: 25px;

  background: #f3f4f6;
}


/* SIGNING AREA */

.signature-writing-area {
  position: relative;

  width: 100%;
  height: 320px;

  background: white;

  border: 2px dashed #aaa;

  border-radius: 12px;

  overflow: hidden;
}


.signature-writing-area canvas {
  width: 100%;
  height: 100%;

  display: block;

  touch-action: none;

  cursor: crosshair;
}


.signature-line {
  position: absolute;

  left: 10%;
  right: 10%;
  bottom: 60px;

  border-bottom: 1px solid #aaa;

  text-align: center;

  color: #aaa;

  font-size: 13px;

  pointer-events: none;
}


@media (max-width: 768px) {
  .container.max-w-1000 > .card {
    flex-wrap: wrap;
    gap: 8px;
  }

  .container.max-w-1000 > .card > div {
    width: 100%;
    display: flex;
    gap: 6px;
  }

  .container.max-w-1000 > .card > div button {
    flex: 1;
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 11px;
  }

  .container.max-w-1000 > .card > button {
    flex: 1;
    justify-content: center;
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 11px;
  }
}

/* ACTIONS */

.signature-modal-actions {
  padding: 15px 22px;

  border-top: 1px solid #ddd;

  display: flex;

  justify-content: space-between;

  gap: 10px;
}


.consent-processing-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}

.consent-processing-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.consent-processing-video {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.consent-processing-text {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* =========================
   ACTIONS
   ========================= */

.exact-consent-actions {
  padding: 15px 22px;

  border-top:
    1px solid #ddd;

  display: flex;
  justify-content: flex-end;

  gap: 10px;
}


@media (max-width: 768px) {

  .exact-consent-backdrop {
    padding: 5px;
  }

  .exact-consent-modal {
    width: 100%;
    height: 100%;

    border-radius: 0;
  }

  .exact-consent-scroll {
    padding: 5px;
  }

}





      `}</style>
    </div>
  );
}

export default AdminPortal;
