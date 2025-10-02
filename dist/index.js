var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/resumeParser.ts
var resumeParser_exports = {};
__export(resumeParser_exports, {
  extractTextFromFile: () => extractTextFromFile,
  parseResumeWithAI: () => parseResumeWithAI
});
import "dotenv/config";
import OpenAI from "openai";
async function parseResumeWithAI(resumeText) {
  try {
    const prompt = `
Analyze the following resume text and extract structured information. Please respond with a JSON object containing the following fields:

{
  "name": "Full name of the candidate",
  "email": "Email address if found",
  "phone": "Phone number if found",
  "location": "City/location if found",
  "summary": "Brief professional summary or objective",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title/position",
      "duration": "Employment period",
      "description": "Brief job description"
    }
  ],
  "education": [
    {
      "institution": "Educational institution",
      "degree": "Degree/qualification",
      "year": "Graduation year or period"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "languages": ["language1", "language2"]
}

Resume text to analyze:
${resumeText}

Please extract the information accurately and format it as valid JSON. If any field is not found, use null or empty array as appropriate.
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specialized in parsing and extracting structured data from resumes. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });
    const parsedData = JSON.parse(response.choices[0].message.content || "{}");
    return {
      name: parsedData.name || null,
      email: parsedData.email || null,
      phone: parsedData.phone || null,
      location: parsedData.location || null,
      summary: parsedData.summary || null,
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      languages: Array.isArray(parsedData.languages) ? parsedData.languages : []
    };
  } catch (error) {
    console.error("Error parsing resume with AI:", error);
    throw new Error("Failed to parse resume with AI");
  }
}
async function extractTextFromFile(filePath) {
  try {
    const fs3 = await import("fs");
    const path4 = await import("path");
    const fileExtension = path4.extname(filePath).toLowerCase();
    if (fileExtension === ".txt") {
      return fs3.readFileSync(filePath, "utf-8");
    }
    return `Resume file uploaded: ${path4.basename(filePath)}. Text extraction for ${fileExtension} files is not yet implemented.`;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw new Error("Failed to extract text from resume file");
  }
}
var openai;
var init_resumeParser = __esm({
  "server/services/resumeParser.ts"() {
    "use strict";
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
});

// server/telegramBot.ts
var telegramBot_exports = {};
__export(telegramBot_exports, {
  default: () => telegramBot_default,
  sendInterviewNotification: () => sendInterviewNotification,
  sendRescheduleNotification: () => sendRescheduleNotification
});
import axios from "axios";
import FormData from "form-data";
import TelegramBot from "node-telegram-bot-api";
var BOT_TOKEN, API_BASE_URL, bot, translations, userSessions, getText, createKeyboard, createInlineKeyboard, getActiveVacancies, createCandidate, getCandidateByTelegramId, updateCandidate, sendInterviewNotification, sendRescheduleNotification, telegramBot_default;
var init_telegramBot = __esm({
  "server/telegramBot.ts"() {
    "use strict";
    BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
    API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    translations = {
      ru: {
        welcome: "\u{1F44B} \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 SynergyHire!\n\n\u0414\u043B\u044F \u043F\u043E\u0434\u0430\u0447\u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u043D\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A:",
        language_selected: "\u2705 \u042F\u0437\u044B\u043A \u0432\u044B\u0431\u0440\u0430\u043D: \u0420\u0443\u0441\u0441\u043A\u0438\u0439",
        start_application: "\u{1F4DD} \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0430\u043D\u043A\u0435\u0442\u044B \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430",
        edit_application: "\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u0438 \u0437\u0430\u043D\u043E\u0432\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
        get_amare_location: "\u{1F4CD} \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u0446\u0438\u044E Amare",
        get_synergy_location: "\u{1F4CD} \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u0446\u0438\u044E Synergy",
        full_name: "\u{1F464} \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448\u0435 \u043F\u043E\u043B\u043D\u043E\u0435 \u0438\u043C\u044F (\u0424\u0430\u043C\u0438\u043B\u0438\u044F \u0418\u043C\u044F \u041E\u0442\u0447\u0435\u0441\u0442\u0432\u043E):",
        phone: "\u{1F4F1} \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430:",
        city: "\u{1F3D9}\uFE0F \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u0433\u043E\u0440\u043E\u0434 \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F:",
        select_vacancy: "\u{1F4BC} \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u0434\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443:",
        send_resume: "\u{1F4C4} \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0444\u0430\u0439\u043B\u043E\u043C (PDF, DOC, DOCX):",
        confirm_data: "\u2705 \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0432\u0435\u0434\u0435\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435:",
        submit_application: "\u{1F4E4} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443",
        edit_data: "\u270F\uFE0F \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435",
        application_submitted: "\u{1F389} \u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430!\n\n\u0412\u0430\u0448\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u044B HR-\u043E\u0442\u0434\u0435\u043B\u0443. \u041E\u0436\u0438\u0434\u0430\u0439\u0442\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0438.",
        application_updated: "\u2705 \u0412\u0430\u0448\u0430 \u0437\u0430\u044F\u0432\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430!",
        amare_location_sent: "\u{1F4CD} \u041B\u043E\u043A\u0430\u0446\u0438\u044F Amare \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430!",
        synergy_location_sent: "\u{1F4CD} \u041B\u043E\u043A\u0430\u0446\u0438\u044F Synergy \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430!",
        choose_action: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435:",
        post_submission_menu: "\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0432\u043E\u044E \u0437\u0430\u044F\u0432\u043A\u0443 \u0438\u043B\u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u043E \u043B\u043E\u043A\u0430\u0446\u0438\u044F\u0445:",
        interview_scheduled: "\u{1F4C5} \u0412\u0430\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043E \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435!\n\n\u{1F4CD} \u0414\u0430\u0442\u0430: {date}\n\u{1F550} \u0412\u0440\u0435\u043C\u044F: {time}\n\u{1F465} \u0418\u043D\u0442\u0435\u0440\u0432\u044C\u044E\u0435\u0440: {interviewer}\n\n\u0416\u0435\u043B\u0430\u0435\u043C \u0443\u0434\u0430\u0447\u0438!",
        interview_rescheduled: "\u{1F4C5} \u0412\u0430\u0448\u0435 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E!\n\n\u{1F504} \u042D\u0442\u0430\u043F: {stageName}\n\u{1F465} \u0418\u043D\u0442\u0435\u0440\u0432\u044C\u044E\u0435\u0440: {interviewer}\n\n\u274C \u0411\u044B\u043B\u043E:\n\u{1F4CD} {oldDate} \u0432 {oldTime}\n\n\u2705 \u041D\u043E\u0432\u043E\u0435 \u0432\u0440\u0435\u043C\u044F:\n\u{1F4CD} {newDate} \u0432 {newTime}\n\n\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0431\u0443\u0434\u044C\u0442\u0435 \u0432\u043E\u0432\u0440\u0435\u043C\u044F!",
        error: "\u274C \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.",
        invalid_format: "\u274C \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.",
        no_vacancies: "\u274C \u041A \u0441\u043E\u0436\u0430\u043B\u0435\u043D\u0438\u044E, \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.",
        cancel: "\u274C \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
        back: "\u2B05\uFE0F \u041D\u0430\u0437\u0430\u0434"
      },
      uz: {
        welcome: "\u{1F44B} SynergyHire-ga xush kelibsiz!\n\nVakansiyaga ariza berish uchun tilni tanlang:",
        language_selected: "\u2705 Til tanlandi: O'zbek",
        start_application: "\u{1F4DD} Nomzod anketasini to'ldirshni boshlang",
        edit_application: "\u270F\uFE0F Arizani tahrirlash va qayta yuborish",
        get_amare_location: "\u{1F4CD} Amare lokatsiyasini olish",
        get_synergy_location: "\u{1F4CD} Synergy lokatsiyasini olish",
        full_name: "\u{1F464} Iltimos, to'liq ismingizni kiriting (Familiya Ism Otasining ismi):",
        phone: "\u{1F4F1} Telefon raqamingizni kiriting:",
        city: "\u{1F3D9}\uFE0F Yashash shaharingizni kiriting:",
        select_vacancy: "\u{1F4BC} Ariza bermoqchi bo'lgan vakansiyangizni tanlang:",
        send_resume: "\u{1F4C4} Rezyumengizni fayl ko'rinishida yuboring (PDF, DOC, DOCX):",
        confirm_data: "\u2705 Kiritilgan ma'lumotlarni tekshiring:",
        submit_application: "\u{1F4E4} Ariza yuborish",
        edit_data: "\u270F\uFE0F Ma'lumotlarni o'zgartirish",
        application_submitted: "\u{1F389} Ariza muvaffaqiyatli yuborildi!\n\nMa'lumotlaringiz HR bo'limiga uzatildi. Suhbat haqida xabar kutib turing.",
        application_updated: "\u2705 Arizangiz muvaffaqiyatli yangilandi!",
        amare_location_sent: "\u{1F4CD} Amare lokatsiyasi yuborildi!",
        synergy_location_sent: "\u{1F4CD} Synergy lokatsiyasi yuborildi!",
        choose_action: "Amalni tanlang:",
        post_submission_menu: "Siz arizangizni tahrirlashingiz yoki lokatsiya ma'lumotlarini olishingiz mumkin:",
        interview_scheduled: "\u{1F4C5} Sizga suhbat belgilandi!\n\n\u{1F4CD} Sana: {date}\n\u{1F550} Vaqt: {time}\n\u{1F465} Suhbat o'tkazuvchi: {interviewer}\n\nOmad tilaymiz!",
        interview_rescheduled: "\u{1F4C5} Sizning suhbatingiz ko'chirildi!\n\n\u{1F504} Bosqich: {stageName}\n\u{1F465} Suhbat o'tkazuvchi: {interviewer}\n\n\u274C Eski vaqt:\n\u{1F4CD} {oldDate} {oldTime}\n\n\u2705 Yangi vaqt:\n\u{1F4CD} {newDate} {newTime}\n\nIltimos, o'z vaqtida keling!",
        error: "\u274C Xatolik yuz berdi. Qayta urinib ko'ring.",
        invalid_format: "\u274C Noto'g'ri format. Qayta urinib ko'ring.",
        no_vacancies: "\u274C Afsuski, hozirda mavjud vakansiyalar yo'q.",
        cancel: "\u274C Bekor qilish",
        back: "\u2B05\uFE0F Orqaga"
      }
    };
    userSessions = /* @__PURE__ */ new Map();
    getText = (lang, key, params) => {
      let text2 = translations[lang]?.[key] || translations.ru[key];
      if (params) {
        Object.keys(params).forEach((param) => {
          text2 = text2.replace(`{${param}}`, params[param]);
        });
      }
      return text2;
    };
    createKeyboard = (buttons, lang) => {
      return {
        reply_markup: {
          keyboard: buttons,
          resize_keyboard: true,
          one_time_keyboard: true
        }
      };
    };
    createInlineKeyboard = (buttons) => {
      return {
        reply_markup: {
          inline_keyboard: buttons
        }
      };
    };
    getActiveVacancies = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/bot/vacancies`, {
          headers: {
            "X-Bot-Token": BOT_TOKEN
          }
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching vacancies:", error);
        return [];
      }
    };
    createCandidate = async (candidateData) => {
      try {
        console.log("Bot - createCandidate called with:", candidateData);
        const formData = new FormData();
        Object.keys(candidateData).forEach((key) => {
          if (key === "resume" && candidateData[key]) {
            console.log("Bot - Adding resume file:", candidateData[key].originalname);
            formData.append("files", candidateData[key].buffer, {
              filename: candidateData[key].originalname,
              contentType: candidateData[key].mimetype
            });
          } else if (key !== "resume") {
            console.log(`Bot - Adding field ${key}:`, candidateData[key]);
            formData.append(key, candidateData[key]);
          }
        });
        console.log("Bot - Making request to:", `${API_BASE_URL}/api/bot/candidates`);
        console.log("Bot - With token:", BOT_TOKEN ? "TOKEN_SET" : "TOKEN_MISSING");
        const response = await axios.post(`${API_BASE_URL}/api/bot/candidates`, formData, {
          headers: {
            ...formData.getHeaders(),
            // This gets proper content-type with boundary
            "X-Bot-Token": BOT_TOKEN
          }
        });
        console.log("Bot - Response status:", response.status);
        console.log("Bot - Response data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Bot - Error creating candidate:");
        console.error("Bot - Error message:", error.message);
        console.error("Bot - Error response:", error.response?.data);
        console.error("Bot - Error status:", error.response?.status);
        console.error("Bot - Full error:", error);
        throw error;
      }
    };
    getCandidateByTelegramId = async (telegramChatId) => {
      try {
        console.log(`Bot - Fetching candidate for telegram chat ID: ${telegramChatId}`);
        const response = await axios.get(`${API_BASE_URL}/api/bot/candidates/telegram/${telegramChatId}`, {
          headers: {
            "X-Bot-Token": BOT_TOKEN
          },
          timeout: 1e4
          // 10 second timeout
        });
        console.log(`Bot - Successfully fetched candidate data for chat ID: ${telegramChatId}`);
        if (response.data && response.data.candidate) {
          return response.data.candidate;
        } else if (response.data && response.data.id) {
          return response.data;
        } else {
          console.log(`Bot - Unexpected response format for chat ID ${telegramChatId}:`, response.data);
          return null;
        }
      } catch (error) {
        console.error(`Bot - Error fetching candidate by telegram ID ${telegramChatId}:`, error.message);
        if (error.response) {
          console.error("Bot - Error response status:", error.response.status);
          console.error("Bot - Error response data:", error.response.data);
          switch (error.response.status) {
            case 404:
              console.log(`Bot - Candidate not found for chat ID: ${telegramChatId}`);
              return null;
            case 401:
              console.error("Bot - Authentication error: Invalid bot token");
              return null;
            case 403:
              console.error("Bot - Authorization error: Access denied");
              return null;
            case 503:
              console.error("Bot - Service unavailable: Database connection issue");
              return null;
            case 504:
              console.error("Bot - Gateway timeout: Request took too long");
              return null;
            case 500:
            default:
              console.error("Bot - Server error: Internal server error");
              return null;
          }
        } else if (error.code === "ECONNREFUSED") {
          console.error("Bot - Connection refused: Server is not running");
          return null;
        } else if (error.code === "ETIMEDOUT") {
          console.error("Bot - Request timeout: Server did not respond in time");
          return null;
        } else if (error.code === "ENOTFOUND") {
          console.error("Bot - Host not found: Invalid API_BASE_URL");
          return null;
        } else {
          console.error("Bot - Network error:", error.code, error.message);
          return null;
        }
      }
    };
    updateCandidate = async (candidateId, candidateData) => {
      try {
        console.log("Bot - updateCandidate called with:", { candidateId, candidateData });
        const formData = new FormData();
        Object.keys(candidateData).forEach((key) => {
          if (key === "resume" && candidateData[key]) {
            console.log("Bot - Adding resume file:", candidateData[key].originalname);
            formData.append("files", candidateData[key].buffer, {
              filename: candidateData[key].originalname,
              contentType: candidateData[key].mimetype
            });
          } else if (key !== "resume") {
            console.log(`Bot - Adding field ${key}:`, candidateData[key]);
            formData.append(key, candidateData[key]);
          }
        });
        console.log("Bot - Making update request to:", `${API_BASE_URL}/api/bot/candidates/${candidateId}`);
        const response = await axios.put(`${API_BASE_URL}/api/bot/candidates/${candidateId}`, formData, {
          headers: {
            ...formData.getHeaders(),
            "X-Bot-Token": BOT_TOKEN
          }
        });
        console.log("Bot - Update response status:", response.status);
        console.log("Bot - Update response data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Bot - Error updating candidate:");
        console.error("Bot - Error message:", error.message);
        console.error("Bot - Error response:", error.response?.data);
        console.error("Bot - Error status:", error.response?.status);
        throw error;
      }
    };
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeKeyboard = createInlineKeyboard([
        [
          { text: "\u{1F1F7}\u{1F1FA} \u0420\u0443\u0441\u0441\u043A\u0438\u0439", callback_data: "lang_ru" },
          { text: "\u{1F1FA}\u{1F1FF} O'zbek", callback_data: "lang_uz" }
        ]
      ]);
      bot.sendMessage(chatId, translations.ru.welcome, welcomeKeyboard);
    });
    bot.on("callback_query", async (query) => {
      try {
        const chatId = query.message?.chat.id;
        const messageId = query.message?.message_id;
        const data = query.data;
        if (!chatId) return;
        if (data?.startsWith("lang_")) {
          const lang = data.split("_")[1];
          userSessions.set(chatId, {
            language: lang,
            step: "start",
            data: {}
          });
          bot.editMessageText(getText(lang, "language_selected"), {
            chat_id: chatId,
            message_id: messageId
          });
          setTimeout(async () => {
            try {
              const existingCandidate = await getCandidateByTelegramId(chatId);
              let startKeyboard;
              if (existingCandidate) {
                startKeyboard = createKeyboard([
                  [getText(lang, "edit_application")],
                  [getText(lang, "get_amare_location")],
                  [getText(lang, "get_synergy_location")]
                ], lang);
              } else {
                startKeyboard = createKeyboard([
                  [getText(lang, "start_application")],
                  [getText(lang, "get_amare_location")],
                  [getText(lang, "get_synergy_location")]
                ], lang);
              }
              bot.sendMessage(chatId, getText(lang, "start_application"), startKeyboard);
            } catch (error) {
              console.error("Error in callback query handler:", error);
              const fallbackKeyboard = createKeyboard([
                [getText(lang, "start_application")],
                [getText(lang, "get_amare_location")],
                [getText(lang, "get_synergy_location")]
              ], lang);
              bot.sendMessage(chatId, getText(lang, "start_application"), fallbackKeyboard);
            }
          }, 1e3);
        }
        if (data?.startsWith("vacancy_")) {
          const session2 = userSessions.get(chatId);
          if (!session2) return;
          const vacancyId = data.split("_")[1];
          session2.data.vacancyId = parseInt(vacancyId);
          session2.step = "resume";
          userSessions.set(chatId, session2);
          bot.sendMessage(chatId, getText(session2.language, "send_resume"));
        }
        bot.answerCallbackQuery(query.id);
      } catch (error) {
        console.error("Unhandled error in callback query handler:", error);
        try {
          bot.answerCallbackQuery(query.id);
        } catch (e) {
          console.error("Error answering callback query:", e);
        }
      }
    });
    bot.on("message", async (msg) => {
      try {
        const chatId = msg.chat.id;
        const text2 = msg.text;
        const session2 = userSessions.get(chatId);
        if (!session2 || !text2) return;
        const lang = session2.language;
        switch (session2.step) {
          case "start":
            if (text2 === getText(lang, "start_application") || text2 === getText(lang, "edit_application")) {
              if (text2 === getText(lang, "edit_application")) {
                try {
                  const existingCandidate = await getCandidateByTelegramId(chatId);
                  if (existingCandidate) {
                    console.log("Found existing candidate with status:", existingCandidate.status);
                    session2.data = {
                      candidateId: existingCandidate.id,
                      fullName: existingCandidate.fullName,
                      phone: existingCandidate.phone,
                      city: existingCandidate.city,
                      vacancyId: existingCandidate.vacancyId
                    };
                    session2.isEditing = true;
                    let statusMessage = getText(lang, "editing_application");
                    if (existingCandidate.status === "hired") {
                      statusMessage = getText(lang, "editing_hired_application");
                    } else if (existingCandidate.status === "dismissed") {
                      statusMessage = getText(lang, "editing_dismissed_application");
                    } else if (existingCandidate.status === "rejected") {
                      statusMessage = getText(lang, "editing_rejected_application");
                    }
                    bot.sendMessage(chatId, statusMessage);
                  } else {
                    console.log("No existing candidate found, starting new application flow");
                    bot.sendMessage(chatId, getText(lang, "no_previous_application"));
                  }
                } catch (error) {
                  console.error("Error fetching existing candidate:", error);
                  console.log("Continuing with new application flow due to error");
                  bot.sendMessage(chatId, getText(lang, "error_fetching_application"));
                }
              }
              session2.step = "fullName";
              userSessions.set(chatId, session2);
              bot.sendMessage(chatId, getText(lang, "full_name"));
            } else if (text2 === getText(lang, "get_amare_location")) {
              bot.sendLocation(chatId, 41.284044, 69.244047);
              bot.sendMessage(chatId, getText(lang, "amare_location_sent"));
            } else if (text2 === getText(lang, "get_synergy_location")) {
              bot.sendLocation(chatId, 41.284604, 69.244055);
              bot.sendMessage(chatId, getText(lang, "synergy_location_sent"));
            }
            break;
          case "fullName":
            if (text2.trim().length < 3) {
              bot.sendMessage(chatId, getText(lang, "invalid_format"));
              return;
            }
            session2.data.fullName = text2.trim();
            session2.step = "phone";
            userSessions.set(chatId, session2);
            bot.sendMessage(chatId, getText(lang, "phone"));
            break;
          case "phone":
            const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
            if (!phoneRegex.test(text2)) {
              bot.sendMessage(chatId, getText(lang, "invalid_format"));
              return;
            }
            session2.data.phone = text2.trim();
            session2.step = "city";
            userSessions.set(chatId, session2);
            bot.sendMessage(chatId, getText(lang, "city"));
            break;
          case "city":
            if (text2.trim().length < 2) {
              bot.sendMessage(chatId, getText(lang, "invalid_format"));
              return;
            }
            session2.data.city = text2.trim();
            session2.step = "vacancy";
            userSessions.set(chatId, session2);
            const vacancies2 = await getActiveVacancies();
            if (vacancies2.length === 0) {
              bot.sendMessage(chatId, getText(lang, "no_vacancies"));
              return;
            }
            const vacancyButtons = vacancies2.map((vacancy) => [
              { text: vacancy.title, callback_data: `vacancy_${vacancy.id}` }
            ]);
            const vacancyKeyboard = createInlineKeyboard(vacancyButtons);
            bot.sendMessage(chatId, getText(lang, "select_vacancy"), vacancyKeyboard);
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });
    bot.on("document", async (msg) => {
      const chatId = msg.chat.id;
      const session2 = userSessions.get(chatId);
      if (!session2 || session2.step !== "resume") return;
      const document = msg.document;
      const lang = session2.language;
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedTypes.includes(document.mime_type || "")) {
        bot.sendMessage(chatId, getText(lang, "invalid_format"));
        return;
      }
      try {
        const fileId = document.file_id;
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        if (filePath) {
          const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
          const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
          session2.data.resume = {
            buffer: response.data,
            originalname: document.file_name || "resume.pdf",
            mimetype: document.mime_type
          };
          session2.step = "confirm";
          userSessions.set(chatId, session2);
          const confirmText = `${getText(lang, "confirm_data")}

\u{1F464} ${session2.data.fullName}
\u{1F4F1} ${session2.data.phone}
\u{1F3D9}\uFE0F ${session2.data.city}
\u{1F4C4} ${document.file_name}`;
          const confirmKeyboard = createInlineKeyboard([
            [
              { text: getText(lang, "submit_application"), callback_data: "submit" },
              { text: getText(lang, "edit_data"), callback_data: "edit" }
            ]
          ]);
          bot.sendMessage(chatId, confirmText, confirmKeyboard);
        }
      } catch (error) {
        console.error("Error processing resume:", error);
        bot.sendMessage(chatId, getText(lang, "error"));
      }
    });
    bot.on("callback_query", async (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      if (!chatId || !data) return;
      const session2 = userSessions.get(chatId);
      if (!session2) return;
      const lang = session2.language;
      if (data === "submit") {
        try {
          const candidateData = {
            fullName: session2.data.fullName,
            email: "",
            // Will be empty from Telegram
            phone: session2.data.phone,
            city: session2.data.city,
            vacancyId: session2.data.vacancyId,
            source: "\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u043C",
            telegramChatId: chatId,
            // Store chat ID for notifications
            resume: session2.data.resume
          };
          if (session2.isEditing && session2.data.candidateId) {
            await updateCandidate(session2.data.candidateId, candidateData);
            bot.sendMessage(chatId, getText(lang, "application_updated"));
          } else {
            const result = await createCandidate(candidateData);
            bot.sendMessage(chatId, getText(lang, "application_submitted"));
          }
          const postSubmissionKeyboard = createKeyboard([
            [getText(lang, "edit_application")],
            [getText(lang, "get_amare_location")],
            [getText(lang, "get_synergy_location")]
          ], lang);
          setTimeout(() => {
            bot.sendMessage(chatId, getText(lang, "post_submission_menu"), postSubmissionKeyboard);
          }, 1500);
          userSessions.set(chatId, {
            language: lang,
            step: "start",
            data: {}
          });
        } catch (error) {
          console.error("Error submitting application:", error);
          bot.sendMessage(chatId, getText(lang, "error"));
        }
      }
      if (data === "edit") {
        session2.step = "start";
        session2.data = {};
        session2.isEditing = false;
        userSessions.set(chatId, session2);
        const editKeyboard = createKeyboard([
          [getText(lang, "start_application")],
          [getText(lang, "get_amare_location")],
          [getText(lang, "get_synergy_location")]
        ], lang);
        bot.sendMessage(chatId, getText(lang, "choose_action"), editKeyboard);
      }
      bot.answerCallbackQuery(query.id);
    });
    sendInterviewNotification = async (chatId, interviewData, language = "ru") => {
      try {
        const message = getText(language, "interview_scheduled", {
          date: new Date(interviewData.scheduledAt).toLocaleDateString("ru-RU"),
          time: new Date(interviewData.scheduledAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          interviewer: interviewData.interviewer || "HR \u043E\u0442\u0434\u0435\u043B"
        });
        await bot.sendMessage(chatId, message);
      } catch (error) {
        console.error("Error sending interview notification:", error);
      }
    };
    sendRescheduleNotification = async (chatId, rescheduleData, language = "ru") => {
      try {
        const oldDate = new Date(rescheduleData.oldDateTime);
        const newDate = new Date(rescheduleData.newDateTime);
        const message = getText(language, "interview_rescheduled", {
          stageName: rescheduleData.stageName || "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
          oldDate: oldDate.toLocaleDateString("ru-RU"),
          oldTime: oldDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          newDate: newDate.toLocaleDateString("ru-RU"),
          newTime: newDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          interviewer: rescheduleData.interviewer || "HR \u043E\u0442\u0434\u0435\u043B"
        });
        await bot.sendMessage(chatId, message);
        console.log("Reschedule notification sent successfully to:", chatId);
      } catch (error) {
        console.error("Error sending reschedule notification:", error);
      }
    };
    bot.on("error", (error) => {
      console.error("Telegram bot error:", error);
    });
    bot.on("polling_error", (error) => {
      console.error("Telegram bot polling error:", error);
    });
    console.log("\u{1F916} Telegram bot started successfully!");
    telegramBot_default = bot;
  }
});

// server/index.ts
import "dotenv/config";
import express3 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import session from "express-session";
import multer from "multer";
import fs from "fs";
import path from "path";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  auditLogsRelations: () => auditLogsRelations,
  candidates: () => candidates,
  candidatesRelations: () => candidatesRelations,
  departments: () => departments,
  departmentsRelations: () => departmentsRelations,
  documentationAttachments: () => documentationAttachments,
  documentationAttachmentsRelations: () => documentationAttachmentsRelations,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertCandidateSchema: () => insertCandidateSchema,
  insertDepartmentSchema: () => insertDepartmentSchema,
  insertDocumentationAttachmentSchema: () => insertDocumentationAttachmentSchema,
  insertInterviewSchema: () => insertInterviewSchema,
  insertInterviewStageSchema: () => insertInterviewStageSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertSystemSettingSchema: () => insertSystemSettingSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserSchemaForAPI: () => insertUserSchemaForAPI,
  insertVacancySchema: () => insertVacancySchema,
  interviewStages: () => interviewStages,
  interviewStagesRelations: () => interviewStagesRelations,
  interviews: () => interviews,
  interviewsRelations: () => interviewsRelations,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  systemSettings: () => systemSettings,
  users: () => users,
  usersRelations: () => usersRelations,
  vacancies: () => vacancies,
  vacanciesRelations: () => vacanciesRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  plainPassword: text("plain_password"),
  // Store plain text password for admin viewing
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: timestamp("date_of_birth"),
  position: varchar("position", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("employee"),
  // employee, hr_manager, admin
  hasReportAccess: boolean("has_report_access").default(false),
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var vacancies = pgTable("vacancies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  // Keeping for backward compatibility
  departmentId: integer("department_id"),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  requirements: text("requirements"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  // active, closed
  createdBy: integer("created_by"),
  hiredCandidateId: integer("hired_candidate_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 255 }),
  vacancyId: integer("vacancy_id"),
  resumeUrl: text("resume_url"),
  resumeFilename: varchar("resume_filename", { length: 255 }),
  photoUrl: text("photo_url"),
  // Optional photo file path
  source: varchar("source", { length: 100 }),
  telegramChatId: bigint("telegram_chat_id", { mode: "number" }),
  // Telegram chat ID for notifications
  interviewStageChain: jsonb("interview_stage_chain"),
  // New field for stage chain
  currentStageIndex: integer("current_stage_index").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  // active, documentation, hired, rejected, archived, dismissed
  rejectionReason: text("rejection_reason"),
  rejectionStage: integer("rejection_stage"),
  dismissalReason: text("dismissal_reason"),
  dismissalDate: timestamp("dismissal_date"),
  parsedResumeData: jsonb("parsed_resume_data"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var interviewStages = pgTable("interview_stages", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id),
  stageIndex: integer("stage_index").notNull(),
  stageName: varchar("stage_name", { length: 255 }).notNull(),
  interviewerId: integer("interviewer_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default("pending"),
  // pending, in_progress, passed, failed
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  comments: text("comments"),
  rating: integer("rating"),
  // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").references(() => interviewStages.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  interviewerId: integer("interviewer_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30),
  // minutes
  status: varchar("status", { length: 50 }).default("scheduled"),
  // scheduled, completed, cancelled, rescheduled
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  outcome: varchar("outcome", { length: 50 }),
  // passed, failed, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  // interview_assigned, reminder, status_update
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  // candidate, interview, vacancy
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").defaultNow()
});
var departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var documentationAttachments = pgTable("documentation_attachments", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  createdVacancies: many(vacancies),
  interviewStages: many(interviewStages),
  interviews: many(interviews),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" })
}));
var departmentsRelations = relations(departments, ({ many }) => ({
  vacancies: many(vacancies)
}));
var vacanciesRelations = relations(vacancies, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [vacancies.createdBy],
    references: [users.id]
  }),
  hiredCandidate: one(candidates, {
    fields: [vacancies.hiredCandidateId],
    references: [candidates.id]
  }),
  department: one(departments, {
    fields: [vacancies.departmentId],
    references: [departments.id]
  }),
  candidates: many(candidates)
}));
var candidatesRelations = relations(candidates, ({ one, many }) => ({
  vacancy: one(vacancies, {
    fields: [candidates.vacancyId],
    references: [vacancies.id]
  }),
  createdBy: one(users, {
    fields: [candidates.createdBy],
    references: [users.id]
  }),
  interviewStages: many(interviewStages),
  interviews: many(interviews),
  documentationAttachments: many(documentationAttachments)
}));
var interviewStagesRelations = relations(interviewStages, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [interviewStages.candidateId],
    references: [candidates.id]
  }),
  interviewer: one(users, {
    fields: [interviewStages.interviewerId],
    references: [users.id]
  }),
  interviews: many(interviews)
}));
var interviewsRelations = relations(interviews, ({ one }) => ({
  stage: one(interviewStages, {
    fields: [interviews.stageId],
    references: [interviewStages.id]
  }),
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id]
  }),
  interviewer: one(users, {
    fields: [interviews.interviewerId],
    references: [users.id]
  })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));
var messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  })
}));
var documentationAttachmentsRelations = relations(documentationAttachments, ({ one }) => ({
  candidate: one(candidates, {
    fields: [documentationAttachments.candidateId],
    references: [candidates.id]
  }),
  uploadedBy: one(users, {
    fields: [documentationAttachments.uploadedBy],
    references: [users.id]
  })
}));
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));
var insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).optional().nullable(),
  position: z.string().optional(),
  role: z.enum(["admin", "hr_manager", "employee"]).default("employee"),
  hasReportAccess: z.boolean().default(false),
  isActive: z.boolean().default(true)
});
var insertUserSchemaForAPI = insertUserSchema.omit({ password: true });
var insertVacancySchema = createInsertSchema(vacancies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  email: true,
  // Email is optional for Telegram candidates
  resumeUrl: true,
  resumeFilename: true,
  photoUrl: true,
  // Optional photo URL
  parsedResumeData: true,
  currentStageIndex: true,
  status: true,
  rejectionReason: true,
  rejectionStage: true,
  phone: true,
  city: true,
  source: true,
  interviewStageChain: true,
  telegramChatId: true,
  // Optional Telegram chat ID
  createdBy: true
  // Optional for bot-created candidates
});
var insertInterviewStageSchema = createInsertSchema(interviewStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  status: true,
  scheduledAt: true,
  completedAt: true,
  comments: true,
  rating: true
});
var insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  outcome: true,
  notes: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});
var insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  isRead: true
});
var insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDocumentationAttachmentSchema = createInsertSchema(documentationAttachments).omit({
  id: true,
  createdAt: true
}).partial({
  uploadedBy: true,
  fileType: true,
  fileSize: true
});

// server/db.ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  console.warn(
    "\u26A0\uFE0F  DATABASE_URL \u043D\u0435 \u0437\u0430\u0434\u0430\u043D. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u0436\u0438\u043C \u0431\u0435\u0437 \u0411\u0414 (\u0437\u0430\u0433\u043B\u0443\u0448\u043A\u0430). \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0432 .env \u0434\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B."
  );
  console.log("\u{1F4D6} \u041F\u0440\u0438\u043C\u0435\u0440 DATABASE_URL: postgresql://postgres:password@localhost:5432/recruit_pro");
}
var pool = null;
var db = {};
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 20,
      // maximum number of clients in the pool
      idleTimeoutMillis: 3e4,
      // close idle clients after 30 seconds
      connectionTimeoutMillis: 2e3
      // return an error after 2 seconds if connection could not be established
    });
    db = drizzle(pool, { schema: schema_exports });
    pool.on("connect", () => {
      console.log("\u{1F517} New database connection established");
    });
    pool.on("error", (err) => {
      console.error("\u{1F4A5} Unexpected database error:", err);
    });
  } catch (error) {
    console.error("\u274C Failed to initialize database connection:", error);
    console.warn("\u26A0\uFE0F  Falling back to database-less mode");
    pool = null;
    db = {};
  }
} else {
  console.log("\u{1F4DD} Running in database-less mode for development");
}

// server/storage.ts
import { eq, and, or, desc, asc, gte, lte, count, sql } from "drizzle-orm";
var DatabaseStorage = class {
  ensureDb() {
    if (!db || typeof db.select !== "function") {
      const errorMessage = process.env.DATABASE_URL ? "\u{1F4A5} \u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A PostgreSQL." : "\u26A0\uFE0F  \u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430. \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F DATABASE_URL \u0432 .env";
      console.error(errorMessage);
      console.log("\u{1F4D6} \u041F\u0440\u0438\u043C\u0435\u0440: DATABASE_URL=postgresql://postgres:sheri2001@localhost:5432/recruit_pro");
      throw new Error(errorMessage);
    }
  }
  async getUser(id) {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUsers() {
    this.ensureDb();
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async getUserWithPassword(id) {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async createUser(user) {
    this.ensureDb();
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  async updateUser(id, user) {
    this.ensureDb();
    const [updatedUser] = await db.update(users).set({ ...user, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async deleteUser(id) {
    this.ensureDb();
    await db.delete(users).where(eq(users.id, id));
  }
  async updateUserOnlineStatus(userId, isOnline) {
    this.ensureDb();
    await db.update(users).set({
      isOnline,
      lastSeenAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async getUsersWithOnlineStatus() {
    this.ensureDb();
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.fullName));
  }
  async getVacancies() {
    this.ensureDb();
    return await db.select().from(vacancies).orderBy(desc(vacancies.createdAt));
  }
  async getVacancy(id) {
    this.ensureDb();
    const [vacancy] = await db.select().from(vacancies).where(eq(vacancies.id, id));
    return vacancy || void 0;
  }
  async createVacancy(vacancy) {
    this.ensureDb();
    const [newVacancy] = await db.insert(vacancies).values(vacancy).returning();
    return newVacancy;
  }
  async updateVacancy(id, vacancy) {
    this.ensureDb();
    const [updatedVacancy] = await db.update(vacancies).set({ ...vacancy, updatedAt: /* @__PURE__ */ new Date() }).where(eq(vacancies.id, id)).returning();
    return updatedVacancy;
  }
  async deleteVacancy(id) {
    this.ensureDb();
    const associatedCandidates = await db.select().from(candidates).where(eq(candidates.vacancyId, id));
    for (const candidate of associatedCandidates) {
      await this.deleteCandidate(candidate.id);
    }
    await db.delete(vacancies).where(eq(vacancies.id, id));
  }
  async getActiveVacancies() {
    this.ensureDb();
    return await db.select().from(vacancies).where(eq(vacancies.status, "active")).orderBy(desc(vacancies.createdAt));
  }
  async getCandidates() {
    this.ensureDb();
    return await db.select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      city: candidates.city,
      vacancyId: candidates.vacancyId,
      resumeUrl: candidates.resumeUrl,
      resumeFilename: candidates.resumeFilename,
      photoUrl: candidates.photoUrl,
      source: candidates.source,
      interviewStageChain: candidates.interviewStageChain,
      currentStageIndex: candidates.currentStageIndex,
      status: candidates.status,
      rejectionReason: candidates.rejectionReason,
      rejectionStage: candidates.rejectionStage,
      parsedResumeData: candidates.parsedResumeData,
      createdBy: candidates.createdBy,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      createdByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        position: users.position
      }
    }).from(candidates).leftJoin(users, eq(candidates.createdBy, users.id)).orderBy(desc(candidates.createdAt));
  }
  async getCandidate(id) {
    this.ensureDb();
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || void 0;
  }
  async getCandidateByTelegramId(telegramChatId) {
    this.ensureDb();
    if (!telegramChatId) {
      console.error("No telegramChatId provided");
      return void 0;
    }
    const chatId = typeof telegramChatId === "string" ? parseInt(telegramChatId, 10) : telegramChatId;
    if (isNaN(chatId) || chatId <= 0) {
      console.error("Invalid telegramChatId provided:", telegramChatId);
      return void 0;
    }
    try {
      console.log("Searching for candidate with telegramChatId:", chatId);
      console.log("Type of chatId:", typeof chatId);
      const [candidate] = await db.select().from(candidates).where(eq(candidates.telegramChatId, chatId));
      if (candidate) {
        console.log("Found candidate:", candidate.id, candidate.fullName, "Status:", candidate.status, "TelegramChatId:", candidate.telegramChatId);
        return candidate;
      } else {
        console.log("No candidate found with telegramChatId:", chatId);
        if (process.env.NODE_ENV === "development") {
          const allCandidates = await db.select({
            id: candidates.id,
            fullName: candidates.fullName,
            telegramChatId: candidates.telegramChatId,
            status: candidates.status
          }).from(candidates).where(sql`telegram_chat_id IS NOT NULL`).limit(10);
          console.log("All candidates with telegramChatId (first 10):");
          allCandidates.forEach((c) => {
            console.log(`  ID: ${c.id}, Name: ${c.fullName}, Chat ID: ${c.telegramChatId} (${typeof c.telegramChatId}), Status: ${c.status}`);
          });
        }
        return void 0;
      }
    } catch (error) {
      console.error("Error fetching candidate by telegram ID:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      if (error.name && (error.name.includes("Database") || error.name.includes("Connection"))) {
        console.error("Database connection error detected in getCandidateByTelegramId");
        const dbError = new Error("Database connection failed");
        dbError.name = "DatabaseConnectionError";
        throw dbError;
      }
      throw error;
    }
  }
  async getCandidatesByVacancy(vacancyId) {
    this.ensureDb();
    return await db.select().from(candidates).where(eq(candidates.vacancyId, vacancyId)).orderBy(desc(candidates.createdAt));
  }
  async getCandidatesByInterviewer(interviewerId) {
    this.ensureDb();
    return await db.select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      city: candidates.city,
      vacancyId: candidates.vacancyId,
      resumeUrl: candidates.resumeUrl,
      resumeFilename: candidates.resumeFilename,
      photoUrl: candidates.photoUrl,
      source: candidates.source,
      interviewStageChain: candidates.interviewStageChain,
      currentStageIndex: candidates.currentStageIndex,
      status: candidates.status,
      rejectionReason: candidates.rejectionReason,
      rejectionStage: candidates.rejectionStage,
      parsedResumeData: candidates.parsedResumeData,
      createdBy: candidates.createdBy,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      createdByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        position: users.position
      }
    }).from(candidates).innerJoin(interviewStages, eq(candidates.id, interviewStages.candidateId)).leftJoin(users, eq(candidates.createdBy, users.id)).where(
      and(
        eq(interviewStages.interviewerId, interviewerId),
        eq(candidates.status, "active")
        // Only show active candidates
      )
    ).orderBy(desc(candidates.createdAt));
  }
  async getCandidatesByStatus(status) {
    this.ensureDb();
    return await db.select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      city: candidates.city,
      vacancyId: candidates.vacancyId,
      resumeUrl: candidates.resumeUrl,
      resumeFilename: candidates.resumeFilename,
      photoUrl: candidates.photoUrl,
      source: candidates.source,
      interviewStageChain: candidates.interviewStageChain,
      currentStageIndex: candidates.currentStageIndex,
      status: candidates.status,
      rejectionReason: candidates.rejectionReason,
      rejectionStage: candidates.rejectionStage,
      parsedResumeData: candidates.parsedResumeData,
      createdBy: candidates.createdBy,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      createdByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        position: users.position
      }
    }).from(candidates).leftJoin(users, eq(candidates.createdBy, users.id)).where(eq(candidates.status, status)).orderBy(desc(candidates.createdAt));
  }
  async createCandidate(candidate) {
    this.ensureDb();
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    if (candidate.interviewStageChain) {
      const stageChain = candidate.interviewStageChain;
      for (let i = 0; i < stageChain.length; i++) {
        const stage = stageChain[i];
        await db.insert(interviewStages).values({
          candidateId: newCandidate.id,
          stageIndex: i,
          stageName: stage.stageName,
          interviewerId: stage.interviewerId,
          status: i === 0 ? "pending" : "waiting"
          // First stage is pending, others wait
        });
      }
    }
    return newCandidate;
  }
  async updateCandidate(id, candidate) {
    this.ensureDb();
    const [updatedCandidate] = await db.update(candidates).set({ ...candidate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(candidates.id, id)).returning();
    return updatedCandidate;
  }
  async deleteCandidate(id) {
    this.ensureDb();
    try {
      await db.delete(interviews).where(eq(interviews.candidateId, id));
      await db.delete(interviewStages).where(eq(interviewStages.candidateId, id));
      await db.delete(candidates).where(eq(candidates.id, id));
    } catch (error) {
      console.error("Error deleting candidate:", error);
      throw error;
    }
  }
  async deleteInterviewStagesByCandidate(candidateId) {
    this.ensureDb();
    try {
      await db.delete(interviews).where(eq(interviews.candidateId, candidateId));
      await db.delete(interviewStages).where(eq(interviewStages.candidateId, candidateId));
    } catch (error) {
      console.error("Error deleting interview stages for candidate:", error);
      throw error;
    }
  }
  async getInterviewStagesByCandidate(candidateId) {
    this.ensureDb();
    return await db.select({
      id: interviewStages.id,
      candidateId: interviewStages.candidateId,
      stageIndex: interviewStages.stageIndex,
      stageName: interviewStages.stageName,
      interviewerId: interviewStages.interviewerId,
      status: interviewStages.status,
      scheduledAt: interviewStages.scheduledAt,
      completedAt: interviewStages.completedAt,
      comments: interviewStages.comments,
      rating: interviewStages.rating,
      createdAt: interviewStages.createdAt,
      updatedAt: interviewStages.updatedAt,
      interviewer: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        position: users.position
      },
      // Include interview ID for rescheduling
      interviewId: interviews.id
    }).from(interviewStages).leftJoin(users, eq(interviewStages.interviewerId, users.id)).leftJoin(interviews, eq(interviews.stageId, interviewStages.id)).where(eq(interviewStages.candidateId, candidateId)).orderBy(asc(interviewStages.stageIndex));
  }
  async getAllInterviewStages() {
    this.ensureDb();
    return await db.select({
      id: interviewStages.id,
      candidateId: interviewStages.candidateId,
      stageIndex: interviewStages.stageIndex,
      stageName: interviewStages.stageName,
      interviewerId: interviewStages.interviewerId,
      status: interviewStages.status,
      scheduledAt: interviewStages.scheduledAt,
      completedAt: interviewStages.completedAt,
      comments: interviewStages.comments,
      rating: interviewStages.rating,
      createdAt: interviewStages.createdAt,
      updatedAt: interviewStages.updatedAt
    }).from(interviewStages).orderBy(asc(interviewStages.candidateId), asc(interviewStages.stageIndex));
  }
  async createInterviewStage(stage) {
    this.ensureDb();
    const [newStage] = await db.insert(interviewStages).values(stage).returning();
    return newStage;
  }
  async getInterviewStage(id) {
    this.ensureDb();
    const [stage] = await db.select().from(interviewStages).where(eq(interviewStages.id, id)).limit(1);
    return stage || void 0;
  }
  async updateInterviewStage(id, stage) {
    this.ensureDb();
    try {
      console.log("Updating interview stage:", id, stage);
      const updateData = { ...stage };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === "string") {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      if (updateData.completedAt && typeof updateData.completedAt === "string") {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      const [updatedStage] = await db.update(interviewStages).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(interviewStages.id, id)).returning();
      if (!updatedStage) {
        throw new Error("Interview stage not found");
      }
      console.log("Updated stage:", updatedStage);
      if (updatedStage && stage.status === "passed") {
        const candidate = await db.select().from(candidates).where(eq(candidates.id, updatedStage.candidateId)).limit(1);
        if (candidate[0]) {
          const nextStageIndex = updatedStage.stageIndex + 1;
          await db.update(candidates).set({ currentStageIndex: nextStageIndex, updatedAt: /* @__PURE__ */ new Date() }).where(eq(candidates.id, updatedStage.candidateId));
          const nextStage = await db.select().from(interviewStages).where(
            and(
              eq(interviewStages.candidateId, updatedStage.candidateId),
              eq(interviewStages.stageIndex, nextStageIndex)
            )
          ).limit(1);
          if (nextStage[0]) {
            if (nextStage[0].interviewerId) {
              await db.insert(notifications).values({
                userId: nextStage[0].interviewerId,
                type: "interview_assigned",
                title: "\u041D\u043E\u0432\u043E\u0435 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
                message: `\u041A\u0430\u043D\u0434\u0438\u0434\u0430\u0442 \u043F\u0440\u043E\u0448\u0435\u043B \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u044D\u0442\u0430\u043F. \u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u043D\u0430 \u044D\u0442\u0430\u043F "${nextStage[0].stageName}"`,
                entityType: "interview_stage",
                entityId: nextStage[0].id,
                isRead: false
              });
            }
          } else {
            await db.update(candidates).set({ status: "documentation", updatedAt: /* @__PURE__ */ new Date() }).where(eq(candidates.id, updatedStage.candidateId));
          }
        }
      } else if (updatedStage && stage.status === "failed") {
        await db.update(candidates).set({
          status: "rejected",
          rejectionStage: updatedStage.stageName,
          rejectionReason: stage.comments || "Failed interview stage",
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(candidates.id, updatedStage.candidateId));
      }
      return updatedStage;
    } catch (error) {
      console.error("Error in updateInterviewStage:", error);
      throw error;
    }
  }
  async scheduleInterview(stageId, interviewerId, scheduledAt, duration = 30) {
    this.ensureDb();
    try {
      console.log("scheduleInterview called with:", { stageId, interviewerId, scheduledAt, duration });
      const startTime = new Date(scheduledAt);
      const endTime = new Date(scheduledAt.getTime() + duration * 6e4);
      const existingInterviews = await db.select().from(interviews).where(
        and(
          eq(interviews.interviewerId, interviewerId),
          eq(interviews.status, "scheduled")
        )
      );
      console.log("Checking conflicts for:", { startTime, endTime, interviewerId });
      console.log("Existing interviews:", existingInterviews.length);
      const conflicts = existingInterviews.filter((interview2) => {
        const existingStart = new Date(interview2.scheduledAt);
        const existingEnd = new Date(interview2.scheduledAt.getTime() + interview2.duration * 6e4);
        const overlaps = startTime < existingEnd && endTime > existingStart;
        if (overlaps) {
          console.log("Conflict found:", {
            existing: { start: existingStart, end: existingEnd },
            new: { start: startTime, end: endTime }
          });
        }
        return overlaps;
      });
      if (conflicts.length > 0) {
        const conflictTime = conflicts[0].scheduledAt.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit"
        });
        throw new Error(`\u0418\u043D\u0442\u0435\u0440\u0432\u044C\u044E\u0435\u0440 \u0437\u0430\u043D\u044F\u0442 \u0432 \u044D\u0442\u043E \u0432\u0440\u0435\u043C\u044F. \u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442 \u0441 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435\u043C \u0432 ${conflictTime}`);
      }
      const stage = await db.select({
        candidateId: interviewStages.candidateId,
        stageName: interviewStages.stageName
      }).from(interviewStages).where(eq(interviewStages.id, stageId)).limit(1);
      console.log("Stage found:", stage[0]);
      if (!stage[0]) {
        throw new Error("Stage not found");
      }
      const [interview] = await db.insert(interviews).values({
        stageId,
        candidateId: stage[0].candidateId,
        interviewerId,
        scheduledAt,
        duration,
        status: "scheduled"
      }).returning();
      console.log("Interview created:", interview);
      await db.update(interviewStages).set({
        status: "in_progress",
        scheduledAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(interviewStages.id, stageId));
      await db.insert(notifications).values({
        userId: interviewerId,
        type: "interview_scheduled",
        title: "\u041D\u043E\u0432\u043E\u0435 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
        message: `\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043E \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0430 \u044D\u0442\u0430\u043F\u0435 "${stage[0].stageName}" \u043D\u0430 ${scheduledAt.toLocaleString("ru-RU")}`,
        entityType: "interview",
        entityId: interview.id,
        isRead: false
      });
      return interview;
    } catch (error) {
      console.error("Error in scheduleInterview:", error);
      throw error;
    }
  }
  async getArchivedCandidates() {
    this.ensureDb();
    return await db.select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      city: candidates.city,
      vacancyId: candidates.vacancyId,
      resumeUrl: candidates.resumeUrl,
      resumeFilename: candidates.resumeFilename,
      photoUrl: candidates.photoUrl,
      source: candidates.source,
      interviewStageChain: candidates.interviewStageChain,
      currentStageIndex: candidates.currentStageIndex,
      status: candidates.status,
      rejectionReason: candidates.rejectionReason,
      rejectionStage: candidates.rejectionStage,
      dismissalReason: candidates.dismissalReason,
      dismissalDate: candidates.dismissalDate,
      parsedResumeData: candidates.parsedResumeData,
      createdBy: candidates.createdBy,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      telegramChatId: candidates.telegramChatId
    }).from(candidates).where(
      or(
        eq(candidates.status, "hired"),
        eq(candidates.status, "rejected"),
        eq(candidates.status, "dismissed")
      )
    ).orderBy(desc(candidates.updatedAt));
  }
  async getArchivedCandidatesWithAttachments() {
    this.ensureDb();
    const archivedCandidates = await this.getArchivedCandidates();
    const candidatesWithAttachments = await Promise.all(
      archivedCandidates.map(async (candidate) => {
        const attachments = await this.getDocumentationAttachments(candidate.id);
        return {
          ...candidate,
          documentationAttachments: attachments
        };
      })
    );
    return candidatesWithAttachments;
  }
  async dismissCandidate(id, dismissalReason, dismissalDate) {
    this.ensureDb();
    const [updatedCandidate] = await db.update(candidates).set({
      status: "dismissed",
      dismissalReason,
      dismissalDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(candidates.id, id)).returning();
    return updatedCandidate;
  }
  async getInterview(interviewId) {
    this.ensureDb();
    const [interview] = await db.select({
      id: interviews.id,
      stageId: interviews.stageId,
      candidateId: interviews.candidateId,
      interviewerId: interviews.interviewerId,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
      status: interviews.status,
      outcome: interviews.outcome,
      notes: interviews.notes,
      createdAt: interviews.createdAt,
      updatedAt: interviews.updatedAt,
      candidate: {
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        telegramChatId: candidates.telegramChatId
      },
      stage: {
        id: interviewStages.id,
        stageName: interviewStages.stageName
      },
      interviewer: {
        id: users.id,
        fullName: users.fullName
      }
    }).from(interviews).leftJoin(candidates, eq(interviews.candidateId, candidates.id)).leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id)).leftJoin(users, eq(interviews.interviewerId, users.id)).where(eq(interviews.id, interviewId));
    return interview;
  }
  async rescheduleInterview(interviewId, newDateTime) {
    this.ensureDb();
    const [interview] = await db.update(interviews).set({
      scheduledAt: newDateTime,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(interviews.id, interviewId)).returning();
    if (interview) {
      await db.insert(notifications).values({
        userId: interview.interviewerId,
        type: "interview_rescheduled",
        title: "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E",
        message: `\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 ${newDateTime.toLocaleString("ru-RU")}`,
        entityType: "interview",
        entityId: interview.id,
        isRead: false
      });
    }
    return interview;
  }
  async updateInterviewOutcome(interviewId, outcome, notes) {
    this.ensureDb();
    const [interview] = await db.update(interviews).set({
      outcome,
      notes: notes || "",
      status: "completed",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(interviews.id, interviewId)).returning();
    return interview;
  }
  async getInterviews() {
    this.ensureDb();
    return await db.select({
      id: interviews.id,
      stageId: interviews.stageId,
      candidateId: interviews.candidateId,
      interviewerId: interviews.interviewerId,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
      status: interviews.status,
      outcome: interviews.outcome,
      notes: interviews.notes,
      createdAt: interviews.createdAt,
      updatedAt: interviews.updatedAt,
      candidate: {
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId
      },
      vacancy: {
        id: vacancies.id,
        title: vacancies.title,
        department: vacancies.department
      },
      stage: {
        id: interviewStages.id,
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex
      },
      interviewer: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        position: users.position
      }
    }).from(interviews).leftJoin(candidates, eq(interviews.candidateId, candidates.id)).leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id)).leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id)).leftJoin(users, eq(interviews.interviewerId, users.id)).orderBy(interviews.scheduledAt);
  }
  async getInterviewsByInterviewer(interviewerId) {
    this.ensureDb();
    return await db.select({
      id: interviews.id,
      candidateId: interviews.candidateId,
      interviewerId: interviews.interviewerId,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
      status: interviews.status,
      outcome: interviews.outcome,
      notes: interviews.notes,
      candidate: {
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city
      },
      stage: {
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex
      },
      vacancy: {
        title: vacancies.title,
        department: vacancies.department
      }
    }).from(interviews).leftJoin(candidates, eq(interviews.candidateId, candidates.id)).leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id)).leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id)).where(eq(interviews.interviewerId, interviewerId)).orderBy(asc(interviews.scheduledAt));
  }
  async getInterviewsByDateRange(start, end) {
    this.ensureDb();
    return await db.select().from(interviews).where(
      and(
        gte(interviews.scheduledAt, start),
        lte(interviews.scheduledAt, end)
      )
    ).orderBy(asc(interviews.scheduledAt));
  }
  async getInterviewsByStage(stageId) {
    this.ensureDb();
    return await db.select().from(interviews).where(eq(interviews.stageId, stageId)).orderBy(asc(interviews.scheduledAt));
  }
  async createInterview(interview) {
    this.ensureDb();
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }
  async updateInterview(id, interview) {
    this.ensureDb();
    const updateData = { ...interview };
    if (updateData.scheduledAt && typeof updateData.scheduledAt === "string") {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }
    const [updatedInterview] = await db.update(interviews).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(interviews.id, id)).returning();
    return updatedInterview;
  }
  async getNotificationsByUser(userId) {
    this.ensureDb();
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async createNotification(notification) {
    this.ensureDb();
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }
  async markNotificationAsRead(id) {
    this.ensureDb();
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }
  async getNotification(id) {
    this.ensureDb();
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || void 0;
  }
  async deleteNotification(id) {
    this.ensureDb();
    await db.delete(notifications).where(eq(notifications.id, id));
  }
  async createAuditLog(log2) {
    this.ensureDb();
    const [newLog] = await db.insert(auditLogs).values(log2).returning();
    return newLog;
  }
  async getSystemSetting(key) {
    this.ensureDb();
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || void 0;
  }
  async setSystemSetting(setting) {
    this.ensureDb();
    const [newSetting] = await db.insert(systemSettings).values(setting).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: setting.value, updatedAt: /* @__PURE__ */ new Date() }
    }).returning();
    return newSetting;
  }
  async getDashboardStats() {
    this.ensureDb();
    const today = /* @__PURE__ */ new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const [
      activeVacanciesResult,
      activeCandidatesResult,
      todayInterviewsResult,
      hiredThisMonthResult,
      documentationCandidatesResult
    ] = await Promise.all([
      db.select({ count: count() }).from(vacancies).where(eq(vacancies.status, "active")),
      db.select({ count: count() }).from(candidates).where(eq(candidates.status, "active")),
      db.select({ count: count() }).from(interviews).where(
        and(
          gte(interviews.scheduledAt, startOfToday),
          lte(interviews.scheduledAt, endOfToday),
          eq(interviews.status, "scheduled")
        )
      ),
      db.select({ count: count() }).from(candidates).where(
        and(
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      ),
      db.select({ count: count() }).from(candidates).where(eq(candidates.status, "documentation"))
    ]);
    return {
      activeVacancies: activeVacanciesResult[0].count,
      activeCandidates: activeCandidatesResult[0].count,
      todayInterviews: todayInterviewsResult[0].count,
      hiredThisMonth: hiredThisMonthResult[0].count,
      documentationCandidates: documentationCandidatesResult[0].count
    };
  }
  async getHiringTrends() {
    this.ensureDb();
    const sixMonthsAgo = /* @__PURE__ */ new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const trends = await db.select({
      month: sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`,
      hired: sql`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`,
      applications: sql`COUNT(*)`
    }).from(candidates).where(gte(candidates.createdAt, sixMonthsAgo)).groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`).orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`);
    return trends;
  }
  async getDepartmentStats() {
    this.ensureDb();
    const stats = await db.select({
      department: vacancies.department,
      count: sql`COUNT(${candidates.id})`
    }).from(vacancies).leftJoin(candidates, eq(candidates.vacancyId, vacancies.id)).where(eq(candidates.status, "hired")).groupBy(vacancies.department).orderBy(sql`COUNT(${candidates.id}) DESC`);
    return stats;
  }
  async getTimeToHireStats() {
    this.ensureDb();
    const hiredCandidates = await db.select({
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt
    }).from(candidates).where(eq(candidates.status, "hired"));
    if (hiredCandidates.length === 0) {
      return { averageDays: 0, fastest: 0, median: 0, slowest: 0 };
    }
    const daysDiff = hiredCandidates.map((candidate) => {
      const created = new Date(candidate.createdAt);
      const hired = new Date(candidate.updatedAt);
      return Math.ceil((hired.getTime() - created.getTime()) / (1e3 * 60 * 60 * 24));
    });
    daysDiff.sort((a, b) => a - b);
    const averageDays = Math.round(daysDiff.reduce((sum, days) => sum + days, 0) / daysDiff.length);
    const fastest = daysDiff[0];
    const slowest = daysDiff[daysDiff.length - 1];
    const median = daysDiff[Math.floor(daysDiff.length / 2)];
    return {
      averageDays,
      fastest,
      median,
      slowest
    };
  }
  async getConversionFunnel() {
    this.ensureDb();
    const [applicationsResult] = await db.select({ count: count() }).from(candidates);
    const [phoneScreenResult] = await db.select({ count: count() }).from(interviewStages).where(
      and(
        sql`LOWER(${interviewStages.stageName}) LIKE '%phone%' OR LOWER(${interviewStages.stageName}) LIKE '%screen%'`,
        eq(interviewStages.status, "passed")
      )
    );
    const [technicalResult] = await db.select({ count: count() }).from(interviewStages).where(
      and(
        sql`LOWER(${interviewStages.stageName}) LIKE '%technical%'`,
        eq(interviewStages.status, "passed")
      )
    );
    const [finalResult] = await db.select({ count: count() }).from(interviewStages).where(
      and(
        sql`LOWER(${interviewStages.stageName}) LIKE '%final%'`,
        eq(interviewStages.status, "passed")
      )
    );
    const [hiredResult] = await db.select({ count: count() }).from(candidates).where(eq(candidates.status, "hired"));
    return {
      applications: applicationsResult.count,
      phoneScreen: phoneScreenResult.count,
      technical: technicalResult.count,
      final: finalResult.count,
      hired: hiredResult.count
    };
  }
  async getMessagesBetweenUsers(user1Id, user2Id) {
    this.ensureDb();
    const result = await db.select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      senderId_user: users.id,
      senderFullName: users.fullName,
      senderPosition: users.position
    }).from(messages).leftJoin(users, eq(messages.senderId, users.id)).where(
      or(
        and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
        and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
      )
    ).orderBy(asc(messages.createdAt));
    return result.map((row) => ({
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sender: row.senderId_user ? {
        id: row.senderId_user,
        fullName: row.senderFullName || "",
        position: row.senderPosition || ""
      } : void 0
    }));
  }
  async createMessage(message) {
    this.ensureDb();
    const [newMessage] = await db.insert(messages).values(message).returning();
    const [messageWithSender] = await db.select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      senderId_user: users.id,
      senderFullName: users.fullName,
      senderPosition: users.position
    }).from(messages).leftJoin(users, eq(messages.senderId, users.id)).where(eq(messages.id, newMessage.id));
    return {
      id: messageWithSender.id,
      senderId: messageWithSender.senderId,
      receiverId: messageWithSender.receiverId,
      content: messageWithSender.content,
      isRead: messageWithSender.isRead,
      createdAt: messageWithSender.createdAt,
      updatedAt: messageWithSender.updatedAt,
      sender: messageWithSender.senderId_user ? {
        id: messageWithSender.senderId_user,
        fullName: messageWithSender.senderFullName || "",
        position: messageWithSender.senderPosition || ""
      } : void 0
    };
  }
  async getConversationsByUser(userId) {
    this.ensureDb();
    const senderUsers = await db.selectDistinct({
      id: users.id,
      fullName: users.fullName,
      position: users.position,
      email: users.email
    }).from(messages).innerJoin(users, eq(messages.senderId, users.id)).where(
      and(
        eq(messages.receiverId, userId),
        sql`${users.id} != ${userId}`
      )
    );
    const receiverUsers = await db.selectDistinct({
      id: users.id,
      fullName: users.fullName,
      position: users.position,
      email: users.email
    }).from(messages).innerJoin(users, eq(messages.receiverId, users.id)).where(
      and(
        eq(messages.senderId, userId),
        sql`${users.id} != ${userId}`
      )
    );
    const allUsers = [...senderUsers, ...receiverUsers];
    const uniqueUsers = allUsers.filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id)
    );
    return uniqueUsers;
  }
  async getHiredAndDismissedStats() {
    this.ensureDb();
    const [totalHiredResult] = await db.select({ count: count() }).from(candidates).where(eq(candidates.status, "hired"));
    const [totalDismissedResult] = await db.select({ count: count() }).from(candidates).where(eq(candidates.status, "dismissed"));
    const currentlyEmployed = totalHiredResult.count;
    return {
      totalHired: totalHiredResult.count,
      totalDismissed: totalDismissedResult.count,
      currentlyEmployed
    };
  }
  async getHiredAndDismissedStatsByMonth() {
    this.ensureDb();
    const oneYearAgo = /* @__PURE__ */ new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const hiredByMonth = await db.select({
      month: sql`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`,
      count: count()
    }).from(candidates).where(
      and(
        eq(candidates.status, "hired"),
        gte(candidates.updatedAt, oneYearAgo)
      )
    ).groupBy(sql`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`);
    const dismissedByMonth = await db.select({
      month: sql`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`,
      count: count()
    }).from(candidates).where(
      and(
        eq(candidates.status, "dismissed"),
        sql`${candidates.dismissalDate} IS NOT NULL`,
        gte(candidates.dismissalDate, oneYearAgo)
      )
    ).groupBy(sql`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`);
    const monthMap = /* @__PURE__ */ new Map();
    hiredByMonth.forEach((item) => {
      monthMap.set(item.month, { hired: item.count, dismissed: 0 });
    });
    dismissedByMonth.forEach((item) => {
      const existing = monthMap.get(item.month) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      monthMap.set(item.month, existing);
    });
    const result = Array.from(monthMap.entries()).map(([month, data]) => {
      const [year, monthNum] = month.split("-");
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      return {
        month,
        monthName: monthNames[parseInt(monthNum) - 1],
        year,
        hired: data.hired,
        dismissed: data.dismissed,
        netChange: data.hired - data.dismissed
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
    return result;
  }
  async getHiredAndDismissedStatsByYear() {
    this.ensureDb();
    const fiveYearsAgo = /* @__PURE__ */ new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const hiredByYear = await db.select({
      year: sql`EXTRACT(YEAR FROM ${candidates.updatedAt})::text`,
      count: count()
    }).from(candidates).where(
      and(
        eq(candidates.status, "hired"),
        gte(candidates.updatedAt, fiveYearsAgo)
      )
    ).groupBy(sql`EXTRACT(YEAR FROM ${candidates.updatedAt})`);
    const dismissedByYear = await db.select({
      year: sql`EXTRACT(YEAR FROM ${candidates.dismissalDate})::text`,
      count: count()
    }).from(candidates).where(
      and(
        eq(candidates.status, "dismissed"),
        sql`${candidates.dismissalDate} IS NOT NULL`,
        gte(candidates.dismissalDate, fiveYearsAgo)
      )
    ).groupBy(sql`EXTRACT(YEAR FROM ${candidates.dismissalDate})`);
    const yearMap = /* @__PURE__ */ new Map();
    hiredByYear.forEach((item) => {
      yearMap.set(item.year, { hired: item.count, dismissed: 0 });
    });
    dismissedByYear.forEach((item) => {
      const existing = yearMap.get(item.year) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      yearMap.set(item.year, existing);
    });
    const result = Array.from(yearMap.entries()).map(([year, data]) => ({
      year,
      hired: data.hired,
      dismissed: data.dismissed,
      netChange: data.hired - data.dismissed
    })).sort((a, b) => a.year.localeCompare(b.year));
    return result;
  }
  async markMessageAsRead(messageId, userId) {
    this.ensureDb();
    const [updatedMessage] = await db.update(messages).set({ isRead: true }).where(and(eq(messages.id, messageId), eq(messages.receiverId, userId))).returning();
    return updatedMessage;
  }
  async getRejectionsByStage() {
    this.ensureDb();
    const rejectedCandidates = await db.select({
      currentStage: candidates.currentStageIndex
    }).from(candidates).where(eq(candidates.status, "rejected"));
    const stageRejections = /* @__PURE__ */ new Map();
    rejectedCandidates.forEach((candidate) => {
      const stage = candidate.currentStage || 1;
      stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
    });
    const stageNames = [
      "\u041F\u0435\u0440\u0432\u0438\u0447\u043D\u044B\u0439 \u043E\u0442\u0431\u043E\u0440",
      "\u0422\u0435\u043B\u0435\u0444\u043E\u043D\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E",
      "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
      "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E",
      "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432"
    ];
    const result = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        stage: i,
        rejections: stageRejections.get(i) || 0,
        stageName: stageNames[i - 1]
      });
    }
    return result;
  }
  async getDashboardStatsByMonth(month, year) {
    this.ensureDb();
    const startOfMonth = /* @__PURE__ */ new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
    const [activeVacanciesResult] = await db.select({ count: count() }).from(vacancies).where(eq(vacancies.status, "active"));
    const [activeCandidatesResult] = await db.select({ count: count() }).from(candidates).where(eq(candidates.status, "active"));
    const [monthlyInterviewsResult] = await db.select({ count: count() }).from(interviews).where(
      and(
        gte(interviews.scheduledAt, startOfMonth),
        lte(interviews.scheduledAt, endOfMonth)
      )
    );
    const [hiredThisMonthResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        eq(candidates.status, "hired"),
        gte(candidates.updatedAt, startOfMonth),
        lte(candidates.updatedAt, endOfMonth)
      )
    );
    const [documentationCandidatesResult] = await db.select({ count: count() }).from(candidates).where(eq(candidates.status, "documentation"));
    return {
      activeVacancies: activeVacanciesResult.count,
      activeCandidates: activeCandidatesResult.count,
      monthlyInterviews: monthlyInterviewsResult.count,
      hiredThisMonth: hiredThisMonthResult.count,
      documentationCandidates: documentationCandidatesResult.count
    };
  }
  async getConversionFunnelByMonth(month, year) {
    this.ensureDb();
    const startOfMonth = /* @__PURE__ */ new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
    const [applicationsResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        gte(candidates.createdAt, startOfMonth),
        lte(candidates.createdAt, endOfMonth)
      )
    );
    const [phoneScreenResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        gte(candidates.currentStageIndex, 2),
        gte(candidates.createdAt, startOfMonth),
        lte(candidates.createdAt, endOfMonth)
      )
    );
    const [technicalResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        gte(candidates.currentStageIndex, 3),
        gte(candidates.createdAt, startOfMonth),
        lte(candidates.createdAt, endOfMonth)
      )
    );
    const [finalResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        gte(candidates.currentStageIndex, 4),
        gte(candidates.createdAt, startOfMonth),
        lte(candidates.createdAt, endOfMonth)
      )
    );
    const [hiredResult] = await db.select({ count: count() }).from(candidates).where(
      and(
        eq(candidates.status, "hired"),
        gte(candidates.updatedAt, startOfMonth),
        lte(candidates.updatedAt, endOfMonth)
      )
    );
    return {
      applications: applicationsResult.count,
      phoneScreen: phoneScreenResult.count,
      technical: technicalResult.count,
      final: finalResult.count,
      hired: hiredResult.count
    };
  }
  async getRejectionsByStageByMonth(month, year) {
    this.ensureDb();
    const startOfMonth = /* @__PURE__ */ new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
    const rejectedCandidates = await db.select({
      currentStage: candidates.currentStageIndex
    }).from(candidates).where(
      and(
        eq(candidates.status, "rejected"),
        gte(candidates.updatedAt, startOfMonth),
        lte(candidates.updatedAt, endOfMonth)
      )
    );
    const stageRejections = /* @__PURE__ */ new Map();
    rejectedCandidates.forEach((candidate) => {
      const stage = candidate.currentStage || 1;
      stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
    });
    const stageNames = [
      "\u041F\u0435\u0440\u0432\u0438\u0447\u043D\u044B\u0439 \u043E\u0442\u0431\u043E\u0440",
      "\u0422\u0435\u043B\u0435\u0444\u043E\u043D\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E",
      "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
      "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E",
      "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432"
    ];
    const result = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        stage: i,
        rejections: stageRejections.get(i) || 0,
        stageName: stageNames[i - 1]
      });
    }
    return result;
  }
  async getAvailableDataPeriods() {
    this.ensureDb();
    const candidatePeriods = await db.select({
      period: sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`
    }).from(candidates).groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`).orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM') DESC`);
    const interviewPeriods = await db.select({
      period: sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`
    }).from(interviews).groupBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`).orderBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM') DESC`);
    const allPeriods = /* @__PURE__ */ new Set([
      ...candidatePeriods.map((p) => p.period),
      ...interviewPeriods.map((p) => p.period)
    ]);
    const monthNames = [
      "\u042F\u043D\u0432\u0430\u0440\u044C",
      "\u0424\u0435\u0432\u0440\u0430\u043B\u044C",
      "\u041C\u0430\u0440\u0442",
      "\u0410\u043F\u0440\u0435\u043B\u044C",
      "\u041C\u0430\u0439",
      "\u0418\u044E\u043D\u044C",
      "\u0418\u044E\u043B\u044C",
      "\u0410\u0432\u0433\u0443\u0441\u0442",
      "\u0421\u0435\u043D\u0442\u044F\u0431\u0440\u044C",
      "\u041E\u043A\u0442\u044F\u0431\u0440\u044C",
      "\u041D\u043E\u044F\u0431\u0440\u044C",
      "\u0414\u0435\u043A\u0430\u0431\u0440\u044C"
    ];
    const result = Array.from(allPeriods).sort().reverse().map((period) => {
      const [year, month] = period.split("-");
      return {
        year,
        month,
        monthName: monthNames[parseInt(month) - 1]
      };
    });
    return result;
  }
  // Department methods
  async getDepartments() {
    return db.select().from(departments).orderBy(departments.name);
  }
  async getDepartment(id) {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }
  async createDepartment(department) {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }
  async updateDepartment(id, department) {
    const [updated] = await db.update(departments).set({ ...department, updatedAt: /* @__PURE__ */ new Date() }).where(eq(departments.id, id)).returning();
    return updated;
  }
  async deleteDepartment(id) {
    await db.delete(departments).where(eq(departments.id, id));
  }
  // Documentation Attachment methods
  async getDocumentationAttachments(candidateId) {
    this.ensureDb();
    return await db.select({
      id: documentationAttachments.id,
      candidateId: documentationAttachments.candidateId,
      filename: documentationAttachments.filename,
      originalName: documentationAttachments.originalName,
      fileType: documentationAttachments.fileType,
      fileSize: documentationAttachments.fileSize,
      uploadedBy: documentationAttachments.uploadedBy,
      createdAt: documentationAttachments.createdAt,
      uploadedByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email
      }
    }).from(documentationAttachments).leftJoin(users, eq(documentationAttachments.uploadedBy, users.id)).where(eq(documentationAttachments.candidateId, candidateId)).orderBy(desc(documentationAttachments.createdAt));
  }
  async getDocumentationAttachment(id) {
    this.ensureDb();
    const [attachment] = await db.select().from(documentationAttachments).where(eq(documentationAttachments.id, id));
    return attachment || void 0;
  }
  async createDocumentationAttachment(attachment) {
    this.ensureDb();
    const [newAttachment] = await db.insert(documentationAttachments).values(attachment).returning();
    return newAttachment;
  }
  async deleteDocumentationAttachment(id) {
    this.ensureDb();
    await db.delete(documentationAttachments).where(eq(documentationAttachments.id, id));
  }
};
var storage = new DatabaseStorage();

// server/services/auth.ts
import bcrypt from "bcrypt";
var AuthService = class {
  constructor() {
    this.saltRounds = 10;
  }
  async hashPassword(password) {
    return bcrypt.hash(password, this.saltRounds);
  }
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
  async authenticateUser(email, password) {
    const user = await storage.getUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }
    return user;
  }
  async createUser(userData) {
    const hashedPassword = await this.hashPassword(userData.password);
    const userWithHashedPassword = {
      ...userData,
      password: hashedPassword,
      plainPassword: userData.password
      // Save plain password for admin viewing
    };
    return await storage.createUser(userWithHashedPassword);
  }
  async generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
};
var authService = new AuthService();

// server/services/email.ts
import "dotenv/config";
import nodemailer from "nodemailer";
import { Resend } from "resend";
var EmailService = class {
  constructor() {
    this.transporter = null;
    this.resend = null;
    this.emailMethod = "console";
    this.initializeEmailService();
  }
  initializeEmailService() {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.emailMethod = "resend";
      console.log("\u2705 Email service initialized with Resend API");
      return;
    }
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.emailMethod = "smtp";
      console.log("\u2705 Email service initialized with SMTP configuration");
      return;
    }
    console.log("\u26A0\uFE0F No email service configured - credentials will be logged to console");
  }
  async sendInterviewNotification(to, candidateName, interviewDate, interviewerName) {
    try {
      const subject = `New Interview Assigned - ${candidateName}`;
      const html = `
        <h2>New Interview Assignment</h2>
        <p>You have been assigned a new interview:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateName}</li>
          <li><strong>Date & Time:</strong> ${interviewDate.toLocaleString()}</li>
          <li><strong>Duration:</strong> 30 minutes</li>
        </ul>
        <p>Please log into the ATS platform to view more details and prepare for the interview.</p>
      `;
      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error("Failed to send interview notification:", error);
      return false;
    }
  }
  async sendInterviewReminder(to, candidateName, interviewDate) {
    try {
      const subject = `Interview Reminder - ${candidateName} in 30 minutes`;
      const html = `
        <h2>Interview Reminder</h2>
        <p>This is a reminder that you have an interview scheduled in 30 minutes:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateName}</li>
          <li><strong>Time:</strong> ${interviewDate.toLocaleString()}</li>
        </ul>
        <p>Please make sure you're prepared and have access to the candidate's profile in the ATS platform.</p>
      `;
      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error("Failed to send interview reminder:", error);
      return false;
    }
  }
  async sendWelcomeEmail(to, fullName, temporaryPassword) {
    try {
      if (this.emailMethod === "console") {
        console.log("=== USER CREDENTIALS (EMAIL NOT CONFIGURED) ===");
        console.log(`User: ${fullName}`);
        console.log(`Email: ${to}`);
        console.log(`Temporary Password: ${temporaryPassword}`);
        console.log("=== Please provide these credentials to the user ===");
        return true;
      }
      const subject = "Welcome to RecruitPro ATS Platform";
      const html = `
        <h2>Welcome to RecruitPro</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created for the RecruitPro ATS platform. Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>You can access the platform at: ${process.env.APP_URL || "http://localhost:5000"}</p>
      `;
      return await this.sendEmail(to, subject, html, fullName);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return false;
    }
  }
  async sendStatusUpdateNotification(to, candidateName, oldStatus, newStatus, comments) {
    try {
      const subject = `Candidate Status Update - ${candidateName}`;
      const html = `
        <h2>Candidate Status Update</h2>
        <p>The status of candidate ${candidateName} has been updated:</p>
        <ul>
          <li><strong>Previous Status:</strong> ${oldStatus}</li>
          <li><strong>New Status:</strong> ${newStatus}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ""}
        </ul>
        <p>Please log into the ATS platform for more details.</p>
      `;
      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error("Failed to send status update notification:", error);
      return false;
    }
  }
  async sendEmail(to, subject, html, fullName) {
    try {
      if (this.emailMethod === "resend" && this.resend) {
        const testDomains = ["example.com", "test.com", "localhost"];
        const isTestDomain = testDomains.some((domain) => to.includes(domain));
        if (isTestDomain) {
          console.log("\u26A0\uFE0F Test domain detected - logging credentials instead of sending email");
          console.log("=== USER CREDENTIALS (TEST DOMAIN) ===");
          console.log(`User: ${fullName || "N/A"}`);
          console.log(`Email: ${to}`);
          console.log(`Subject: ${subject}`);
          console.log("=== Email would be sent via Resend in production ===");
          return true;
        }
        const { data, error } = await this.resend.emails.send({
          from: "RecruitPro <onboarding@resend.dev>",
          to: [to],
          subject,
          html
        });
        if (error) {
          console.error("Resend API error:", error);
          const anyErr = error;
          if (anyErr.statusCode === 403 && anyErr.message?.includes("testing emails")) {
            console.log("\u26A0\uFE0F Resend testing limitation - logging credentials instead");
            console.log("=== USER CREDENTIALS (RESEND TESTING MODE) ===");
            console.log(`User: ${fullName || "N/A"}`);
            console.log(`Email: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log("=== To send to other emails, verify a domain in Resend ===");
            return true;
          }
          return false;
        }
        console.log("\u2705 Email sent via Resend:", data?.id);
        return true;
      }
      if (this.emailMethod === "smtp" && this.transporter) {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html
        };
        await this.transporter.sendMail(mailOptions);
        console.log("\u2705 Email sent via SMTP");
        return true;
      }
      console.log("\u26A0\uFE0F No email service configured");
      return false;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }
};
var emailService = new EmailService();

// server/routes.ts
import MemoryStore from "memorystore";
var diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads/")) {
      fs.mkdirSync("uploads/", { recursive: true });
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});
var photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads/photos/")) {
      fs.mkdirSync("uploads/photos/", { recursive: true });
    }
    cb(null, "uploads/photos/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});
var upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("File upload attempt:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "text/plain"
    ];
    const isAllowed = allowedTypes.includes(file.mimetype);
    console.log(`File ${file.originalname} (${file.mimetype}) - ${isAllowed ? "ALLOWED" : "REJECTED"}`);
    cb(null, isAllowed);
  }
});
var uploadPhoto = multer({
  storage: photoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    console.log("Photo upload attempt:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    const allowedPhotoTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png"
    ];
    const isAllowed = allowedPhotoTypes.includes(file.mimetype);
    console.log(`Photo ${file.originalname} (${file.mimetype}) - ${isAllowed ? "ALLOWED" : "REJECTED"}`);
    cb(null, isAllowed);
  }
});
var MemoryStoreSession = MemoryStore(session);
var sessionConfig = {
  secret: process.env.SESSION_SECRET || "recruit-pro-secret-key",
  resave: false,
  // Don't save session if unmodified
  saveUninitialized: false,
  // Don't create session until something stored
  name: "connect.sid",
  // Explicit session name
  store: new MemoryStoreSession({
    checkPeriod: 864e5
    // prune expired entries every 24h
  }),
  cookie: {
    secure: false,
    // Disable secure cookies for development
    httpOnly: false,
    // Allow client-side access for debugging
    maxAge: 24 * 60 * 60 * 1e3,
    // 24 hours
    sameSite: "lax",
    domain: void 0,
    // Let browser decide
    path: "/"
    // Explicit path
  }
};
var wsClients = /* @__PURE__ */ new Set();
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
async function registerRoutes(app2) {
  app2.use(session(sessionConfig));
  if (!process.env.DATABASE_URL) {
    app2.use((req, _res, next) => {
      if (!req.session.user) {
        req.session.user = {
          id: 1,
          email: "admin@synergyhire.com",
          fullName: "SynergyHire Admin",
          role: "admin"
        };
      }
      next();
    });
  }
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[Session Debug] ${req.method} ${req.path}`);
      console.log(`  - Session ID: ${req.sessionID}`);
      console.log(`  - User: ${req.session?.user?.email || "none"}`);
      console.log(`  - Cookie: ${req.headers.cookie || "none"}`);
      console.log(`  - User-Agent: ${req.headers["user-agent"]?.substring(0, 50) || "none"}`);
      console.log(`  - Origin: ${req.headers.origin || "none"}`);
      console.log(`  - Referer: ${req.headers.referer || "none"}`);
      console.log(`  - Session exists: ${!!req.session}`);
      console.log(`  - Session user exists: ${!!req.session?.user}`);
      if (req.headers["user-agent"]?.includes("Mozilla")) {
        res.setHeader("Set-Cookie-Debug", "connect.sid=" + req.sessionID + "; Path=/; HttpOnly=false; SameSite=Lax");
      }
    }
    next();
  });
  const requireAuth = (req, res, next) => {
    console.log(`[Auth Check] Checking authentication for ${req.method} ${req.path}`);
    console.log(`  - Session ID: ${req.sessionID}`);
    console.log(`  - Session user: ${req.session?.user?.email || "none"}`);
    console.log(`  - Session object: ${JSON.stringify(req.session || {}, null, 2)}`);
    if (!req.session?.user) {
      console.log(`[Auth Check] FAILED - No user in session`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log(`[Auth Check] PASSED - User ${req.session.user.email} authenticated`);
    next();
  };
  const requireAdmin = (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.session.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };
  const requireAnalyticsAccess = (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.session.user;
    if (user.role === "admin" || Boolean(user.hasReportAccess)) {
      next();
    } else {
      return res.status(403).json({ error: "Analytics access not allowed. Contact administrator to enable report access." });
    }
  };
  app2.post("/api/auth/login", async (req, res) => {
    console.log(`[LOGIN] Starting login process`);
    console.log(`[LOGIN] Request body:`, req.body);
    console.log(`[LOGIN] Session ID before login:`, req.sessionID);
    console.log(`[LOGIN] Session before login:`, req.session);
    try {
      const { email, password } = req.body;
      console.log(`[LOGIN] Attempting authentication for email: ${email}`);
      const user = await authService.authenticateUser(email, password);
      console.log(`[LOGIN] Authentication result:`, user ? "SUCCESS" : "FAILED");
      if (!user) {
        console.log(`[LOGIN] Invalid credentials for: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const sanitizedUser = authService.sanitizeUser(user);
      console.log(`[LOGIN] Setting user in session:`, sanitizedUser);
      req.session.user = sanitizedUser;
      console.log(`[LOGIN] Session after setting user:`, req.session);
      console.log(`[LOGIN] Session ID after setting user:`, req.sessionID);
      req.session.save((err) => {
        if (err) {
          console.error("[LOGIN] Session save error:", err);
          return res.status(500).json({ error: "Session save failed" });
        }
        console.log(`[LOGIN] Session saved successfully for user: ${user.email}`);
        console.log(`[LOGIN] Final session ID: ${req.sessionID}`);
        console.log(`[LOGIN] Final session user: ${req.session.user?.email}`);
        res.json({ user: req.session.user });
      });
    } catch (error) {
      console.error("[LOGIN] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", (req, res) => {
    console.log(`[AUTH/ME] Checking current user`);
    console.log(`[AUTH/ME] Session ID: ${req.sessionID}`);
    console.log(`[AUTH/ME] Session exists: ${!!req.session}`);
    console.log(`[AUTH/ME] Session user exists: ${!!req.session?.user}`);
    console.log(`[AUTH/ME] Session user: ${req.session?.user?.email || "none"}`);
    console.log(`[AUTH/ME] Full session: ${JSON.stringify(req.session || {}, null, 2)}`);
    if (req.session?.user) {
      console.log(`[AUTH/ME] User authenticated: ${req.session.user.email}`);
      res.json({ user: req.session.user });
    } else {
      console.log(`[AUTH/ME] User NOT authenticated`);
      res.status(401).json({ error: "Not authenticated" });
    }
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      res.json(users2.map((user) => authService.sanitizeUser(user)));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", requireAdmin, async (req, res) => {
    console.log(`[CREATE USER] Starting user creation process`);
    console.log(`[CREATE USER] Request body:`, req.body);
    console.log(`[CREATE USER] Session user:`, req.session?.user);
    try {
      console.log(`[CREATE USER] Parsing user data with schema`);
      const userData = insertUserSchemaForAPI.parse(req.body);
      console.log(`[CREATE USER] Parsed user data:`, userData);
      console.log(`[CREATE USER] Generating temporary password`);
      const temporaryPassword = await authService.generateRandomPassword();
      console.log(`[CREATE USER] Temporary password generated: ${temporaryPassword}`);
      const processedUserData = {
        ...userData,
        password: temporaryPassword,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : void 0
      };
      console.log(`[CREATE USER] Processed user data:`, processedUserData);
      console.log(`[CREATE USER] Creating user in database`);
      const user = await authService.createUser(processedUserData);
      console.log(`[CREATE USER] User created successfully:`, user);
      console.log(`[CREATE USER] Skipping email send - user can view credentials in admin panel`);
      console.log(`[CREATE USER] User credentials - Email: ${user.email}, Password: ${temporaryPassword}`);
      console.log(`[CREATE USER] Creating audit log`);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_USER",
        entityType: "user",
        entityId: user.id,
        newValues: authService.sanitizeUser(user)
      });
      console.log(`[CREATE USER] Audit log created`);
      const responseUser = authService.sanitizeUser(user);
      console.log(`[CREATE USER] Sending response:`, responseUser);
      res.json(responseUser);
    } catch (error) {
      console.error("[CREATE USER] Error creating user:", error);
      if (error.code === "23505" && error.constraint === "users_email_unique") {
        console.log(`[CREATE USER] Duplicate email error detected`);
        return res.status(400).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C email \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442" });
      }
      console.log(`[CREATE USER] General error, sending 500 response`);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.get("/api/users/:id/credentials", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const user = await storage.getUserWithPassword(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        email: user.email,
        plainPassword: user.plainPassword || "Password not available",
        fullName: user.fullName,
        position: user.position,
        role: user.role
      });
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });
  app2.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session?.user;
      if (currentUser?.id !== id && currentUser?.role !== "admin") {
        return res.status(403).json({ error: "Cannot update other users profile" });
      }
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const updateData = {
        fullName: req.body.fullName,
        email: req.body.email,
        position: req.body.position,
        phone: req.body.phone || null,
        location: req.body.location || null,
        role: req.body.role
      };
      if (currentUser?.role !== "admin") {
        updateData.role = existingUser.role;
      } else {
        if (req.body.hasReportAccess !== void 0) {
          updateData.hasReportAccess = Boolean(req.body.hasReportAccess);
        }
      }
      const updatedUser = await storage.updateUser(id, updateData);
      if (currentUser?.id === id) {
        req.session.user = { ...req.session.user, ...authService.sanitizeUser(updatedUser) };
        req.session.save();
      }
      res.json(authService.sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user:", error);
      if (error.code === "23505" && error.constraint === "users_email_unique") {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.email === "admin@synergyhire.com" || user.email === "admin@recruitpro.com") {
        return res.status(403).json({ error: "Cannot delete the main administrator account" });
      }
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can delete users" });
      }
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/vacancies", requireAuth, async (req, res) => {
    try {
      const vacancies2 = await storage.getVacancies();
      res.json(vacancies2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vacancies" });
    }
  });
  app2.get("/api/vacancies/active", requireAuth, async (req, res) => {
    try {
      const vacancies2 = await storage.getVacancies();
      const activeVacancies = vacancies2.filter((v) => v.status === "active");
      res.json(activeVacancies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active vacancies" });
    }
  });
  app2.post("/api/vacancies", requireAuth, async (req, res) => {
    try {
      console.log("Creating vacancy with data:", req.body);
      const vacancyData = insertVacancySchema.parse({
        ...req.body,
        createdBy: req.session.user.id
      });
      const vacancy = await storage.createVacancy(vacancyData);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_VACANCY",
        entityType: "vacancy",
        entityId: vacancy.id,
        newValues: vacancy
      });
      broadcastToClients({
        type: "VACANCY_CREATED",
        data: vacancy
      });
      res.json(vacancy);
    } catch (error) {
      console.error("Vacancy creation error:", error);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create vacancy" });
      }
    }
  });
  app2.put("/api/vacancies/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const oldVacancy = await storage.getVacancy(id);
      const vacancy = await storage.updateVacancy(id, updates);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPDATE_VACANCY",
        entityType: "vacancy",
        entityId: id,
        oldValues: oldVacancy,
        newValues: vacancy
      });
      broadcastToClients({
        type: "VACANCY_UPDATED",
        data: vacancy
      });
      res.json(vacancy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vacancy" });
    }
  });
  app2.delete("/api/vacancies/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vacancy = await storage.getVacancy(id);
      if (!vacancy) {
        return res.status(404).json({ error: "Vacancy not found" });
      }
      await storage.deleteVacancy(id);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "DELETE_VACANCY",
        entityType: "vacancy",
        entityId: id,
        oldValues: [vacancy]
      });
      broadcastToClients({
        type: "VACANCY_DELETED",
        data: { id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vacancy:", error);
      res.status(500).json({ error: "Failed to delete vacancy" });
    }
  });
  app2.get("/api/candidates", requireAuth, async (req, res) => {
    try {
      const userRole = req.session.user.role;
      const userId = req.session.user.id;
      let candidates2;
      if (userRole === "admin" || userRole === "hr_manager") {
        candidates2 = await storage.getCandidates();
      } else {
        candidates2 = await storage.getCandidatesByInterviewer(userId);
      }
      res.json(candidates2);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });
  app2.get("/api/candidates/archived", requireAuth, async (req, res) => {
    console.log("Archived candidates route hit");
    try {
      const candidates2 = await storage.getArchivedCandidatesWithAttachments();
      console.log("Retrieved archived candidates with attachments:", candidates2.length);
      res.json(candidates2);
    } catch (error) {
      console.error("Archive candidates error:", error);
      res.status(500).json({ error: "Failed to fetch archived candidates" });
    }
  });
  app2.get("/api/candidates/:id", requireAuth, async (req, res) => {
    console.log("Single candidate route hit with ID:", req.params.id);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid candidate ID" });
      }
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const stages = await storage.getInterviewStagesByCandidate(id);
      const documentationAttachments2 = await storage.getDocumentationAttachments(id);
      res.json({ ...candidate, stages, documentationAttachments: documentationAttachments2 });
    } catch (error) {
      console.error("Single candidate error:", error);
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });
  const debugMultipart = (req, res, next) => {
    console.log("=== MULTIPART DEBUG ===");
    console.log("Content-Type:", req.get("Content-Type"));
    console.log("Raw body keys:", Object.keys(req.body || {}));
    console.log("Body:", req.body);
    console.log("Files:", req.file);
    console.log("======================");
    next();
  };
  app2.post("/api/candidates", requireAuth, upload.array("files", 5), debugMultipart, async (req, res) => {
    try {
      console.log("Received candidate data:", req.body);
      console.log("Request files:", req.files);
      if (!req.body.fullName) {
        console.error("Missing required fields:", { fullName: req.body.fullName });
        return res.status(400).json({
          error: "Missing required fields",
          details: { fullName: !!req.body.fullName }
        });
      }
      const processedData = {
        fullName: req.body.fullName,
        email: req.body.email || null,
        phone: req.body.phone || "",
        city: req.body.city || "",
        vacancyId: req.body.vacancyId ? parseInt(req.body.vacancyId) : null,
        source: req.body.source || "",
        currentStageIndex: 0,
        interviewStageChain: req.body.interviewStageChain ? JSON.parse(req.body.interviewStageChain) : null,
        createdBy: req.session.user.id
      };
      console.log("Processed candidate data with stage chain:", processedData);
      if (!processedData.vacancyId) {
        return res.status(400).json({ error: "Vacancy ID is required" });
      }
      if (!processedData.interviewStageChain || processedData.interviewStageChain.length === 0) {
        return res.status(400).json({ error: "Interview stage chain is required" });
      }
      const candidateData = insertCandidateSchema.parse(processedData);
      let resumeUrl = "";
      let resumeFilename = "";
      let parsedResumeData = null;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        const firstFile = files[0];
        resumeUrl = `/api/files/${firstFile.filename}`;
        resumeFilename = firstFile.originalname;
        try {
          const { extractTextFromFile: extractTextFromFile2, parseResumeWithAI: parseResumeWithAI2 } = await Promise.resolve().then(() => (init_resumeParser(), resumeParser_exports));
          const resumeText = await extractTextFromFile2(firstFile.path);
          parsedResumeData = await parseResumeWithAI2(resumeText);
        } catch (parseError) {
          console.error("Resume parsing failed:", parseError);
        }
      }
      const candidate = await storage.createCandidate({
        ...candidateData,
        resumeUrl,
        resumeFilename,
        parsedResumeData
      });
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_CANDIDATE",
        entityType: "candidate",
        entityId: candidate.id,
        newValues: [candidate]
      });
      broadcastToClients({
        type: "CANDIDATE_CREATED",
        data: candidate
      });
      res.json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(500).json({ error: "Failed to create candidate" });
    }
  });
  app2.put("/api/candidates/:id", requireAuth, upload.array("files", 5), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("=== UPDATE CANDIDATE DEBUG ===");
      console.log("Candidate ID:", id);
      console.log("Body:", req.body);
      console.log("Files:", req.files);
      console.log("==============================");
      const oldCandidate = await storage.getCandidate(id);
      if (!oldCandidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const updates = {};
      if (req.body.fullName) updates.fullName = req.body.fullName;
      if (req.body.email) updates.email = req.body.email;
      if (req.body.phone) updates.phone = req.body.phone;
      if (req.body.city) updates.city = req.body.city;
      if (req.body.source) updates.source = req.body.source;
      if (req.body.notes) updates.notes = req.body.notes;
      if (req.body.status) updates.status = req.body.status;
      if (req.body.rejectionReason) updates.rejectionReason = req.body.rejectionReason;
      if (req.body.rejectionStage !== void 0) updates.rejectionStage = parseInt(req.body.rejectionStage);
      if (req.body.vacancyId && req.body.vacancyId !== "") {
        updates.vacancyId = parseInt(req.body.vacancyId);
      }
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        const firstFile = files[0];
        updates.resumeUrl = `/api/files/${firstFile.filename}`;
      }
      if (req.body.interviewStageChain) {
        const newStageChain = JSON.parse(req.body.interviewStageChain);
        console.log("Updating interview stage chain:", newStageChain);
        await storage.deleteInterviewStagesByCandidate(id);
        for (let i = 0; i < newStageChain.length; i++) {
          const stage = newStageChain[i];
          await storage.createInterviewStage({
            candidateId: id,
            stageIndex: i,
            stageName: stage.stageName,
            interviewerId: stage.interviewerId,
            status: i === (oldCandidate.currentStageIndex || 0) ? "pending" : i < (oldCandidate.currentStageIndex || 0) ? "passed" : "waiting"
          });
        }
        updates.interviewStageChain = newStageChain;
      }
      const candidate = await storage.updateCandidate(id, updates);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPDATE_CANDIDATE",
        entityType: "candidate",
        entityId: id,
        oldValues: [oldCandidate],
        newValues: [candidate]
      });
      broadcastToClients({
        type: "CANDIDATE_UPDATED",
        data: candidate
      });
      res.json(candidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });
  app2.delete("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session.user;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can delete candidates" });
      }
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      await storage.deleteCandidate(id);
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "DELETE_CANDIDATE",
        entityType: "candidate",
        entityId: id,
        oldValues: [candidate]
      });
      broadcastToClients({
        type: "CANDIDATE_DELETED",
        data: {
          id,
          deletedBy: currentUser.fullName,
          candidateName: candidate.fullName
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });
  app2.post("/api/candidates/:id/photo", requireAuth, uploadPhoto.single("photo"), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No photo file provided" });
      }
      const photoUrl = `/api/files/photos/${req.file.filename}`;
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl
      });
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPLOAD_CANDIDATE_PHOTO",
        entityType: "candidate",
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate]
      });
      broadcastToClients({
        type: "CANDIDATE_PHOTO_UPLOADED",
        data: { candidateId, photoUrl }
      });
      res.json({ success: true, photoUrl });
    } catch (error) {
      console.error("Error uploading candidate photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
  app2.delete("/api/candidates/:id/photo", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.photoUrl) {
        const filename = path.basename(candidate.photoUrl);
        const filePath = path.join("uploads/photos", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl: null
      });
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "DELETE_CANDIDATE_PHOTO",
        entityType: "candidate",
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate]
      });
      broadcastToClients({
        type: "CANDIDATE_PHOTO_DELETED",
        data: { candidateId }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });
  app2.put("/api/candidates/:id/dismiss", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dismissalReason, dismissalDate } = req.body;
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can dismiss candidates" });
      }
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.status !== "hired") {
        return res.status(400).json({ error: "Only hired candidates can be dismissed" });
      }
      const dismissedCandidate = await storage.dismissCandidate(id, dismissalReason, new Date(dismissalDate));
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "DISMISS_CANDIDATE",
        entityType: "candidate",
        entityId: id,
        oldValues: [candidate],
        newValues: [dismissedCandidate]
      });
      broadcastToClients({
        type: "CANDIDATE_DISMISSED",
        data: dismissedCandidate
      });
      res.json(dismissedCandidate);
    } catch (error) {
      console.error("Error dismissing candidate:", error);
      res.status(500).json({ error: "Failed to dismiss candidate" });
    }
  });
  app2.post("/api/test/create-documentation-candidate", requireAuth, async (req, res) => {
    try {
      let vacancies2 = await storage.getVacancies();
      let vacancy;
      if (vacancies2.length === 0) {
        const vacancyData = {
          title: "Test Position",
          department: "IT",
          description: "Sample position for testing documentation workflow",
          requirements: "Basic requirements",
          location: "Remote",
          status: "active",
          createdBy: req.session.user.id
        };
        vacancy = await storage.createVacancy(vacancyData);
      } else {
        vacancy = vacancies2[0];
      }
      const candidateData = {
        fullName: "Test Candidate For Documentation",
        email: "test.candidate@example.com",
        phone: "+1234567890",
        city: "Test City",
        vacancyId: vacancy.id,
        status: "documentation",
        source: "test_data",
        createdBy: req.session.user.id
      };
      const candidate = await storage.createCandidate(candidateData);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_TEST_DOCUMENTATION_CANDIDATE",
        entityType: "candidate",
        entityId: candidate.id,
        newValues: [candidate]
      });
      broadcastToClients({
        type: "TEST_DOCUMENTATION_CANDIDATE_CREATED",
        data: candidate
      });
      res.json({ success: true, candidate, vacancy });
    } catch (error) {
      console.error("Error creating test documentation candidate:", error);
      res.status(500).json({ error: "Failed to create test documentation candidate" });
    }
  });
  app2.get("/api/documentation/candidates", requireAuth, async (req, res) => {
    try {
      const candidates2 = await storage.getCandidatesByStatus("documentation");
      res.json(candidates2);
    } catch (error) {
      console.error("Failed to fetch documentation candidates:", error);
      res.status(500).json({ error: "Failed to fetch documentation candidates" });
    }
  });
  app2.post("/api/documentation/candidates", requireAuth, upload.array("documents", 10), async (req, res) => {
    try {
      console.log("Creating manual documentation candidate:", req.body);
      console.log("Files:", req.files);
      if (!req.body.fullName) {
        return res.status(400).json({ error: "Full name is required" });
      }
      if (!req.body.vacancyId) {
        return res.status(400).json({ error: "Vacancy is required" });
      }
      const candidateData = {
        fullName: req.body.fullName,
        email: req.body.email || "",
        phone: req.body.phone || "",
        city: req.body.city || "",
        vacancyId: parseInt(req.body.vacancyId),
        status: "documentation",
        source: "manual_documentation",
        createdBy: req.session.user.id
      };
      const candidate = await storage.createCandidate(candidateData);
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        for (const file of files) {
          await storage.createDocumentationAttachment({
            candidateId: candidate.id,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session.user.id
          });
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_DOCUMENTATION_CANDIDATE",
        entityType: "candidate",
        entityId: candidate.id,
        newValues: [candidate]
      });
      broadcastToClients({
        type: "DOCUMENTATION_CANDIDATE_CREATED",
        data: candidate
      });
      res.json(candidate);
    } catch (error) {
      console.error("Error creating documentation candidate:", error);
      res.status(500).json({ error: "Failed to create documentation candidate" });
    }
  });
  app2.put("/api/documentation/candidates/:id/upload", requireAuth, upload.array("documents", 10), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.status !== "documentation") {
        return res.status(400).json({ error: "Candidate is not in documentation status" });
      }
      const attachments = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        for (const file of files) {
          const attachment = await storage.createDocumentationAttachment({
            candidateId,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session.user.id
          });
          attachments.push(attachment);
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPLOAD_DOCUMENTATION",
        entityType: "candidate",
        entityId: candidateId,
        newValues: attachments
      });
      broadcastToClients({
        type: "DOCUMENTATION_UPLOADED",
        data: { candidateId, attachments }
      });
      res.json({ success: true, attachments });
    } catch (error) {
      console.error("Error uploading documentation:", error);
      res.status(500).json({ error: "Failed to upload documentation" });
    }
  });
  app2.get("/api/documentation/candidates/:id/attachments", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const attachments = await storage.getDocumentationAttachments(candidateId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching documentation attachments:", error);
      res.status(500).json({ error: "Failed to fetch documentation attachments" });
    }
  });
  app2.delete("/api/documentation/attachments/:id", requireAuth, async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      const attachment = await storage.getDocumentationAttachment(attachmentId);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      const filePath = path.join("uploads", attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await storage.deleteDocumentationAttachment(attachmentId);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "DELETE_DOCUMENTATION_ATTACHMENT",
        entityType: "documentation_attachment",
        entityId: attachmentId,
        oldValues: [attachment]
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting documentation attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });
  app2.put("/api/documentation/candidates/:id/complete", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.status !== "documentation") {
        return res.status(400).json({ error: "Candidate is not in documentation status" });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "hired"
      });
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "COMPLETE_DOCUMENTATION",
        entityType: "candidate",
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate]
      });
      broadcastToClients({
        type: "CANDIDATE_HIRED",
        data: updatedCandidate
      });
      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error completing documentation:", error);
      res.status(500).json({ error: "Failed to complete documentation" });
    }
  });
  app2.put("/api/candidates/:id/move-to-documentation", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.status !== "active") {
        return res.status(400).json({ error: "Candidate is not in active status" });
      }
      const stages = await storage.getInterviewStagesByCandidate(candidateId);
      const allPassed = stages.every((stage) => stage.status === "passed");
      if (!allPassed) {
        return res.status(400).json({ error: "Not all interview stages have been passed" });
      }
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "documentation"
      });
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "MOVE_TO_DOCUMENTATION",
        entityType: "candidate",
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate]
      });
      broadcastToClients({
        type: "CANDIDATE_MOVED_TO_DOCUMENTATION",
        data: updatedCandidate
      });
      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error moving candidate to documentation:", error);
      res.status(500).json({ error: "Failed to move candidate to documentation" });
    }
  });
  app2.get("/api/bot/vacancies", async (req, res) => {
    try {
      const botToken = req.headers["x-bot-token"] || req.query.token;
      if (!botToken || botToken !== process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(401).json({ error: "Invalid bot token" });
      }
      const vacancies2 = await storage.getVacancies();
      const activeVacancies = vacancies2.filter((v) => v.status === "active").map((v) => ({
        id: v.id,
        title: v.title,
        department: v.department,
        description: v.description
      }));
      res.json(activeVacancies);
    } catch (error) {
      console.error("Bot - Error fetching vacancies:", error);
      res.status(500).json({ error: "Failed to fetch vacancies" });
    }
  });
  app2.post("/api/bot/candidates", upload.array("files", 5), async (req, res) => {
    try {
      console.log("Bot API - Request received");
      console.log("Bot API - Headers:", req.headers);
      console.log("Bot API - Body:", req.body);
      console.log("Bot API - Files:", req.files);
      const botToken = req.headers["x-bot-token"] || req.query.token;
      console.log("Bot API - Token validation:", botToken ? "RECEIVED" : "MISSING");
      if (!botToken || botToken !== process.env.TELEGRAM_BOT_TOKEN) {
        console.log("Bot API - Token validation failed");
        return res.status(401).json({ error: "Invalid bot token" });
      }
      console.log("Bot - Creating candidate with data:", req.body);
      console.log("Bot - Files received:", req.files);
      if (!req.body.fullName || !req.body.phone || !req.body.city || !req.body.vacancyId) {
        console.log("Bot API - Missing required fields");
        return res.status(400).json({
          error: "Missing required fields",
          details: {
            fullName: !!req.body.fullName,
            phone: !!req.body.phone,
            city: !!req.body.city,
            vacancyId: !!req.body.vacancyId
          }
        });
      }
      const processedData = {
        fullName: req.body.fullName,
        email: req.body.email || null,
        // Optional for Telegram candidates
        phone: req.body.phone,
        city: req.body.city,
        vacancyId: parseInt(req.body.vacancyId),
        source: "\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u043C",
        currentStageIndex: 0,
        telegramChatId: req.body.telegramChatId ? parseInt(req.body.telegramChatId) : null,
        createdBy: 1
        // Default admin user for bot-created candidates
      };
      console.log("Bot - Processed candidate data:", processedData);
      const candidateData = insertCandidateSchema.parse(processedData);
      console.log("Bot - Schema validation passed");
      let resumeUrl = "";
      let resumeFilename = "";
      let parsedResumeData = null;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        console.log("Bot API - Processing file upload");
        const files = req.files;
        const firstFile = files[0];
        resumeUrl = `/api/files/${firstFile.filename}`;
        resumeFilename = firstFile.originalname;
        console.log("Bot API - File processed:", { resumeUrl, resumeFilename });
        try {
          const { extractTextFromFile: extractTextFromFile2, parseResumeWithAI: parseResumeWithAI2 } = await Promise.resolve().then(() => (init_resumeParser(), resumeParser_exports));
          const resumeText = await extractTextFromFile2(firstFile.path);
          parsedResumeData = await parseResumeWithAI2(resumeText);
          console.log("Bot API - Resume parsing completed");
        } catch (parseError) {
          console.error("Bot - Resume parsing failed:", parseError);
        }
      }
      console.log("Bot API - Creating candidate in database");
      const candidate = await storage.createCandidate({
        ...candidateData,
        resumeUrl,
        resumeFilename,
        parsedResumeData
      });
      console.log("Bot API - Candidate created, ID:", candidate.id);
      await storage.createAuditLog({
        userId: 1,
        // Bot actions logged under admin
        action: "CREATE_CANDIDATE",
        entityType: "candidate",
        entityId: candidate.id,
        newValues: [{ ...candidate, source: "Telegram Bot" }]
      });
      broadcastToClients({
        type: "CANDIDATE_CREATED",
        data: { ...candidate, source: "Telegram Bot" }
      });
      console.log("Bot - Candidate created successfully:", candidate.id);
      res.json({ success: true, candidateId: candidate.id });
    } catch (error) {
      console.error("Bot API - Error creating candidate:");
      console.error("Bot API - Error message:", error.message);
      console.error("Bot API - Error stack:", error.stack);
      res.status(500).json({ error: "Failed to create candidate", details: error.message });
    }
  });
  app2.get("/api/bot/candidates/telegram/:chatId", async (req, res) => {
    try {
      const botToken = req.headers["x-bot-token"] || req.query.token;
      if (!botToken || botToken !== process.env.TELEGRAM_BOT_TOKEN) {
        console.log("Bot API - Invalid bot token provided");
        return res.status(401).json({ error: "Invalid bot token" });
      }
      const chatIdParam = req.params.chatId;
      console.log("Bot API - Fetching candidate by telegram chat ID:", chatIdParam);
      if (!chatIdParam || chatIdParam.trim() === "") {
        console.error("Bot API - Empty chat ID provided");
        return res.status(400).json({ error: "Chat ID parameter is required" });
      }
      const chatId = parseInt(chatIdParam, 10);
      if (isNaN(chatId)) {
        console.error("Bot API - Invalid chat ID provided:", chatIdParam);
        return res.status(400).json({ error: "Invalid chat ID format. Must be a number." });
      }
      if (chatId <= 0) {
        console.error("Bot API - Invalid chat ID (non-positive):", chatId);
        return res.status(400).json({ error: "Invalid chat ID. Must be a positive number." });
      }
      if (!process.env.DATABASE_URL) {
        console.error("Bot API - Database not configured");
        return res.status(503).json({
          error: "Service temporarily unavailable",
          details: "Database not configured",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      console.log("Bot API - Searching for candidate with chat ID:", chatId);
      const candidate = await storage.getCandidateByTelegramId(chatId);
      if (!candidate) {
        console.log("Bot API - Candidate not found for chat ID:", chatId);
        return res.status(404).json({
          error: "Candidate not found",
          chatId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      console.log("Bot API - Candidate found:", candidate.id, candidate.fullName, "Status:", candidate.status);
      res.json({
        success: true,
        candidate,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Bot API - Error fetching candidate by telegram ID:", error);
      console.error("Bot API - Error name:", error.name);
      console.error("Bot API - Error message:", error.message);
      if (error.name === "DatabaseConnectionError") {
        console.error("Bot API - Database connection error detected");
        return res.status(503).json({
          error: "Database connection error",
          details: "Unable to connect to database. Please try again later.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          retryAfter: "60"
          // Suggest retry after 60 seconds
        });
      }
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Bot API - Network connection error detected");
        return res.status(503).json({
          error: "Service temporarily unavailable",
          details: "Database connection failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          retryAfter: "30"
        });
      }
      if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
        console.error("Bot API - Timeout error detected");
        return res.status(504).json({
          error: "Request timeout",
          details: "Database query took too long",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          retryAfter: "30"
        });
      }
      res.status(500).json({
        error: "Failed to fetch candidate",
        details: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.put("/api/bot/candidates/:id", upload.array("files", 5), async (req, res) => {
    try {
      const botToken = req.headers["x-bot-token"] || req.query.token;
      if (!botToken || botToken !== process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(401).json({ error: "Invalid bot token" });
      }
      const id = parseInt(req.params.id);
      console.log("Bot API - Updating candidate:", id, req.body);
      const oldCandidate = await storage.getCandidate(id);
      if (!oldCandidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const updates = {};
      if (req.body.fullName) updates.fullName = req.body.fullName;
      if (req.body.phone) updates.phone = req.body.phone;
      if (req.body.city) updates.city = req.body.city;
      if (req.body.vacancyId) updates.vacancyId = parseInt(req.body.vacancyId);
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        const firstFile = files[0];
        updates.resumeUrl = `/api/files/${firstFile.filename}`;
        updates.resumeFilename = firstFile.originalname;
        try {
          const { extractTextFromFile: extractTextFromFile2, parseResumeWithAI: parseResumeWithAI2 } = await Promise.resolve().then(() => (init_resumeParser(), resumeParser_exports));
          const resumeText = await extractTextFromFile2(firstFile.path);
          updates.parsedResumeData = await parseResumeWithAI2(resumeText);
        } catch (parseError) {
          console.error("Bot - Resume parsing failed:", parseError);
        }
      }
      const candidate = await storage.updateCandidate(id, updates);
      await storage.createAuditLog({
        userId: 1,
        // Bot actions logged under admin
        action: "UPDATE_CANDIDATE",
        entityType: "candidate",
        entityId: id,
        oldValues: [oldCandidate],
        newValues: [candidate]
      });
      broadcastToClients({
        type: "CANDIDATE_UPDATED",
        data: candidate
      });
      res.json({ success: true, candidate });
    } catch (error) {
      console.error("Bot API - Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });
  app2.post("/api/interview-stages", requireAuth, async (req, res) => {
    try {
      const stageData = insertInterviewStageSchema.parse(req.body);
      const stage = await storage.createInterviewStage(stageData);
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CREATE_INTERVIEW_STAGE",
        entityType: "interview_stage",
        entityId: stage.id,
        newValues: [stage]
      });
      res.json(stage);
    } catch (error) {
      res.status(500).json({ error: "Failed to create interview stage" });
    }
  });
  app2.put("/api/interview-stages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      console.log("Updating interview stage:", id, updates);
      if ((updates.status === "passed" || updates.status === "failed") && (!updates.comments || updates.comments.trim() === "")) {
        return res.status(400).json({ error: "Feedback is required when completing interview stages" });
      }
      const stage = await storage.updateInterviewStage(id, updates);
      const relatedInterviews = await storage.getInterviewsByStage(id);
      if (relatedInterviews.length > 0) {
        const interviewOutcome = updates.status === "passed" ? "passed" : updates.status === "failed" ? "failed" : null;
        if (interviewOutcome) {
          for (const interview of relatedInterviews) {
            await storage.updateInterview(interview.id, {
              outcome: interviewOutcome,
              status: "completed",
              notes: updates.comments || ""
            });
          }
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPDATE_INTERVIEW_STAGE",
        entityType: "interview_stage",
        entityId: id,
        newValues: [stage]
      });
      broadcastToClients({
        type: "INTERVIEW_STAGE_UPDATED",
        data: stage
      });
      res.json(stage);
    } catch (error) {
      console.error("Update interview stage error:", error);
      res.status(500).json({ error: "Failed to update interview stage" });
    }
  });
  app2.get("/api/interviews", requireAuth, async (req, res) => {
    try {
      const { start, end, interviewerId, stageId } = req.query;
      let interviews2;
      if (start && end) {
        interviews2 = await storage.getInterviewsByDateRange(
          new Date(start),
          new Date(end)
        );
      } else if (interviewerId) {
        interviews2 = await storage.getInterviewsByInterviewer(
          parseInt(interviewerId)
        );
      } else if (stageId) {
        interviews2 = await storage.getInterviewsByStage(
          parseInt(stageId)
        );
      } else {
        interviews2 = await storage.getInterviews();
      }
      res.json(interviews2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interviews" });
    }
  });
  app2.get("/api/interviews/interviewer/:interviewerId", requireAuth, async (req, res) => {
    try {
      const interviewerId = parseInt(req.params.interviewerId);
      if (isNaN(interviewerId)) {
        return res.status(400).json({ error: "Invalid interviewer ID" });
      }
      const interviews2 = await storage.getInterviewsByInterviewer(interviewerId);
      res.json(interviews2);
    } catch (error) {
      console.error("Error fetching interviews by interviewer:", error);
      res.status(500).json({ error: "Failed to fetch interviews" });
    }
  });
  app2.post("/api/interviews", requireAuth, async (req, res) => {
    try {
      const { stageId, candidateId, interviewerId, scheduledAt, duration, notes } = req.body;
      console.log("Creating interview:", req.body);
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      if (candidate.createdBy !== req.session.user.id) {
        return res.status(403).json({ error: "Only the responsible manager can schedule interviews" });
      }
      const interview = await storage.scheduleInterview(
        stageId,
        interviewerId,
        new Date(scheduledAt),
        duration || 30
      );
      const interviewer = await storage.getUser(interviewerId);
      if (interviewer && candidate) {
        await emailService.sendInterviewNotification(
          interviewer.email,
          candidate.fullName,
          new Date(scheduledAt),
          interviewer.fullName
        );
        if (candidate.telegramChatId) {
          try {
            const { sendInterviewNotification: sendInterviewNotification2 } = await Promise.resolve().then(() => (init_telegramBot(), telegramBot_exports));
            await sendInterviewNotification2(
              candidate.telegramChatId,
              {
                scheduledAt,
                interviewer: interviewer.fullName
              },
              "ru"
              // Default language, could be stored in candidate profile
            );
            console.log("Telegram notification sent to candidate:", candidate.telegramChatId);
          } catch (error) {
            console.error("Failed to send Telegram notification:", error);
          }
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "SCHEDULE_INTERVIEW",
        entityType: "interview",
        entityId: interview.id,
        newValues: [interview]
      });
      broadcastToClients({
        type: "INTERVIEW_SCHEDULED",
        data: interview
      });
      res.json(interview);
    } catch (error) {
      console.error("Schedule interview error:", error);
      res.status(500).json({ error: "Failed to schedule interview" });
    }
  });
  app2.put("/api/interviews/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      console.log("Updating interview:", id, updates);
      const isReschedule = updates.scheduledAt && updates.scheduledAt !== "";
      let oldInterview = null;
      if (isReschedule) {
        oldInterview = await storage.getInterview(id);
      }
      const interview = await storage.updateInterview(id, updates);
      if (isReschedule && oldInterview) {
        const candidate = await storage.getCandidate(oldInterview.candidateId);
        const interviewer = await storage.getUser(oldInterview.interviewerId);
        if (candidate && candidate.telegramChatId) {
          try {
            const { sendRescheduleNotification: sendRescheduleNotification2 } = await Promise.resolve().then(() => (init_telegramBot(), telegramBot_exports));
            await sendRescheduleNotification2(
              candidate.telegramChatId,
              {
                oldDateTime: oldInterview.scheduledAt,
                newDateTime: updates.scheduledAt,
                interviewer: interviewer?.fullName || "HR \u043E\u0442\u0434\u0435\u043B",
                stageName: oldInterview.stage?.stageName || "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435"
              },
              "ru"
              // Default language
            );
            console.log("Telegram reschedule notification sent to candidate:", candidate.telegramChatId);
          } catch (error) {
            console.error("Failed to send Telegram reschedule notification:", error);
          }
        }
        await storage.createNotification({
          userId: oldInterview.interviewerId,
          type: "interview_rescheduled",
          title: "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E",
          message: `\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0441 ${candidate?.fullName || "\u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u043C"} \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 ${new Date(updates.scheduledAt).toLocaleString("ru-RU")}`,
          relatedEntityType: "interview",
          relatedEntityId: interview.id,
          isRead: false
        });
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: isReschedule ? "RESCHEDULE_INTERVIEW" : "UPDATE_INTERVIEW",
        entityType: "interview",
        entityId: id,
        newValues: [interview]
      });
      broadcastToClients({
        type: isReschedule ? "INTERVIEW_RESCHEDULED" : "INTERVIEW_UPDATED",
        data: interview
      });
      res.json(interview);
    } catch (error) {
      console.error("Update interview error:", error);
      res.status(500).json({ error: "Failed to update interview" });
    }
  });
  app2.get("/api/interview-stages", requireAuth, async (req, res) => {
    try {
      const stages = await storage.getAllInterviewStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interview stages" });
    }
  });
  app2.get("/api/analytics/dashboard", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/analytics/conversion-funnel", requireAnalyticsAccess, async (req, res) => {
    try {
      const funnel = await storage.getConversionFunnel();
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversion funnel" });
    }
  });
  app2.get("/api/analytics/hiring-trends", requireAnalyticsAccess, async (req, res) => {
    try {
      const trends = await storage.getHiringTrends();
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hiring trends" });
    }
  });
  app2.get("/api/analytics/department-stats", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch department stats" });
    }
  });
  app2.get("/api/analytics/time-to-hire", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getTimeToHireStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time to hire stats" });
    }
  });
  app2.get("/api/analytics/rejections-by-stage", requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      let rejections;
      if (month && year) {
        rejections = await storage.getRejectionsByStageByMonth(month, year);
      } else {
        rejections = await storage.getRejectionsByStage();
      }
      res.json(rejections);
    } catch (error) {
      console.error("Error fetching rejections by stage:", error);
      res.status(500).json({ error: "Failed to fetch rejections by stage" });
    }
  });
  app2.get("/api/analytics/dashboard-by-month", requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }
      const stats = await storage.getDashboardStatsByMonth(month, year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats by month:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats by month" });
    }
  });
  app2.get("/api/analytics/conversion-funnel-by-month", requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }
      const funnel = await storage.getConversionFunnelByMonth(month, year);
      res.json(funnel);
    } catch (error) {
      console.error("Error fetching conversion funnel by month:", error);
      res.status(500).json({ error: "Failed to fetch conversion funnel by month" });
    }
  });
  app2.get("/api/analytics/available-periods", requireAnalyticsAccess, async (req, res) => {
    try {
      const periods = await storage.getAvailableDataPeriods();
      res.json(periods);
    } catch (error) {
      console.error("Error fetching available periods:", error);
      res.status(500).json({ error: "Failed to fetch available periods" });
    }
  });
  app2.get("/api/analytics/hired-dismissed-stats", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching hired and dismissed stats:", error);
      res.status(500).json({ error: "Failed to fetch hired and dismissed stats" });
    }
  });
  app2.get("/api/analytics/hired-dismissed-by-month", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStatsByMonth();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching hired and dismissed stats by month:", error);
      res.status(500).json({ error: "Failed to fetch hired and dismissed stats by month" });
    }
  });
  app2.get("/api/analytics/hired-dismissed-by-year", requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStatsByYear();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching hired and dismissed stats by year:", error);
      res.status(500).json({ error: "Failed to fetch hired and dismissed stats by year" });
    }
  });
  app2.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments2 = await storage.getDepartments();
      res.json(departments2);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });
  app2.post("/api/departments", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Name is required" });
      }
      const department = await storage.createDepartment({
        name: name.trim(),
        description: description?.trim() || null
      });
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Department with this name already exists" });
      }
      res.status(500).json({ error: "Failed to create department" });
    }
  });
  app2.put("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Name is required" });
      }
      const department = await storage.updateDepartment(id, {
        name: name.trim(),
        description: description?.trim() || null
      });
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Department with this name already exists" });
      }
      res.status(500).json({ error: "Failed to update department" });
    }
  });
  app2.delete("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vacancies2 = await storage.getVacancies();
      const departmentInUse = vacancies2.some((v) => v.departmentId === id);
      if (departmentInUse) {
        return res.status(400).json({
          error: "Cannot delete department that is used by vacancies"
        });
      }
      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });
  app2.put("/api/interviews/:id/outcome", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { outcome, notes } = req.body;
      if (!notes || notes.trim() === "") {
        return res.status(400).json({ error: "Feedback is required for interview outcomes" });
      }
      const interview = await storage.updateInterviewOutcome(id, outcome, notes);
      if (interview.stageId) {
        const stageStatus = outcome === "passed" ? "passed" : outcome === "failed" ? "failed" : "pending";
        await storage.updateInterviewStage(interview.stageId, {
          status: stageStatus,
          completedAt: /* @__PURE__ */ new Date(),
          comments: notes
        });
        if (outcome === "passed") {
          const stage = await storage.getInterviewStage(interview.stageId);
          if (stage && interview.candidateId) {
            const nextStageIndex = stage.stageIndex + 1;
            await storage.updateCandidate(interview.candidateId, {
              currentStageIndex: nextStageIndex
            });
          }
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "UPDATE_INTERVIEW_OUTCOME",
        entityType: "interview",
        entityId: id,
        newValues: [{ outcome, notes }]
      });
      broadcastToClients({
        type: "INTERVIEW_COMPLETED",
        data: interview
      });
      res.json(interview);
    } catch (error) {
      console.error("Update interview outcome error:", error);
      res.status(500).json({ error: "Failed to update interview outcome" });
    }
  });
  app2.put("/api/interviews/:id/reschedule", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newDateTime } = req.body;
      console.log("Rescheduling interview:", { id, newDateTime });
      const interviewDetails = await storage.getInterview(id);
      if (!interviewDetails) {
        return res.status(404).json({ error: "Interview not found" });
      }
      const interview = await storage.rescheduleInterview(id, new Date(newDateTime));
      const candidate = await storage.getCandidate(interviewDetails.candidateId);
      const interviewer = await storage.getUser(interviewDetails.interviewerId);
      if (candidate && candidate.telegramChatId) {
        try {
          const { sendRescheduleNotification: sendRescheduleNotification2 } = await Promise.resolve().then(() => (init_telegramBot(), telegramBot_exports));
          await sendRescheduleNotification2(
            candidate.telegramChatId,
            {
              oldDateTime: interviewDetails.scheduledAt,
              newDateTime,
              interviewer: interviewer?.fullName || "HR \u043E\u0442\u0434\u0435\u043B",
              stageName: interviewDetails.stage?.stageName || "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435"
            },
            "ru"
            // Default language
          );
          console.log("Telegram reschedule notification sent to candidate:", candidate.telegramChatId);
        } catch (error) {
          console.error("Failed to send Telegram reschedule notification:", error);
        }
      }
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "RESCHEDULE_INTERVIEW",
        entityType: "interview",
        entityId: id,
        newValues: [{ oldDateTime: interviewDetails.scheduledAt, newDateTime }]
      });
      broadcastToClients({
        type: "INTERVIEW_RESCHEDULED",
        data: interview
      });
      res.json(interview);
    } catch (error) {
      console.error("Reschedule interview error:", error);
      res.status(500).json({ error: "Failed to reschedule interview" });
    }
  });
  app2.get("/api/interview-stages/candidate/:candidateId", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const stages = await storage.getInterviewStagesByCandidate(candidateId);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interview stages" });
    }
  });
  app2.put("/api/interview-stages/:id/comments", requireAuth, async (req, res) => {
    try {
      const stageId = parseInt(req.params.id);
      const { comments } = req.body;
      const currentUserId = req.session.user.id;
      const currentUser = req.session.user;
      const stage = await storage.getInterviewStage(stageId);
      if (!stage) {
        return res.status(404).json({ error: "Interview stage not found" });
      }
      if (stage.interviewerId !== currentUserId && currentUser.role !== "admin") {
        return res.status(403).json({ error: "You can only edit your own feedback" });
      }
      const updatedStage = await storage.updateInterviewStage(stageId, {
        comments
      });
      await storage.createAuditLog({
        userId: currentUserId,
        action: "UPDATE_INTERVIEW_STAGE_COMMENTS",
        entityType: "interview_stage",
        entityId: stageId,
        oldValues: [{ comments: stage.comments }],
        newValues: [{ comments }]
      });
      broadcastToClients({
        type: "INTERVIEW_STAGE_COMMENTS_UPDATED",
        data: {
          stageId,
          candidateId: stage.candidateId,
          comments,
          updatedBy: currentUser.fullName
        }
      });
      res.json(updatedStage);
    } catch (error) {
      console.error("Update interview stage comments error:", error);
      res.status(500).json({ error: "Failed to update interview stage comments" });
    }
  });
  app2.post("/api/interviews/schedule", requireAuth, async (req, res) => {
    try {
      const { stageId, interviewerId, scheduledAt, duration } = req.body;
      const interview = await storage.scheduleInterview(
        parseInt(stageId),
        parseInt(interviewerId),
        new Date(scheduledAt),
        duration || 30
      );
      broadcastToClients({
        type: "INTERVIEW_SCHEDULED",
        data: interview
      });
      res.json(interview);
    } catch (error) {
      console.error("Schedule interview error:", error);
      res.status(400).json({ error: error.message || "Failed to schedule interview" });
    }
  });
  app2.get("/api/analytics/funnel", requireAnalyticsAccess, async (req, res) => {
    try {
      const funnel = await storage.getConversionFunnel();
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversion funnel" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications2 = await storage.getNotificationsByUser(req.session.user.id);
      res.json(notifications2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUserId = req.session.user.id;
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== currentUserId) {
        return res.status(404).json({ error: "Notification not found" });
      }
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });
  app2.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session.user.id;
      const conversations = await storage.getConversationsByUser(currentUserId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app2.get("/api/messages/:receiverId", requireAuth, async (req, res) => {
    try {
      const receiverId = parseInt(req.params.receiverId);
      const currentUserId = req.session.user.id;
      console.log("Fetching messages for:", { currentUserId, receiverId });
      if (isNaN(receiverId)) {
        return res.status(400).json({ error: "Invalid receiver ID" });
      }
      const messages2 = await storage.getMessagesBetweenUsers(currentUserId, receiverId);
      console.log("Found messages:", messages2?.length || 0);
      const result = Array.isArray(messages2) ? messages2 : [];
      res.json(result);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  app2.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.session.user.id;
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Receiver ID and content are required" });
      }
      const message = await storage.createMessage({
        senderId,
        receiverId: parseInt(receiverId),
        content: content.trim()
      });
      broadcastToClients({
        type: "NEW_MESSAGE",
        data: message
      });
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app2.put("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const currentUserId = req.session.user.id;
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid message ID" });
      }
      const message = await storage.markMessageAsRead(messageId, currentUserId);
      res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });
  app2.post("/api/users/online-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { isOnline } = req.body;
      await storage.updateUserOnlineStatus(userId, isOnline);
      broadcastToClients({
        type: "USER_STATUS_CHANGED",
        data: { userId, isOnline, lastSeenAt: /* @__PURE__ */ new Date() }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating online status:", error);
      res.status(500).json({ error: "Failed to update online status" });
    }
  });
  app2.get("/api/users/online-status", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getUsersWithOnlineStatus();
      res.json(users2);
    } catch (error) {
      console.error("Error fetching online status:", error);
      res.status(500).json({ error: "Failed to fetch online status" });
    }
  });
  app2.get("/api/files/photos/:filename", requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join("uploads/photos", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Photo not found" });
    }
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Length", stat.size);
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png"
    };
    const contentType = contentTypes[ext] || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
  app2.get("/api/files/:filename", requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join("uploads", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", stat.size);
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".txt": "text/plain"
    };
    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
  app2.use("/uploads", express.static("uploads"));
  const httpServer = createServer(app2);
  const userSocketMap = /* @__PURE__ */ new Map();
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws, req) => {
    wsClients.add(ws);
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "USER_CONNECT" && message.userId) {
          userSocketMap.set(message.userId, ws);
          await storage.updateUserOnlineStatus(message.userId, true);
          broadcastToClients({
            type: "USER_STATUS_CHANGED",
            data: { userId: message.userId, isOnline: true, lastSeenAt: /* @__PURE__ */ new Date() }
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", async () => {
      wsClients.delete(ws);
      for (const [userId, socket] of userSocketMap.entries()) {
        if (socket === ws) {
          userSocketMap.delete(userId);
          await storage.updateUserOnlineStatus(userId, false);
          broadcastToClients({
            type: "USER_STATUS_CHANGED",
            data: { userId, isOnline: false, lastSeenAt: /* @__PURE__ */ new Date() }
          });
          break;
        }
      }
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import "dotenv/config";
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/initDatabase.ts
var createTablesSQL = `
-- RecruitmentTracker Database Schema
-- This script creates all necessary tables for the recruitment system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    plain_password TEXT,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth TIMESTAMP,
    position VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    has_report_access BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location VARCHAR(255),
    description TEXT,
    requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    hired_candidate_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(255),
    vacancy_id INTEGER REFERENCES vacancies(id),
    resume_url TEXT,
    resume_filename VARCHAR(255),
    source VARCHAR(100),
    telegram_chat_id BIGINT,
    interview_stage_chain JSONB,
    current_stage_index INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    rejection_reason TEXT,
    rejection_stage INTEGER,
    parsed_resume_data JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_stages table
CREATE TABLE IF NOT EXISTS interview_stages (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    stage_index INTEGER NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    interviewer_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    comments TEXT,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    stage_id INTEGER REFERENCES interview_stages(id),
    candidate_id INTEGER REFERENCES candidates(id),
    interviewer_id INTEGER REFERENCES users(id),
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    meeting_link TEXT,
    notes TEXT,
    outcome VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy_id ON candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_candidates_telegram_chat_id ON candidates(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_interview_stages_candidate_id ON interview_stages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
`;
var addConstraintsSQL = `
-- Add foreign key constraint for hired_candidate_id after candidates table is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vacancies_hired_candidate'
    ) THEN
        ALTER TABLE vacancies 
        ADD CONSTRAINT fk_vacancies_hired_candidate 
        FOREIGN KEY (hired_candidate_id) REFERENCES candidates(id);
    END IF;
END $$;
`;
var insertDefaultDataSQL = `
-- Insert default admin users
INSERT INTO users (email, password, plain_password, full_name, role, is_active) 
VALUES 
    ('admin@recruitpro.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123', 'Administrator', 'admin', true),
    ('hr@recruitpro.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'hr123', 'HR Manager', 'hr_manager', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, description) 
VALUES 
    ('IT', 'Information Technology Department'),
    ('HR', 'Human Resources Department'),
    ('Sales', 'Sales Department'),
    ('Marketing', 'Marketing Department'),
    ('Finance', 'Finance Department')
ON CONFLICT (name) DO NOTHING;

-- Insert sample vacancy (commented out - uncomment if you need sample data)
-- INSERT INTO vacancies (title, department, status, created_by) 
-- SELECT '\u041C\u0435\u0434 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043B\u044C', 'Sales', 'active', u.id
-- FROM users u 
-- WHERE u.email = 'admin@recruitpro.com'
-- ON CONFLICT DO NOTHING;
`;
async function initializeDatabase() {
  if (!pool) {
    console.log("No database connection available. Skipping database initialization.");
    return;
  }
  try {
    console.log("\u{1F527} Initializing database schema...");
    console.log("\u{1F504} Updating existing table schemas...");
    await updateExistingTables();
    console.log("\u{1F4CB} Creating tables...");
    await pool.query(createTablesSQL);
    console.log("\u{1F517} Adding foreign key constraints...");
    await pool.query(addConstraintsSQL);
    console.log("\u{1F4BE} Inserting default data...");
    await pool.query(insertDefaultDataSQL);
    console.log("\u2705 Database initialization completed successfully!");
    const result = await pool.query("SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1", ["public"]);
    console.log(`\u{1F4CA} Database contains ${result.rows[0].table_count} tables`);
  } catch (error) {
    console.error("\u274C Database initialization failed:");
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);
    console.log("\u26A0\uFE0F  Server will continue running in database-less mode");
  }
}
async function updateExistingTables() {
  try {
    await pool.query(`
      ALTER TABLE candidates 
      ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
    `);
    await pool.query(`
      ALTER TABLE candidates 
      ALTER COLUMN email DROP NOT NULL;
    `);
    console.log("\u2705 Table schemas updated successfully");
  } catch (error) {
    console.log("\u2139\uFE0F  Table update info:", error.message);
  }
}
async function checkDatabaseConnection() {
  if (!pool) {
    return false;
  }
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

// server/index.ts
var app = express3();
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://192.168.1.164:5000",
    req.headers.origin
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");
  res.header("Access-Control-Expose-Headers", "Set-Cookie");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  if (process.env.DATABASE_URL) {
    log("\u{1F50D} Checking database connection...");
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      log("\u2705 Database connection successful");
      log("\u{1F527} Initializing database schema and data...");
      await initializeDatabase();
    } else {
      log("\u274C Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.");
      log("\u26A0\uFE0F  Server will continue in database-less mode.");
    }
  } else {
    log("\u26A0\uFE0F  DATABASE_URL is not set. Skipping database initialization.");
    log("\u{1F4D6} Please set DATABASE_URL in .env file for full functionality.");
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    log("Initializing Telegram bot...");
    try {
      await Promise.resolve().then(() => (init_telegramBot(), telegramBot_exports));
      log("\u{1F916} Telegram bot started successfully!");
    } catch (error) {
      log("Failed to start Telegram bot:", error);
    }
  } else {
    log("TELEGRAM_BOT_TOKEN is not set. Skipping Telegram bot initialization.");
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "0.0.0.0";
  server.listen({
    port,
    host
  }, () => {
    log(`serving on http://${host}:${port}`);
    if (host === "0.0.0.0") {
      log(`Public access available at http://192.168.1.164:${port}`);
    }
  });
})();
