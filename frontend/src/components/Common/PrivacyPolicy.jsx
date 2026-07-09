import React, { useEffect, useState } from "react";
import axios from "axios";

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState({ content: "", updatedAt: "" });

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/settings/policy`);
        if (data) {
          setPolicy(data);
        }
      } catch (error) {
        console.error("Failed to fetch privacy policy", error);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl px-6 md:px-12 py-10">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
          Privacy <span className="text-blue-600">Policy</span>
        </h1>

        {policy.content ? (
          <div
            className="prose prose-gray max-w-none space-y-6 text-gray-700 text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />
        ) : (
          <p className="text-center text-gray-500">Loading privacy policy...</p>
        )}

        {policy.updatedAt && (
          <p className="text-sm text-gray-500 mt-6 text-right">
            Last updated: {new Date(policy.updatedAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
