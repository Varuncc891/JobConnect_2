import axios from 'axios';
import FormData from 'form-data';
import pdf from 'pdf-parse';

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  address?: string;
  skills: string[];
  experience: { company: string; role: string; duration: string }[];
  education: { degree: string; institution: string; year: string }[];
}

export class ResumeParserService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.APILAYER_API_KEY || '';
    this.apiUrl = process.env.APILAYER_API_URL || 'https://api.apilayer.com/resume_parser/upload';
  }

  async parseResume(apilayerBuffer: Buffer, fallbackBuffer: Buffer, fileName: string): Promise<ParsedResume> {
    if (this.apiKey) {
      try {
        const result = await this.parseWithApilayer(apilayerBuffer, fileName);
        if (result && result.name && result.name !== "Not found") {
          return result;
        }
      } catch {
        console.warn('Apilayer failed, using fallback parser');
      }
    }

    if (fallbackBuffer.length === 0) {
      return this.getEmptyResponse();
    }

    return this.parseWithFallback(fallbackBuffer);
  }

  private async parseWithApilayer(fileBuffer: Buffer, fileName: string): Promise<ParsedResume | null> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName, contentType: 'application/pdf' });

      const response = await axios.post(this.apiUrl, formData, {
        headers: { ...formData.getHeaders(), 'apikey': this.apiKey },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return this.transformApilayerResponse(response.data);
    } catch (error: any) {
      console.error("Apilayer API error:", error.response?.data || error.message);
      return null;
    }
  }

  private async parseWithFallback(fileBuffer: Buffer): Promise<ParsedResume> {
    try {
      const pdfData = await pdf(fileBuffer);
      const text = pdfData.text;

      return {
        name: this.extractName(text) || 'Not found',
        email: this.extractEmail(text) || 'Not found',
        phone: this.extractPhone(text) || 'Not found',
        address: this.extractAddress(text) || '',
        skills: this.extractSkills(text),
        experience: [],
        education: [],
      };
    } catch (error) {
      console.error("Fallback parser failed:", error);
      return this.getEmptyResponse();
    }
  }

  private getEmptyResponse(): ParsedResume {
    return { name: 'Not found', email: 'Not found', phone: 'Not found', address: '', skills: [], experience: [], education: [] };
  }

  private transformApilayerResponse(apiData: any): ParsedResume {
    return {
      name: apiData.name || apiData.full_name || 'Not found',
      email: apiData.email || 'Not found',
      phone: apiData.phone || apiData.mobile_number || 'Not found',
      address: apiData.address || apiData.location || '',
      skills: apiData.skills || [],
      experience: (apiData.experience || []).map((exp: any) => ({
        company: exp.company || '',
        role: exp.position || exp.title || '',
        duration: exp.duration || exp.period || '',
      })),
      education: (apiData.education || []).map((edu: any) => ({
        degree: edu.degree || edu.qualification || '',
        institution: edu.institution || edu.university || '',
        year: edu.year || edu.graduation_year || '',
      })),
    };
  }

  private extractName(text: string): string | null {
    const patterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)/m,
      /(?:name|NAME|Name)[:\s]*([A-Za-z\s]+)/i,
      /([A-Z][a-z]+ [A-Z][a-z]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length > 3 && !name.includes('@')) return name;
      }
    }
    return null;
  }

  private extractEmail(text: string): string | null {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
  }

  private extractPhone(text: string): string | null {
    const match = text.match(/(?:\+?91[-\s]?)?[6-9]\d{9}|\d{3}[-\s]?\d{3}[-\s]?\d{4}/);
    return match ? match[0] : null;
  }

  private extractAddress(text: string): string {
    const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
    for (const line of text.split('\n')) {
      if (cities.some((city) => line.includes(city))) return line.trim();
    }
    return '';
  }

  private extractSkills(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java',
      'MongoDB', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'Git',
      'HTML', 'CSS', 'Tailwind', 'C\\+\\+', 'C#', 'Angular', 'Vue',
      'Express', 'Next.js', 'GraphQL', 'REST API',
    ];

    return commonSkills.filter((skill) =>
      new RegExp('\\b' + skill + '\\b', 'i').test(text)
    );
  }
}