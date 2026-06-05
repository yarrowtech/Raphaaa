import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader"; // ⬅️ new header import

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const SIDEBAR_WIDTH = 256; // w-64
  const HEADER_HEIGHT = 64; // 64px

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen overflow-hidden relative">
      {/* mobile toggle button */}
      <div className="fixed top-0 left-0 right-0 flex md:hidden p-4 bg-gray-900 text-white z-50">
        <button onClick={toggleSidebar}>
          <FaBars size={24} />
        </button>
        <h1 className="ml-4 text-xl font-md">Admin Dashboard</h1>
      </div>

      {/* overlayer for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* sidebar */}
      <div
        className={`bg-gray-900 w-64 h-screen text-white fixed top-0 left-0 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 md:translate-x-0 md:block z-40`}
      >
        {/* sidebar component */}
        <AdminSidebar />
      </div>

      {/* main shell */}
      <div className="h-screen md:pl-64">
        {/* fixed header */}
        <div
          className="fixed top-0 right-0 left-0 md:left-64 z-30"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <AdminHeader />
        </div>

        {/* scrollable content only */}
        <div
          data-scroll-container
          className="h-full overflow-y-auto"
          style={{
            paddingTop: `${HEADER_HEIGHT + 24}px`,
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingBottom: "24px",
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
