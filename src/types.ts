export interface StudentRecord {
  id: string; // Token printed on card or in QR URL
  name: string;
  nameBn?: string;
  regNo: string;
  photoUrl: string;
  status: 'CURRENT STUDENT' | 'ALUMNI / COMPLETED' | 'EXPIRED / SUSPENDED';
  statusBn: string;
  lastUpdated: string;
  lastUpdatedBn: string;
  subject: string;
  subjectBn?: string;
  faculty: string;
  facultyBn?: string;
  degree: string;
  degreeBn?: string;
  session: string;
  hall: string;
  hallBn?: string;
  duidCode: string;
  admissionRoll: string;
  issueDate: string;
  nationalIdMasked: string;
}

export const INITIAL_STUDENTS_DATABASE: Record<string, StudentRecord> = {
  Puuea1cDa2owvsfOu: {
    id: 'Puuea1cDa2owvsfOu',
    name: 'NYMUL HOSSAIN',
    regNo: '2021281178',
    photoUrl: '/assets/aistudio/nymul_hossain.png',
    status: 'CURRENT STUDENT',
    statusBn: 'বর্তমান শিক্ষার্থী',
    lastUpdated: 'Nov 12, 2026',
    lastUpdatedBn: '১২ নভেম্বর, ২০২৬',
    subject: 'Computer Science & Engineering',
    subjectBn: 'কম্পিউটার বিজ্ঞান ও প্রকৌশল',
    faculty: 'Faculty of Engineering & Technology',
    facultyBn: 'ইঞ্জিনিয়ারিং ও প্রযুক্তি অনুষদ',
    degree: 'Bachelor of Science in CSE',
    degreeBn: 'বি.এস.সি ইন সিএসই',
    session: '2021-2022',
    hall: 'Shahidullah Hall',
    hallBn: 'শহীদুল্লাহ হল',
    duidCode: 'DUID<<<2021281178<<<NYMUL HOSSAIN<<<US',
    admissionRoll: '54384',
    issueDate: '03-01-2025 (16:32)',
    nationalIdMasked: '•••• •••• •••• 67887',
  },
};

export const STORAGE_KEY = 'du_students_database_v4_nymul';

export const formatDateToDisplay = (dateObj: Date): { en: string; bn: string } => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsBn = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];
  const month = months[dateObj.getMonth()];
  const monthBn = monthsBn[dateObj.getMonth()];
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  return {
    en: `${month} ${day < 10 ? '0' + day : day}, ${year}`,
    bn: `${day} ${monthBn}, ${year}`,
  };
};
