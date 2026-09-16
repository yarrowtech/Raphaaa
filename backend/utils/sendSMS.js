const axios = require("axios");

// Sends the OTP via WhatsApp using AiSensy's Campaign API.
// Requires an approved AUTHENTICATION-category template (see AISENSY_CAMPAIGN_NAME)
// whose single {{1}} variable is the OTP code, with a "Copy Code" button.
const sendSMS = async (mobile, otp) => {
  const digits = String(mobile).replace(/\D/g, "");
  const countryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91";
  const destination = digits.length === 10 ? `${countryCode}${digits}` : digits;

  try {
    await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: process.env.AISENSY_CAMPAIGN_NAME,
        destination,
        userName: "Raphaaa",
        templateParams: [otp],
        // Copy Code button needs the same OTP value as its parameter.
        buttons: [
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AiSensy WhatsApp OTP send failed:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendSMS;
