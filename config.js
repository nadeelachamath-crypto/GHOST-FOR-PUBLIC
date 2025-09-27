const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from config.env if it exists
const configPath = path.resolve(__dirname, "config.env");
if (fs.existsSync(configPath)) {
  dotenv.config({ path: configPath });
}

function convertToBool(text, fault = "true") {
  return text?.toLowerCase() === fault.toLowerCase();
}

module.exports = {
  SESSION_ID: process.env.SESSION_ID || "4VoixAjR#gigexdNLHxnUoTYvMU-66o0pMs9YIEkoqzaW5zdC3Bw",

  MONGODB:
    process.env.MONGODB ||
    "mongodb://mongo:bsTcmLaCsdNhQXXvIABjeNTcEkSiJuOh@hopper.proxy.rlwy.net:46137",

  OWNER_NUM: (process.env.OWNER_NUM || "94701981053").split(","),

  IS_BOT_PUBLIC: convertToBool(process.env.IS_BOT_PUBLIC || "true"),
  AUTO_STATUS_READ: convertToBool(process.env.AUTO_STATUS_READ || "true"),
  STATUS_REACT: convertToBool(process.env.STATUS_REACT || "true"),

  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY || "AIzaSyD-qmQjGWHH7VWhNaxzvQamtWI8wRaiPno",

  DEEPAI_API_KEY:
    process.env.DEEPAI_API_KEY || "7e0056ab-19dc-46f4-9c49-06456689a60d",

  STABLE_HORDE_API_KEY:
    process.env.STABLE_HORDE_API_KEY || "y-Zqmcw0jvt9mKE3Y1CN3A"
};
