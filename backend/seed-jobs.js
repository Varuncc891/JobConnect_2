import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import { Job } from './dist/models/job.model.js';
import { User } from './dist/models/user.model.js';

const jobTitles = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", 
  "DevOps Engineer", "Data Scientist", "UI/UX Designer",
  "Product Manager", "Mobile Developer", "Cloud Architect",
  "QA Engineer", "System Administrator", "Database Administrator",
  "Security Analyst", "Network Engineer", "Scrum Master",
  "Technical Writer", "Business Analyst", "Project Manager",
  "AI Engineer", "Machine Learning Engineer", "React Developer",
  "Node.js Developer", "Python Developer", "Java Developer",
  "iOS Developer", "Android Developer", "Flutter Developer"
];

const categories = [
  "Frontend Web Development", "MERN Stack Development", "Artificial Intelligence",
  "Mobile App Development", "Graphics & Design", "Account & Finance",
  "Video Animation", "Data Entry Operator", "MEAN Stack Development",
  "Backend Development", "DevOps", "Cloud Computing"
];

const cities = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", 
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
  "Gurgaon", "Noida", "Chandigarh", "Bhopal", "Indore"
];

const countries = ["India", "USA", "UK", "Canada", "Australia", "Germany", "Singapore"];

const locations = [
  "Electronic City, Phase 1, Bangalore, Karnataka 560100",
  "HITEC City, Hyderabad, Telangana 500081",
  "Andheri East, Mumbai, Maharashtra 400069",
  "DLF Cyber City, Gurgaon, Haryana 122002",
  "Sector 62, Noida, Uttar Pradesh 201309",
  "Whitefield, Bangalore, Karnataka 560066",
  "Koregaon Park, Pune, Maharashtra 411001",
  "Salt Lake City, Kolkata, West Bengal 700091",
  "Jubilee Hills, Hyderabad, Telangana 500033",
  "Connaught Place, New Delhi, Delhi 110001"
];

// Short descriptions (under 500 chars)
const descriptions = [
  "Looking for an experienced developer to join our dynamic team. You will build scalable web applications using modern frameworks. Must have strong problem-solving skills and ability to work in agile environment.",
  
  "Join our innovative team as a full stack developer. You'll work on cutting-edge projects using MERN stack. Great opportunity for career growth with competitive salary and benefits.",
  
  "We're seeking a talented UI/UX designer to create amazing user experiences. You'll work closely with product and engineering teams to design intuitive interfaces.",
  
  "DevOps engineer needed to manage cloud infrastructure on AWS/Azure. Experience with Docker, Kubernetes, and CI/CD pipelines required. Great work culture and learning opportunities.",
  
  "Data scientist position open for experienced professional. Work on machine learning models and data analytics projects. Strong Python and ML frameworks knowledge required.",
  
  "Mobile developer needed for iOS/Android apps using React Native/Flutter. Build cross-platform applications with beautiful UI and smooth performance.",
  
  "Backend developer with Node.js expertise needed. Design RESTful APIs, work with databases, and ensure high performance. Experience with MongoDB preferred.",
  
  "Frontend developer proficient in React.js needed. Create responsive web applications with modern UI libraries. Knowledge of state management and hooks required.",
  
  "Project manager with tech background needed. Lead agile teams, manage sprints, and deliver high-quality products. PMP certification is a plus.",
  
  "QA engineer needed for manual and automated testing. Experience with Selenium, Jest, and CI/CD pipelines. Strong attention to detail required."
];

const generateSalary = () => {
  const type = Math.random() > 0.5 ? 'fixed' : 'ranged';
  if (type === 'fixed') {
    return { fixedSalary: Math.floor(Math.random() * 2000000) + 400000 };
  } else {
    const from = Math.floor(Math.random() * 1000000) + 300000;
    const to = from + Math.floor(Math.random() * 1000000) + 200000;
    return { salaryFrom: from, salaryTo: to };
  }
};

const seedJobs = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get first employer user
    let employer = await User.findOne({ role: 'Employer' });
    
    if (!employer) {
      console.log('❌ No employer found. Creating a test employer...');
      
      employer = await User.create({
        name: 'Test Employer',
        email: 'employer@test.com',
        phone: 9876543210,
        password: 'password123',
        role: 'Employer'
      });
      console.log('✅ Test employer created');
    }
    
    console.log(`Using employer: ${employer.name} (${employer._id})`);
    
    // Optional: Clear existing jobs
    // await Job.deleteMany({});
    // console.log('Cleared existing jobs');
    
    const jobs = [];
    
    for (let i = 0; i < 50; i++) {
      const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const salary = generateSalary();
      
      const job = {
        title,
        description,
        category,
        country,
        city,
        location,
        ...salary,
        expired: false,
        postedBy: employer._id,
        jobPostedOn: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000)
      };
      
      jobs.push(job);
    }
    
    const result = await Job.insertMany(jobs);
    console.log(`✅ Successfully added ${result.length} jobs!`);
    console.log('\n🎉 Your jobs collection now has 50+ jobs!');
    
  } catch (error) {
    console.error('❌ Error seeding jobs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedJobs();