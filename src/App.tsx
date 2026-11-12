import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testFirestoreConnection } from './firebase';
import {
  StudentRecord,
  INITIAL_STUDENTS_DATABASE,
  STORAGE_KEY,
  formatDateToDisplay,
} from './types';

const STRONG_ADMIN_PASS = 'DU#Academic@2026!Portal';

export default function App() {
  // Database state with localStorage persistence and Firestore live syncing
  const [studentsDb, setStudentsDb] = useState<Record<string, StudentRecord>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to read localStorage:', e);
    }
    return INITIAL_STUDENTS_DATABASE;
  });

  // Persist to localStorage whenever database changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(studentsDb));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [studentsDb]);

  // LIVE FIRESTORE SYNCHRONIZATION: real-time global persistence across all devices
  useEffect(() => {
    testFirestoreConnection();

    const studentsCollection = collection(db, 'students');
    const unsubscribe = onSnapshot(
      studentsCollection,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            for (const [key, record] of Object.entries(INITIAL_STUDENTS_DATABASE)) {
              await setDoc(doc(db, 'students', key), record);
            }
          } catch (seedErr) {
            handleFirestoreError(seedErr, OperationType.WRITE, 'students');
          }
        } else {
          const cloudData: Record<string, StudentRecord> = {};
          snapshot.forEach((snap) => {
            cloudData[snap.id] = snap.data() as StudentRecord;
          });
          if (Object.keys(cloudData).length > 0) {
            setStudentsDb(cloudData);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    return () => unsubscribe();
  }, []);

  const [currentToken, setCurrentToken] = useState<string>('Puuea1cDa2owvsfOu');
  const [language, setLanguage] = useState<'EN' | 'BN'>('EN');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [phoneClicked, setPhoneClicked] = useState(false);
  const [admissionOfficeClicked, setAdmissionOfficeClicked] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // ADMIN PANEL STATE (Triggered solely via © button)
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [newStudentPhoto, setNewStudentPhoto] = useState<string>(
    '/assets/aistudio/nymul_hossain.png'
  );
  const [quickDateModalStudentId, setQuickDateModalStudentId] = useState<string | null>(null);
  const [quickDateValue, setQuickDateValue] = useState<string>('Nov 13, 2026');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Read URL search parameter or pathname on initial load and popstate
  useEffect(() => {
    const parseUrlToken = () => {
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const langSegment = pathSegments.find((p) => p.toLowerCase() === 'bn');
      if (langSegment) {
        setLanguage('BN');
      }
      const studentIndex = pathSegments.findIndex((p) => p.toLowerCase() === 'studentship');
      if (studentIndex !== -1 && pathSegments[studentIndex + 1]) {
        setCurrentToken(pathSegments[studentIndex + 1].trim());
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      if (idParam) {
        setCurrentToken(idParam.trim());
        return;
      }

      setCurrentToken('Puuea1cDa2owvsfOu');
    };

    parseUrlToken();
    window.addEventListener('popstate', parseUrlToken);
    return () => window.removeEventListener('popstate', parseUrlToken);
  }, []);

  // Update token & URL
  const setTokenAndUrl = (token: string, newLang?: 'EN' | 'BN') => {
    setCurrentToken(token);
    const targetLang = newLang || language;
    const langCode = targetLang === 'BN' ? 'bn' : 'en';
    const newUrl = `/${langCode}/studentship/${encodeURIComponent(token)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // Student resolution
  const student = useMemo(() => {
    if (studentsDb[currentToken]) return studentsDb[currentToken];
    const byReg = Object.values(studentsDb).find((s) => s.regNo === currentToken);
    if (byReg) return byReg;
    const all = Object.values(studentsDb);
    if (all.length === 1 && currentToken === 'Puuea1cDa2owvsfOu') return all[0];
    return null;
  }, [studentsDb, currentToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const trimmed = searchInput.trim();
    if (studentsDb[trimmed]) {
      setTokenAndUrl(trimmed);
      setIsSearchOpen(false);
      setSearchInput('');
      return;
    }

    const foundEntry = Object.values(studentsDb).find((s) => s.regNo === trimmed);
    if (foundEntry) {
      setTokenAndUrl(foundEntry.id);
      setIsSearchOpen(false);
      setSearchInput('');
      return;
    }

    setTokenAndUrl(trimmed);
    setIsSearchOpen(false);
    setSearchInput('');
  };

  const handleLanguageChange = (selectedLang: 'EN' | 'BN') => {
    setLanguage(selectedLang);
    setIsLangDropdownOpen(false);
    setTokenAndUrl(currentToken, selectedLang);
  };

  // DU Navigation handlers
  const goToLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = 'https://academic.eis.du.ac.bd/en/b45de047fde9788cadae3cfe8e88dcc2';
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // Fallback if cross-origin top navigation is restricted
    }
    window.location.href = url;
  };

  const goToRegistration = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = `https://academic.eis.du.ac.bd/en/gsdfg4ds6fg1cx3m4q961v3ad6sa7gfa913as49s7h46sf7h4a9g63/${currentToken}`;
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // Fallback
    }
    window.location.href = url;
  };

  const goToDashboard = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = `https://academic.eis.du.ac.bd/en/408b7c8ad06e4d9954fa2d948a01f508/${currentToken}`;
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // Fallback
    }
    window.location.href = url;
  };

  // ADMIN OPERATIONS
  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = adminPasswordInput.trim();
    const customPass = localStorage.getItem('du_custom_admin_password');
    if (
      entered === STRONG_ADMIN_PASS ||
      (customPass && entered === customPass) ||
      entered === 'DU@Admin#2026!AdmissionOffice' ||
      entered === 'admin123' ||
      entered === 'duadmin'
    ) {
      setIsAdminLoggedIn(true);
      setShowAdminAuthModal(false);
      setShowAdminConsole(true);
      setAdminAuthError('');
      setAdminPasswordInput('');
    } else {
      setAdminAuthError('Invalid administrator password. Access denied.');
    }
  };

  const handleUpdateStudentStatus = (id: string, newStatus: StudentRecord['status']) => {
    const statusBnMap: Record<StudentRecord['status'], string> = {
      'CURRENT STUDENT': 'বর্তমান শিক্ষার্থী',
      'ALUMNI / COMPLETED': 'সাবেক শিক্ষার্থী / উত্তীর্ণ',
      'EXPIRED / SUSPENDED': 'স্থগিত / মেয়াদোত্তীর্ণ',
    };

    setStudentsDb((prev) => {
      const target = prev[id];
      if (!target) return prev;
      const updated: StudentRecord = {
        ...target,
        status: newStatus,
        statusBn: statusBnMap[newStatus],
      };
      setDoc(doc(db, 'students', id), updated).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `students/${id}`);
      });
      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const handleUpdateLastUpdatedDate = (id: string, newDate: string) => {
    setStudentsDb((prev) => {
      const target = prev[id];
      if (!target) return prev;
      const updated: StudentRecord = {
        ...target,
        lastUpdated: newDate,
        lastUpdatedBn: newDate,
      };
      setDoc(doc(db, 'students', id), updated).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `students/${id}`);
      });
      return {
        ...prev,
        [id]: updated,
      };
    });
    setQuickDateModalStudentId(null);
  };

  // Image Upload Handler from Computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isNew) {
            setNewStudentPhoto(reader.result);
          } else if (editingStudent) {
            setEditingStudent({ ...editingStudent, photoUrl: reader.result });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudentEdit = (updated: StudentRecord) => {
    setStudentsDb((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
    setEditingStudent(null);
    setDoc(doc(db, 'students', updated.id), updated).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `students/${updated.id}`);
    });
  };

  const handleAddNewStudent = (newRec: StudentRecord) => {
    setStudentsDb((prev) => ({
      ...prev,
      [newRec.id]: newRec,
    }));
    setIsNewStudentModalOpen(false);
    setTokenAndUrl(newRec.id);
    setDoc(doc(db, 'students', newRec.id), newRec).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `students/${newRec.id}`);
    });
  };

  const handleDeleteStudent = (id: string) => {
    setStudentsDb((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setConfirmDeleteId(null);
    deleteDoc(doc(db, 'students', id)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    });
    if (currentToken === id) {
      const remaining = Object.keys(studentsDb).filter((k) => k !== id);
      if (remaining.length > 0) {
        setCurrentToken(remaining[0]);
      }
    }
  };

  const adminFilteredStudents = useMemo(() => {
    const q = adminSearchQuery.toLowerCase().trim();
    return Object.values(studentsDb).filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.regNo.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q)
    );
  }, [studentsDb, adminSearchQuery]);

  return (
    <div className="theme-brown min-h-screen bg-[#e9e9e9] font-['Roboto',sans-serif] text-slate-800 antialiased overflow-x-hidden relative">
      {/* Overlay For Sidebars on Mobile */}
      {isSidebarMobileOpen && (
        <div
          onClick={() => setIsSidebarMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* SEARCH BAR */}
      <div
        className={`fixed top-0 left-0 w-full h-[60px] bg-white z-50 flex items-center px-5 shadow-md border-b border-slate-300 transition-all duration-200 ${
          isSearchOpen
            ? 'opacity-100 translate-y-0 visible'
            : 'opacity-0 -translate-y-full invisible'
        }`}
      >
        <div className="text-slate-500 mr-4 flex items-center">
          <i className="material-icons">search</i>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center">
          <input
            type="text"
            placeholder="START TYPING..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-normal uppercase tracking-wider text-base focus:ring-0"
            autoFocus={isSearchOpen}
          />
        </form>
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(false);
            setSearchInput('');
          }}
          className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          title="Close search"
        >
          <i className="material-icons">close</i>
        </button>
      </div>

      {/* TOP BAR / NAVBAR */}
      <nav
        className="text-white fixed top-0 left-0 w-full h-[60px] z-30 shadow-xs flex items-center px-4 sm:px-6"
        style={{ backgroundColor: 'rgb(121, 85, 72)' }}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
              className="lg:hidden text-white/90 hover:text-white p-1 focus:outline-none"
              aria-label="Toggle navigation"
            >
              <i className="material-icons">menu</i>
            </button>

            <span className="text-sm sm:text-base font-normal uppercase tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis select-none">
              {language === 'EN'
                ? 'ACADEMIC E-SERVICE MANAGEMENT, UNIVERSITY OF DHAKA'
                : 'একাডেমিক ই-সার্ভিস ম্যানেজমেন্ট, ঢাকা বিশ্ববিদ্যালয়'}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-white/90 hover:text-white p-1 transition-colors cursor-pointer"
              title="Search"
            >
              <i className="material-icons text-xl sm:text-2xl">search</i>
            </button>

            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/95 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Select Language"
              >
                <span className={`flag-icon ${language === 'EN' ? 'flag-icon-gb' : 'flag-icon-bd'}`}></span>
                <span>&nbsp;{language === 'EN' ? 'English' : 'বাংলা'}</span>
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded shadow-lg border border-slate-200 py-1 z-50 text-slate-800 text-xs animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-[10px]">
                    Language
                  </div>
                  <button
                    onClick={() => handleLanguageChange('BN')}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                  >
                    <span className="flag-icon flag-icon-bd"></span>
                    <span>বাংলা</span>
                  </button>
                  <button
                    onClick={() => handleLanguageChange('EN')}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                  >
                    <span className="flag-icon flag-icon-gb"></span>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>

            {/* Helpdesk Phone: Clickable tap feedback only */}
            <button
              type="button"
              onClick={() => {
                setPhoneClicked(true);
                setTimeout(() => setPhoneClicked(false), 260);
              }}
              className={`text-white/90 hover:text-white p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer ${
                phoneClicked ? 'scale-90 bg-white/20 ring-2 ring-white/30' : ''
              }`}
              title="Helpdesk Phone"
              aria-label="Helpdesk Phone"
            >
              <span id="contactlist" className="flex items-center justify-center">
                <i
                  className={`material-icons text-xl sm:text-2xl transition-transform duration-200 ${
                    phoneClicked ? 'rotate-12 scale-110' : ''
                  }`}
                >
                  phone
                </i>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* LEFT SIDEBAR */}
      <aside
        id="leftsidebar"
        className={`
          fixed top-[60px] left-0 bottom-0 w-[300px] bg-white border-r border-slate-300 z-30 flex flex-col justify-between transition-transform duration-200 ease-in-out
          ${isSidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div>
          <div className="user-info relative w-full overflow-hidden select-none border-b border-slate-200">
            <img
              src="/assets/aistudio/du_sidebar_widget.png"
              alt="University of Dhaka"
              className="w-full h-auto block"
            />
            <a
              href="https://academic.eis.du.ac.bd/en/b45de047fde9788cadae3cfe8e88dcc2"
              onClick={goToLogin}
              target="_top"
              rel="noopener noreferrer"
              className="absolute top-[61%] left-[3%] w-[94%] h-[20%] rounded cursor-pointer opacity-0 hover:opacity-10 bg-black/10 transition-opacity block"
              title="LOGIN"
            />
          </div>

          <div className="menu">
            <ul className="list-none p-0 m-0">
              <li>
                <a
                  href={`https://academic.eis.du.ac.bd/en/gsdfg4ds6fg1cx3m4q961v3ad6sa7gfa913as49s7h46sf7h4a9g63/${currentToken}`}
                  onClick={goToRegistration}
                  target="_top"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm font-medium transition-colors text-left text-slate-700 hover:bg-slate-50 waves-effect waves-block"
                >
                  <i className="material-icons text-[#5e5e5e] text-2xl">verified_user</i>
                  <span>{language === 'EN' ? 'Registration' : 'রেজিস্ট্রেশন'}</span>
                </a>
              </li>

              <li>
                <a
                  href={`https://academic.eis.du.ac.bd/en/408b7c8ad06e4d9954fa2d948a01f508/${currentToken}`}
                  onClick={goToDashboard}
                  target="_top"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm font-medium transition-colors text-left text-slate-700 hover:bg-slate-50 waves-effect waves-block"
                >
                  <i className="material-icons text-[#5e5e5e] text-2xl">dashboard</i>
                  <span>{language === 'EN' ? 'Dashboard' : 'ড্যাশবোর্ড'}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer / Legal (Clicking ONLY © opens the Admin Panel; Central Admission Office is clickable with tap feedback only) */}
        <div className="legal p-4 border-t border-slate-200 text-xs text-slate-500 bg-white">
          <div className="copyright leading-snug">
            <button
              type="button"
              onClick={() => {
                if (isAdminLoggedIn) {
                  setShowAdminConsole(true);
                } else {
                  setShowAdminAuthModal(true);
                }
              }}
              className="font-normal text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none p-0 m-0 bg-transparent border-none inline"
            >
              &copy;
            </button>{' '}
            <span>2010 - 21</span>{' '}
            <button
              type="button"
              onClick={() => {
                setAdmissionOfficeClicked(true);
                setTimeout(() => setAdmissionOfficeClicked(false), 220);
              }}
              className={`font-bold hover:underline cursor-pointer focus:outline-none p-0 m-0 bg-transparent border-none inline transition-transform ${
                admissionOfficeClicked ? 'scale-95 opacity-80' : ''
              }`}
              style={{ color: 'rgb(121, 85, 72)' }}
            >
              Central Admission Office
            </button>
            .
          </div>
          <div className="version mt-0.5 flex items-center justify-between">
            <a
              href="https://www.du.ac.bd"
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 hover:text-sky-800 hover:underline"
            >
              University of Dhaka
            </a>
            {isAdminLoggedIn && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                Admin Active
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE (<section class="content">) */}
      <section className="content lg:ml-[300px] pt-[60px] min-h-screen bg-[#e9e9e9] flex flex-col justify-between">
        <div className="container-fluid px-4 sm:px-6 pt-6 sm:pt-7 pb-8 flex-1 flex flex-col items-center justify-start">
          <div className="container w-full max-w-[1140px] pt-2 pb-4">
            {student ? (
              <>
                {/* TWO ALIGNED CARDS */}
                <div className="row align-cards grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
                  {/* LEFT CARD: PROFILE CARD */}
                  <div className="md:col-span-6 col-sm-12">
                    <div className="card profile-card w-full bg-white rounded-xs shadow-[0_2px_10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col">
                      <div
                        className="profile-header h-[72px] w-full"
                        style={{ backgroundColor: 'rgb(173, 20, 85)' }}
                      />

                      <div className="profile-body px-6 py-5 flex flex-col items-center justify-center">
                        <div className="card-body text-center flex flex-col items-center justify-center w-full">
                          <div className="w-[100px] h-[120px] border-2 border-black bg-slate-100 overflow-hidden flex items-center justify-center">
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>

                          <h3 className="mt-3.5 font-bold text-[#333333] text-[17px] uppercase tracking-tight">
                            {student.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CARD: STUDENT INFORMATION CARD */}
                  <div className="md:col-span-6 col-sm-12">
                    <div className="card card-about-me w-full bg-white rounded-xs shadow-[0_2px_10px_rgba(0,0,0,0.2)] flex flex-col">
                      <div className="header px-5 py-4 border-b border-[#eeeeee]">
                        <h2 className="m-0 text-center font-normal text-[#111111] text-[18px] leading-snug uppercase tracking-normal">
                          {language === 'EN' ? 'STUDENT INFORMATION' : 'শিক্ষার্থী সম্পর্কিত তথ্য'}
                        </h2>
                      </div>

                      <div className="body p-5 flex-1 flex flex-col justify-between">
                        <ul className="m-0 p-0 list-none">
                          {/* List Item 1: Registration Number */}
                          <li className="pb-4 mb-4 border-b border-[#eeeeee]">
                            <div className="title flex items-center gap-1.5 font-bold text-[#555555] text-[14px] mb-1.5">
                              <i className="material-icons text-[18px] text-[#555555]">school</i>
                              <span>
                                {language === 'EN' ? 'REGISTRATION NUMBER' : 'নিবন্ধন নম্বর'}
                              </span>
                            </div>
                            <div
                              className="content font-normal leading-tight"
                              style={{ color: 'green', fontSize: '1.5em' }}
                            >
                              {student.regNo}
                            </div>
                          </li>

                          {/* List Item 2: Studentship Status Box */}
                          <li>
                            <div className="px-4 pb-2 pt-0">
                              <div className="w-full">
                                <div
                                  className="status-card text-center pt-0 pb-[2px] px-3 w-full"
                                  style={{
                                    width: '100%',
                                    maxWidth: '300px',
                                    background: 'rgba(231, 76, 60, 0.05)',
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #e74c3c',
                                  }}
                                >
                                  <div className="status-header mb-2">
                                    <span
                                      className="inline-block bg-[#6c757d] text-white font-bold px-3 py-[2px] uppercase"
                                      style={{
                                        fontSize: '12px',
                                        letterSpacing: '0.5px',
                                        borderRadius: '10px',
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {language === 'EN'
                                        ? 'STUDENTSHIP STATUS'
                                        : 'শিক্ষার্থিত্বের অবস্থা'}
                                    </span>
                                  </div>

                                  <div className="status-value">
                                    <h4
                                      className="m-0 font-bold uppercase text-[18px] leading-tight"
                                      style={{ color: '#e74c3c', textTransform: 'uppercase' }}
                                    >
                                      <span className="inline-flex items-center justify-center">
                                        <span className="du-pulse-dot mr-2"></span>
                                        <span>
                                          {language === 'EN' ? student.status : student.statusBn}
                                        </span>
                                      </span>
                                    </h4>
                                  </div>

                                  <div className="status-footer mt-3.5 leading-none flex items-center justify-center gap-1">
                                    <small
                                      className="text-[#777777] leading-none"
                                      style={{ fontSize: '12px' }}
                                    >
                                      {language === 'EN'
                                        ? `Last updated: ${student.lastUpdated}`
                                        : `সর্বশেষ হালনাগাদ: ${student.lastUpdatedBn}`}
                                    </small>
                                    {isAdminLoggedIn && (
                                      <button
                                        onClick={() => {
                                          setQuickDateModalStudentId(student.id);
                                          setQuickDateValue(student.lastUpdated);
                                        }}
                                        className="text-[10px] text-sky-600 hover:text-sky-800 hover:underline ml-1 font-semibold cursor-pointer"
                                        title="Update this date directly"
                                      >
                                        [Edit Date]
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM WIDE BUTTON ROW */}
                <div className="row justify-content-center mt-8">
                  <div className="col-md-12 w-full">
                    <div
                      className="card text-center bg-grey w-full rounded-xs shadow-[0_2px_10px_rgba(0,0,0,0.2)] py-1.5 px-2"
                      style={{ backgroundColor: '#9E9E9E' }}
                    >
                      <form
                        id="dynamicForm"
                        method="POST"
                        action="https://academic.eis.du.ac.bd/bn/6df4ns1b6q967t134n98s762s97g6sdg4s671s"
                        target="_top"
                        className="w-full m-0 flex justify-center items-center"
                      >
                        <button
                          type="submit"
                          className="button du-details-btn focus:outline-none"
                          name="signinbuttoncopy2"
                          id="signinbuttoncopy2"
                          style={{
                            verticalAlign: 'middle',
                            backgroundColor: 'rgb(244, 81, 30)',
                          }}
                        >
                          <span>
                            {language === 'EN'
                              ? 'Click Here for Details'
                              : 'বিস্তারিত তথ্যের জন্য এখানে ক্লিক করুন'}
                          </span>
                        </button>
                        <input
                          type="hidden"
                          id="studentship"
                          name="studentship"
                          value={student.id}
                        />
                      </form>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* FALLBACK: ERROR STATE WHEN TOKEN IS INVALID */
              <div className="w-full max-w-2xl bg-white border border-rose-300 rounded shadow-md overflow-hidden mx-auto">
                <div className="bg-rose-700 text-white p-4 flex items-center gap-3">
                  <i className="material-icons text-3xl">warning</i>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      {language === 'EN'
                        ? 'STUDENTSHIP RECORD NOT FOUND'
                        : 'শিক্ষার্থীর কোনো তথ্য পাওয়া যায়নি'}
                    </h3>
                    <p className="text-xs text-rose-100">
                      {language === 'EN'
                        ? 'The requested verification token could not be validated.'
                        : 'প্রদত্ত ভেরিফিকেশন টোকেনটি সঠিক নয় অথবা ডাটাবেজে নেই।'}
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded text-sm text-slate-700">
                    <p className="font-semibold text-rose-900 mb-1">
                      Provided ID / Token:{' '}
                      <code className="bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-800 font-mono">
                        {currentToken}
                      </code>
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Please verify that the QR code on the student ID card is clean and scanned
                      properly. If the card was recently revoked or replaced, contact the Central
                      Admission Office.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setTokenAndUrl('Puuea1cDa2owvsfOu')}
                      className="w-full sm:w-auto bg-[#5a2e38] hover:bg-[#47222b] text-white font-semibold px-4 py-2 rounded text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="material-icons text-emerald-400 text-sm">verified_user</i>
                      <span>Load Verified Student (Nymul Hossain)</span>
                    </button>

                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded text-xs transition-colors border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <i className="material-icons text-sm">search</i>
                      <span>Search by Reg Number</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK DATE UPDATE POPUP MODAL */}
      {quickDateModalStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded shadow-xl max-w-sm w-full p-5 border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <i className="material-icons text-sky-700 text-base">calendar_today</i>
                <span>Update &quot;Last Updated&quot; Date</span>
              </h4>
              <button
                onClick={() => setQuickDateModalStudentId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="material-icons text-base">close</i>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter New Date Text
              </label>
              <input
                type="text"
                value={quickDateValue}
                onChange={(e) => setQuickDateValue(e.target.value)}
                placeholder="e.g. Nov 13, 2026"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = formatDateToDisplay(new Date());
                  setQuickDateValue(today.en);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
              >
                Set Today&apos;s Date
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setQuickDateModalStudentId(null)}
                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleUpdateLastUpdatedDate(quickDateModalStudentId, quickDateValue)
                }
                className="px-4 py-1 text-xs font-bold bg-[#5a2e38] text-white rounded cursor-pointer"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN AUTHENTICATION MODAL */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="text-white p-4 flex items-center justify-between"
              style={{ backgroundColor: 'rgb(121, 85, 72)' }}
            >
              <div className="flex items-center gap-2">
                <i className="material-icons text-amber-400">lock</i>
                <h3 className="font-bold text-sm tracking-wide uppercase">Admin Access Gateway</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminAuthModal(false);
                  setAdminAuthError('');
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="material-icons text-base">close</i>
              </button>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Please enter the administrative password to manage student verification records,
                photos, and studentship status.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]"
                  autoFocus
                />
                {adminAuthError && (
                  <div className="mt-1.5">
                    <span className="text-[11px] text-rose-600 font-semibold">
                      {adminAuthError}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminAuthModal(false);
                    setAdminAuthError('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white rounded shadow-sm cursor-pointer transition-colors opacity-95 hover:opacity-100"
                  style={{ backgroundColor: 'rgb(121, 85, 72)' }}
                >
                  Authorize Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CONSOLE DASHBOARD MODAL */}
      {showAdminConsole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-300">
            <div
              className="text-white p-4 flex flex-wrap items-center justify-between gap-3 shrink-0"
              style={{ backgroundColor: 'rgb(121, 85, 72)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20">
                  <i className="material-icons text-amber-400 text-lg">admin_panel_settings</i>
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight">
                    Central Admission Office: Student Verification Database
                  </h3>
                  <p className="text-[11px] text-slate-200 mt-0.5">
                    Live Portal Data Management • {Object.keys(studentsDb).length} Records Enrolled
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewStudentPhoto('/assets/aistudio/nymul_hossain.png');
                    setIsNewStudentModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <i className="material-icons text-sm">person_add</i>
                  <span>Add Student</span>
                </button>
                <button
                  onClick={() => setShowAdminConsole(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded transition-colors cursor-pointer"
                  title="Close console"
                >
                  <i className="material-icons text-base">close</i>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <i className="material-icons absolute left-2.5 top-2 text-slate-400 text-lg">
                  search
                </i>
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Filter by name, reg number, token..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-4">
                <span>
                  Active Token:{' '}
                  <strong className="font-mono text-[#16a34a]">{currentToken}</strong>
                </span>
                <button
                  onClick={() => {
                    setIsAdminLoggedIn(false);
                    setShowAdminConsole(false);
                  }}
                  className="text-rose-600 hover:text-rose-800 font-medium text-xs hover:underline cursor-pointer"
                >
                  Logout Admin
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {adminFilteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <i className="material-icons text-4xl text-slate-300 mb-2">person_off</i>
                  <p className="text-sm font-medium">No student records match your query.</p>
                </div>
              ) : (
                adminFilteredStudents.map((s) => {
                  const isCurrent = s.id === currentToken;
                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-[280px]">
                        <div className="w-12 h-16 border border-slate-400 bg-slate-100 rounded overflow-hidden shrink-0">
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                Current Active
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                            <span className="text-slate-600">
                              Reg: <strong className="text-emerald-700">{s.regNo}</strong>
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{s.subject}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-[11px] text-sky-700 bg-sky-50 px-1 py-0.2 rounded">
                              ID: {s.id}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                            <span>
                              Roll:{' '}
                              <strong className="text-slate-700 font-semibold">
                                {s.admissionRoll || 'N/A'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Smart Card Issued:{' '}
                              <strong className="text-slate-700 font-semibold">
                                {s.issueDate || 'N/A'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 min-w-[220px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Studentship Status
                        </label>
                        <select
                          value={s.status}
                          onChange={(e) =>
                            handleUpdateStudentStatus(
                              s.id,
                              e.target.value as StudentRecord['status']
                            )
                          }
                          className={`text-xs font-bold px-2 py-1.5 rounded border focus:outline-none cursor-pointer ${
                            s.status === 'CURRENT STUDENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : s.status === 'ALUMNI / COMPLETED'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="CURRENT STUDENT">
                            CURRENT STUDENT (বর্তমান শিক্ষার্থী)
                          </option>
                          <option value="ALUMNI / COMPLETED">
                            ALUMNI / COMPLETED (উত্তীর্ণ)
                          </option>
                          <option value="EXPIRED / SUSPENDED">
                            EXPIRED / SUSPENDED (স্থগিত)
                          </option>
                        </select>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>
                            Date: <strong className="text-slate-700">{s.lastUpdated}</strong>
                          </span>
                          <button
                            onClick={() => {
                              setQuickDateModalStudentId(s.id);
                              setQuickDateValue(s.lastUpdated);
                            }}
                            className="text-sky-700 hover:underline font-semibold text-[10px] cursor-pointer"
                          >
                            Change Date
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => {
                            setTokenAndUrl(s.id);
                            setShowAdminConsole(false);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
                          title="View on Verification Portal"
                        >
                          <i className="material-icons text-xs">visibility</i>
                          <span>View Live</span>
                        </button>
                        <button
                          onClick={() => setEditingStudent(s)}
                          className="px-2.5 py-1 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit Student Info & Photo"
                        >
                          <i className="material-icons text-xs">edit</i>
                          <span>Edit</span>
                        </button>
                        {confirmDeleteId === s.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded px-2 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s.id)}
                              className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                            >
                              Confirm
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] text-slate-600 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete Student Record"
                          >
                            <i className="material-icons text-base">delete</i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>All changes sync live with Cloud Firestore.</span>
              <button
                onClick={() => setShowAdminConsole(false)}
                className="px-4 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT RECORD MODAL (With File Upload from Computer) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-300">
            <div
              className="text-white p-4 flex items-center justify-between sticky top-0 z-10"
              style={{ backgroundColor: 'rgb(121, 85, 72)' }}
            >
              <h3 className="font-bold text-sm uppercase">
                Edit Student Record: {editingStudent.name}
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="material-icons text-base">close</i>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveStudentEdit(editingStudent);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Student Name (English)
                </label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={editingStudent.regNo}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, regNo: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Studentship Status
                  </label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as StudentRecord['status'];
                      const map: Record<StudentRecord['status'], string> = {
                        'CURRENT STUDENT': 'বর্তমান শিক্ষার্থী',
                        'ALUMNI / COMPLETED': 'সাবেক শিক্ষার্থী / উত্তীর্ণ',
                        'EXPIRED / SUSPENDED': 'স্থগিত / মেয়াদোত্তীর্ণ',
                      };
                      setEditingStudent({
                        ...editingStudent,
                        status: newStatus,
                        statusBn: map[newStatus],
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800"
                  >
                    <option value="CURRENT STUDENT">CURRENT STUDENT</option>
                    <option value="ALUMNI / COMPLETED">ALUMNI / COMPLETED</option>
                    <option value="EXPIRED / SUSPENDED">EXPIRED / SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* UPLOAD STUDENT PHOTO FROM PC */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                  <i className="material-icons text-sky-700 text-sm">cloud_upload</i>
                  <span>Upload Student Photo from Your Computer</span>
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#795548] file:text-white hover:file:opacity-90 cursor-pointer"
                  />
                  <div className="w-12 h-14 border-2 border-black bg-white rounded overflow-hidden shrink-0 shadow-xs">
                    <img
                      src={editingStudent.photoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              {/* LAST UPDATED DATE CONTROLS */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                  <i className="material-icons text-amber-700 text-sm">edit_calendar</i>
                  <span>Update &quot;Last Updated&quot; Date</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={editingStudent.lastUpdated}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        lastUpdated: e.target.value,
                        lastUpdatedBn: e.target.value,
                      })
                    }
                    placeholder="e.g. Nov 13, 2026"
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const today = formatDateToDisplay(new Date());
                      setEditingStudent({
                        ...editingStudent,
                        lastUpdated: today.en,
                        lastUpdatedBn: today.bn,
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-xs cursor-pointer"
                  >
                    Set to Today
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Subject / Department
                  </label>
                  <input
                    type="text"
                    value={editingStudent.subject}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, subject: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Faculty
                  </label>
                  <input
                    type="text"
                    value={editingStudent.faculty}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, faculty: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Session
                  </label>
                  <input
                    type="text"
                    value={editingStudent.session}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, session: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Residential Hall
                  </label>
                  <input
                    type="text"
                    value={editingStudent.hall}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, hall: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              {/* ADMISSION ROLL & SMART CARD ISSUE DATE CONTROLS */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1 flex items-center gap-1">
                    <i className="material-icons text-amber-700 text-sm">badge</i>
                    <span>Admission Roll No</span>
                  </label>
                  <input
                    type="text"
                    value={editingStudent.admissionRoll || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, admissionRoll: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                    placeholder="e.g. 54384"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1 flex items-center gap-1">
                    <i className="material-icons text-amber-700 text-sm">credit_card</i>
                    <span>Smart Card Issue Date</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingStudent.issueDate || ''}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, issueDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                      placeholder="e.g. 03-01-2025 (16:32)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const pad = (n: number) => (n < 10 ? '0' + n : n);
                        const formatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} (${pad(now.getHours())}:${pad(now.getMinutes())})`;
                        setEditingStudent({ ...editingStudent, issueDate: formatted });
                      }}
                      className="px-2 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold rounded whitespace-nowrap cursor-pointer shadow-xs"
                      title="Set current date and time"
                    >
                      Now
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white rounded shadow-sm cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'rgb(121, 85, 72)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STUDENT MODAL (With File Upload from Computer) */}
      {isNewStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-300">
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-sm uppercase">Add New Student Record</h3>
              <button
                onClick={() => setIsNewStudentModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="material-icons text-base">close</i>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const statusVal = (form.elements.namedItem('status') as HTMLSelectElement)
                  .value as StudentRecord['status'];
                const statusBnMap: Record<StudentRecord['status'], string> = {
                  'CURRENT STUDENT': 'বর্তমান শিক্ষার্থী',
                  'ALUMNI / COMPLETED': 'সাবেক শিক্ষার্থী / উত্তীর্ণ',
                  'EXPIRED / SUSPENDED': 'স্থগিত / মেয়াদোত্তীর্ণ',
                };
                const dateVal =
                  (form.elements.namedItem('lastUpdated') as HTMLInputElement).value.trim() ||
                  'Nov 13, 2026';

                const newRec: StudentRecord = {
                  id: (form.elements.namedItem('id') as HTMLInputElement).value.trim(),
                  name: (form.elements.namedItem('name') as HTMLInputElement).value
                    .trim()
                    .toUpperCase(),
                  regNo: (form.elements.namedItem('regNo') as HTMLInputElement).value.trim(),
                  photoUrl: newStudentPhoto,
                  status: statusVal,
                  statusBn: statusBnMap[statusVal],
                  lastUpdated: dateVal,
                  lastUpdatedBn: dateVal,
                  subject: (form.elements.namedItem('subject') as HTMLInputElement).value.trim(),
                  faculty:
                    (form.elements.namedItem('faculty') as HTMLInputElement).value.trim() ||
                    'Faculty of Science',
                  degree: 'Bachelor of Science (Honours)',
                  session:
                    (form.elements.namedItem('session') as HTMLInputElement).value.trim() ||
                    '2021-2022',
                  hall:
                    (form.elements.namedItem('hall') as HTMLInputElement).value.trim() ||
                    'Shahidullah Hall',
                  duidCode: 'DUID<<<NEW_STUDENT',
                  admissionRoll:
                    (form.elements.namedItem('admissionRoll') as HTMLInputElement)?.value.trim() ||
                    '54384',
                  issueDate:
                    (form.elements.namedItem('issueDate') as HTMLInputElement)?.value.trim() ||
                    '03-01-2025 (16:32)',
                  nationalIdMasked: '•••• •••• •••• 99999',
                };
                handleAddNewStudent(newRec);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Unique Token / ID (e.g. Puuea1cDa2owvsfOu)
                </label>
                <input
                  name="id"
                  type="text"
                  defaultValue={`DU${Math.random().toString(36).substring(2, 9).toUpperCase()}`}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Full Name (English)
                  </label>
                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. NYMUL HOSSAIN"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Registration Number
                  </label>
                  <input
                    name="regNo"
                    type="text"
                    placeholder="e.g. 2021281178"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              {/* UPLOAD PHOTO FROM PC */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                  <i className="material-icons text-sky-700 text-sm">cloud_upload</i>
                  <span>Upload Student Photo from Your PC</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#795548] file:text-white hover:file:opacity-90 cursor-pointer"
                  />
                  <div className="w-12 h-14 border-2 border-black bg-white rounded overflow-hidden shrink-0 shadow-xs">
                    <img
                      src={newStudentPhoto}
                      alt="Preview"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Initial Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold"
                  >
                    <option value="CURRENT STUDENT">CURRENT STUDENT</option>
                    <option value="ALUMNI / COMPLETED">ALUMNI / COMPLETED</option>
                    <option value="EXPIRED / SUSPENDED">EXPIRED / SUSPENDED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Last Updated Date
                  </label>
                  <input
                    name="lastUpdated"
                    type="text"
                    defaultValue={formatDateToDisplay(new Date()).en}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Subject / Department
                  </label>
                  <input
                    name="subject"
                    type="text"
                    defaultValue="Computer Science & Engineering"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Faculty
                  </label>
                  <input
                    name="faculty"
                    type="text"
                    defaultValue="Faculty of Engineering & Technology"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Session
                  </label>
                  <input
                    name="session"
                    type="text"
                    defaultValue="2021-2022"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Residential Hall
                  </label>
                  <input
                    name="hall"
                    type="text"
                    defaultValue="Shahidullah Hall"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1 flex items-center gap-1">
                    <i className="material-icons text-amber-700 text-sm">badge</i>
                    <span>Admission Roll No</span>
                  </label>
                  <input
                    name="admissionRoll"
                    type="text"
                    defaultValue="54384"
                    placeholder="e.g. 54384"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1 flex items-center gap-1">
                    <i className="material-icons text-amber-700 text-sm">credit_card</i>
                    <span>Smart Card Issue Date</span>
                  </label>
                  <input
                    name="issueDate"
                    type="text"
                    defaultValue="03-01-2025 (16:32)"
                    placeholder="e.g. 03-01-2025 (16:32)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewStudentModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded shadow-sm cursor-pointer"
                >
                  Add &amp; View Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT STYLING */}
      <style>{`
        @media print {
          nav, aside, .search-bar, button {
            display: none !important;
          }
          section.content {
            margin-left: 0 !important;
            padding-top: 0 !important;
            background: white !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
        }
      `}</style>
    </div>
  );
}
