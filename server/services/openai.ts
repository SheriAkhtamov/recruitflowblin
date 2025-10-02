import 'dotenv/config';
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  summary: string;
}

export class OpenAIService {
  async parseResume(resumeText: string): Promise<ParsedResumeData> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a resume parsing expert. Extract structured information from the resume text and return it as JSON. Include name, email, phone, skills array, experience array with company/position/duration/description, education array with institution/degree/year, and a brief summary."
          },
          {
            role: "user",
            content: `Parse this resume and return structured JSON data:\n\n${resumeText}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const parsedData = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        skills: parsedData.skills || [],
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        summary: parsedData.summary || '',
      };
    } catch (error) {
      console.error('Failed to parse resume with OpenAI:', error);
      return {
        skills: [],
        experience: [],
        education: [],
        summary: 'Failed to parse resume automatically. Please review manually.',
      };
    }
  }

  async generateInterviewQuestions(candidateData: ParsedResumeData, positionRequirements: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter. Generate relevant interview questions based on the candidate's background and position requirements. Return the questions as a JSON array."
          },
          {
            role: "user",
            content: `Generate 5-8 interview questions for this candidate profile: ${JSON.stringify(candidateData)} applying for a position with these requirements: ${positionRequirements}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return result.questions || [];
    } catch (error) {
      console.error('Failed to generate interview questions:', error);
      return [
        "Tell me about yourself and your experience.",
        "What interests you about this position?",
        "Describe a challenging project you've worked on.",
        "How do you handle working under pressure?",
        "What are your career goals for the next 5 years?"
      ];
    }
  }

  async evaluateCandidate(resumeData: ParsedResumeData, positionRequirements: string): Promise<{
    score: number;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI recruiter evaluating candidate fit. Provide a score (1-100), list of strengths, concerns, and overall recommendation. Return as JSON with score, strengths array, concerns array, and recommendation string."
          },
          {
            role: "user",
            content: `Evaluate this candidate: ${JSON.stringify(resumeData)} for a position requiring: ${positionRequirements}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        score: result.score || 50,
        strengths: result.strengths || [],
        concerns: result.concerns || [],
        recommendation: result.recommendation || 'Requires manual review.',
      };
    } catch (error) {
      console.error('Failed to evaluate candidate:', error);
      return {
        score: 50,
        strengths: [],
        concerns: ['AI evaluation failed'],
        recommendation: 'Manual review required due to AI processing error.',
      };
    }
  }
}

export const openAIService = new OpenAIService();
