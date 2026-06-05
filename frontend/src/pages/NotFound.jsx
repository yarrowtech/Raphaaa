import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-sky-200 to-blue-300 text-gray-800 px-6">
      {/* Content Card */}
      <div className="text-center">
        <img
          src="/404.png"
          alt="Page Not Found"   
          className="w-[600px] mx-auto mb-6 drop-shadow-md"
        />

        <h1 className="text-5xl font-bold text-sky-700 mb-3">Oops!</h1>
        <p className="text-lg text-gray-600 mb-6">
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <Link
          to="/"
          className="inline-block bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
        >
          Go Back Home
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Raphaaa — All Rights Reserved
      </footer>
    </div>
  );
};

export default NotFound;
