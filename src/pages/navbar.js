import React, { useState, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
 
  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
      <a className="navbar-brand d-flex align-items-center" href="#">
      <img
        src="assets/assets/img/another-broucher-logo-removebg-preview.png"
        alt="Logo"
        style={{ width: "80px", height: "80px", marginRight: "10px",marginTop:"10px" }}
      />
    </a>
        <button
      className="navbar-toggler"
      type="button"
      data-toggle="collapse"
      onClick={toggleNavbar}
      aria-controls="navbarSupportedContent"
      aria-expanded={isOpen ? "true" : "false"}
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    <div className={`collapse navbar-collapse ${isOpen ? "show" : ""}`} id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link active" aria-current="page" href="#">
                Home
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#">Link</a>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Dropdown
              </a>
              <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                <li>
                  <a className="dropdown-item" href="#">Action</a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">Another action</a>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a className="dropdown-item" href="#">Something else here</a>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <a className="nav-link disabled" href="#">Disabled</a>
            </li>
          </ul>
          <form className="d-flex">
            <input
              className="form-control me-2"
              type="search"
              placeholder="Search"
              aria-label="Search"
            />
            <button className="btn btn-outline-success" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}