import React, { useState } from "react";
import Swal from "sweetalert2";
import Navbar from "./navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Slot() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const availableSlots = ["11:30 AM", "12:30 PM", "1:30 PM", "4:30 PM", "5:30 PM", "6:30 PM"];

  const validateIndianPhoneNumber = (number) => {
    const indianPhonePattern = /^(?:\+91|91)?[6789]\d{9}$/;
    return indianPhonePattern.test(number);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!firstName || !lastName || !email || !phone || !selectedTime) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Please fill all fields and select a time slot.",
      });
      return;
    }
  
    if (!validateIndianPhoneNumber(phone)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        text: "Please enter a valid 10-digit Indian phone number.",
      });
      return;
    }
  
    const appointmentData = {
      firstName,
      lastName,
      email,
      phone,
      date: selectedDate.toDateString(),
      timeSlot: selectedTime,
    };
  
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbw49y-hRM5jxXa9hr9h36Uc5GsmNh9cfVDauoP-k6T4bPAEEJkBChNuARL4Ci4sCS7s8g/exec", {
        method: "POST",
        body: JSON.stringify(appointmentData),
        headers: { "Content-Type": "application/json" },
      });
  
      const result = await response.json(); // ✅ Parse JSON response
  
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Appointment Confirmed!",
          text: `Your appointment is scheduled on ${selectedDate.toDateString()} at ${selectedTime}.`,
        }).then(() => {
          setFirstName("");
          setLastName("");
          setEmail("");
          setPhone("");
          setSelectedTime("");
          setSelectedDate(new Date());
        });
      } else {
        throw new Error(result.message || "Unknown error");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to book the appointment. ${error.message}`,
      });
      console.error("Error:", error);
    }
  };
  
  
  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <div className="card p-4 shadow">
          <h3 className="text-primary mb-4">Slot Confirmation</h3>

          <form onSubmit={handleSubmit}>
            <label className="form-label">Name</label>
            <div className="row">
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                 
                />
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
             
              />
            </div>

            <div className="mb-3">
              <label htmlFor="phone" className="form-label">
                Phone Number (India)
              </label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                name="phone"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              
              />
            </div>

            {/* Date Picker */}
            <div className="mb-3">
              <label className="form-label">Select Date</label>
              <div className="input-group">
                {/* SVG Calendar Icon */}
                <span className="input-group-text">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-calendar-week"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                  </svg>
                </span>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  minDate={new Date()}
                  className="form-control"
                 
                />
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="mb-3">
              <label className="form-label">Select Time Slot</label>
              <div className="row">
                {availableSlots.map((time, index) => (
                  <div key={index} className="col-6 mb-2">
                    <button
                      type="button"
                      className={`btn w-100 ${
                        selectedTime === time ? "btn-primary" : "btn-outline-primary"
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 mt-3">
              Confirm Appointment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}



