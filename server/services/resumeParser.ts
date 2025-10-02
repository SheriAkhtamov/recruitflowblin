import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  skills?: string[];
  languages?: string[];
}

export async function parseResumeWithAI(resumeText: string): Promise<ParsedResumeData> {
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      temperature: 0.1,
    });

    const parsedData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and clean the parsed data
    return {
      name: parsedData.name || null,
      email: parsedData.email || null,
      phone: parsedData.phone || null,
      location: parsedData.location || null,
      summary: parsedData.summary || null,
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      languages: Array.isArray(parsedData.languages) ? parsedData.languages : [],
    };

  } catch (error) {
    console.error('Error parsing resume with AI:', error);
    throw new Error('Failed to parse resume with AI');
  }
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  // For now, we'll assume the file is already converted to text
  // In a production environment, you might want to use libraries like:
  // - pdf-parse for PDF files
  // - mammoth for DOCX files
  // - or other text extraction libraries
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    
    // For now, return a placeholder for other file types
    // In production, implement proper text extraction
    return `Resume file uploaded: ${path.basename(filePath)}. Text extraction for ${fileExtension} files is not yet implemented.`;
    
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from resume file');
  }
}