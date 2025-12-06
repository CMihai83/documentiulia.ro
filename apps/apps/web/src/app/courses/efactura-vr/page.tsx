'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// A-Frame JSX type declarations
type AFrameProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  [key: string]: unknown;
};

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': AFrameProps;
      'a-sky': AFrameProps;
      'a-plane': AFrameProps;
      'a-box': AFrameProps;
      'a-text': AFrameProps;
      'a-entity': AFrameProps;
      'a-camera': AFrameProps;
      'a-light': AFrameProps;
    }
  }
}

/**
 * VR e-Factura Course Module
 * Interactive 3D/VR course for learning Romanian e-Factura regulations
 * Uses A-Frame for WebXR compatibility
 */

interface LessonStep {
  id: string;
  title: string;
  content: string;
  vrScene: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}

const EFACTURA_LESSONS: LessonStep[] = [
  {
    id: 'intro',
    title: '1. Introducere în e-Factura',
    content: `
      e-Factura este sistemul electronic de facturare obligatoriu în România.

      Implementat prin OUG 120/2021, sistemul permite transmiterea facturilor
      în format XML către ANAF prin Spațiul Privat Virtual (SPV).

      Din 2024, e-Factura B2B este obligatorie pentru toate tranzacțiile
      între persoane juridice.
    `,
    vrScene: 'intro-scene',
    quiz: {
      question: 'Când a devenit e-Factura B2B obligatorie în România?',
      options: ['2022', '2023', '2024', '2025'],
      correctIndex: 2,
    },
  },
  {
    id: 'structure',
    title: '2. Structura unei e-Facturi',
    content: `
      O e-Factură conține următoarele elemente principale:

      • Header: Informații despre emitent și destinatar
      • Linii de factură: Produse/servicii facturate
      • Totaluri: Subtotal, TVA, Total
      • Metadate: Semnătură digitală, timestamp

      Formatul utilizat este UBL 2.1 (Universal Business Language).
    `,
    vrScene: 'structure-scene',
    quiz: {
      question: 'Ce format standard folosește e-Factura?',
      options: ['JSON', 'CSV', 'UBL 2.1', 'PDF/A'],
      correctIndex: 2,
    },
  },
  {
    id: 'vat-codes',
    title: '3. Coduri TVA în e-Factura',
    content: `
      Cotele TVA din August 2025 (Legea 141/2025):

      • Cota A: 21% - Standard
      • Cota B: 11% - Redusă (alimente, medicamente)
      • Cota C: 5% - Super-redusă (locuințe sociale)
      • Cota D: 0% - Scutit (exporturi)

      Fiecare linie de factură trebuie să specifice codul TVA corect.
    `,
    vrScene: 'vat-scene',
    quiz: {
      question: 'Care este cota TVA standard din August 2025?',
      options: ['19%', '20%', '21%', '22%'],
      correctIndex: 2,
    },
  },
  {
    id: 'submission',
    title: '4. Transmiterea e-Facturii',
    content: `
      Pașii pentru transmiterea unei e-Facturi:

      1. Generare XML în format UBL 2.1
      2. Validare locală (schema XSD)
      3. Semnare digitală (opțional)
      4. Upload în SPV sau API ANAF
      5. Primire confirmare (ID unic)

      Termenul limită: 5 zile de la emiterea facturii.
    `,
    vrScene: 'submission-scene',
    quiz: {
      question: 'În câte zile trebuie transmisă e-Factura după emitere?',
      options: ['1 zi', '3 zile', '5 zile', '10 zile'],
      correctIndex: 2,
    },
  },
  {
    id: 'penalties',
    title: '5. Sancțiuni pentru neconformitate',
    content: `
      Penalități pentru nerespectarea obligațiilor e-Factura:

      • Netransmitere: 5.000 - 10.000 RON
      • Transmitere cu erori grave: 2.500 - 5.000 RON
      • Depășire termen: 1.000 - 2.500 RON

      Recomandare: Validați facturile înainte de transmitere
      și păstrați evidența confirmărilor ANAF.
    `,
    vrScene: 'penalties-scene',
    quiz: {
      question: 'Care este amenda maximă pentru netransmiterea e-Facturii?',
      options: ['5.000 RON', '10.000 RON', '15.000 RON', '20.000 RON'],
      correctIndex: 1,
    },
  },
];

export default function EFacturaVRCourse() {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [vrMode, setVrMode] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [aframeLoaded, setAframeLoaded] = useState(false);

  const lesson = EFACTURA_LESSONS[currentLesson];

  const handleQuizSubmit = () => {
    if (quizAnswer === lesson.quiz?.correctIndex) {
      setScore(score + 1);
    }
    setShowQuiz(false);
    setQuizAnswer(null);
    if (currentLesson < EFACTURA_LESSONS.length - 1) {
      setCurrentLesson(currentLesson + 1);
    }
  };

  const resetCourse = () => {
    setCurrentLesson(0);
    setScore(0);
    setShowQuiz(false);
    setQuizAnswer(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* A-Frame Script */}
      <Script
        src="https://aframe.io/releases/1.4.0/aframe.min.js"
        onLoad={() => setAframeLoaded(true)}
      />

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Curs VR e-Factura
            </h1>
            <p className="text-blue-300 text-sm">
              Învață reglementările e-Factura în realitate virtuală
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white">
              <span className="text-blue-300">Scor:</span> {score}/{EFACTURA_LESSONS.length}
            </div>
            <button
              onClick={() => setVrMode(!vrMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                vrMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {vrMode ? 'Exit VR' : 'Enter VR'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-blue-300 mb-2">
            <span>Lecția {currentLesson + 1} din {EFACTURA_LESSONS.length}</span>
            <span>{Math.round((currentLesson / EFACTURA_LESSONS.length) * 100)}% completat</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${((currentLesson + 1) / EFACTURA_LESSONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VR Scene */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {aframeLoaded && vrMode ? (
              <div className="aspect-video">
                <a-scene
                  embedded
                  vr-mode-ui="enabled: true"
                  className="w-full h-full"
                >
                  {/* Sky */}
                  <a-sky color="#1a1a2e" />

                  {/* Ground */}
                  <a-plane
                    position="0 0 0"
                    rotation="-90 0 0"
                    width="20"
                    height="20"
                    color="#16213e"
                  />

                  {/* Floating e-Factura document */}
                  <a-box
                    position="0 1.5 -3"
                    rotation="0 45 0"
                    width="2"
                    height="2.8"
                    depth="0.1"
                    color="#4a90d9"
                    animation="property: rotation; to: 0 405 0; loop: true; dur: 10000; easing: linear"
                  >
                    <a-text
                      value="e-FACTURA"
                      position="0 0.8 0.06"
                      align="center"
                      color="#ffffff"
                      width="1.5"
                    />
                    <a-text
                      value={`Lecția ${currentLesson + 1}`}
                      position="0 0.4 0.06"
                      align="center"
                      color="#88ccff"
                      width="1.2"
                    />
                  </a-box>

                  {/* VAT Rate indicators */}
                  {lesson.id === 'vat-codes' && (
                    <>
                      <a-box position="-2 1 -4" color="#22c55e" depth="0.5" height="2.1" width="0.5">
                        <a-text value="21%" position="0 0 0.26" align="center" color="#fff" width="2" />
                      </a-box>
                      <a-box position="-1 1 -4" color="#3b82f6" depth="0.5" height="1.1" width="0.5">
                        <a-text value="11%" position="0 0 0.26" align="center" color="#fff" width="2" />
                      </a-box>
                      <a-box position="0 1 -4" color="#f59e0b" depth="0.5" height="0.5" width="0.5">
                        <a-text value="5%" position="0 0 0.26" align="center" color="#fff" width="2" />
                      </a-box>
                      <a-box position="1 1 -4" color="#6b7280" depth="0.5" height="0.2" width="0.5">
                        <a-text value="0%" position="0 0 0.26" align="center" color="#fff" width="2" />
                      </a-box>
                    </>
                  )}

                  {/* Info panels */}
                  <a-entity position="-3 2 -2" rotation="0 30 0">
                    <a-plane width="2" height="1" color="#2a2a4a" opacity="0.9">
                      <a-text
                        value="ANAF SPV"
                        position="0 0.2 0.01"
                        align="center"
                        color="#88ff88"
                        width="1.5"
                      />
                      <a-text
                        value="Portal Transmitere"
                        position="0 -0.1 0.01"
                        align="center"
                        color="#ffffff"
                        width="1.2"
                      />
                    </a-plane>
                  </a-entity>

                  {/* Camera */}
                  <a-entity position="0 1.6 0">
                    <a-camera look-controls wasd-controls />
                  </a-entity>

                  {/* Ambient light */}
                  <a-light type="ambient" color="#404060" />
                  <a-light type="directional" position="1 2 1" intensity="0.8" />
                </a-scene>
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🥽</div>
                  <p className="text-white text-lg">
                    Click &quot;Enter VR&quot; pentru experiența 3D
                  </p>
                  <p className="text-blue-300 text-sm mt-2">
                    Compatibil cu Oculus, HTC Vive, și browsere WebXR
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Content */}
          <div className="space-y-6">
            {/* Lesson Card */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                {lesson.title}
              </h2>
              <div className="text-blue-100 whitespace-pre-line leading-relaxed">
                {lesson.content}
              </div>
            </div>

            {/* Quiz Section */}
            {showQuiz && lesson.quiz ? (
              <div className="bg-purple-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Quiz
                </h3>
                <p className="text-blue-100 mb-4">{lesson.quiz.question}</p>
                <div className="space-y-2">
                  {lesson.quiz.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setQuizAnswer(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        quizAnswer === index
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleQuizSubmit}
                  disabled={quizAnswer === null}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trimite Răspuns
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                {currentLesson > 0 && (
                  <button
                    onClick={() => setCurrentLesson(currentLesson - 1)}
                    className="flex-1 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20"
                  >
                    ← Lecția anterioară
                  </button>
                )}
                {currentLesson < EFACTURA_LESSONS.length - 1 ? (
                  <button
                    onClick={() => lesson.quiz ? setShowQuiz(true) : setCurrentLesson(currentLesson + 1)}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
                  >
                    {lesson.quiz ? 'Începe Quiz →' : 'Lecția următoare →'}
                  </button>
                ) : (
                  <button
                    onClick={resetCourse}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700"
                  >
                    Curs completat! Reia de la început
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lesson Navigation */}
        <div className="mt-8 grid grid-cols-5 gap-2">
          {EFACTURA_LESSONS.map((l, index) => (
            <button
              key={l.id}
              onClick={() => {
                setCurrentLesson(index);
                setShowQuiz(false);
              }}
              className={`p-3 rounded-lg text-center transition-all ${
                index === currentLesson
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : index < currentLesson
                  ? 'bg-green-600/30 text-green-300 border border-green-500/30'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="text-sm font-medium">Lecția {index + 1}</div>
            </button>
          ))}
        </div>

        {/* Course Summary */}
        <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Ce vei învăța în acest curs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">📄</div>
              <h4 className="text-white font-medium">Structura e-Facturii</h4>
              <p className="text-blue-200 text-sm">Format UBL 2.1 și elemente obligatorii</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">💰</div>
              <h4 className="text-white font-medium">Coduri TVA 2026</h4>
              <p className="text-blue-200 text-sm">Noile cote: 21%, 11%, 5%, 0%</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">📤</div>
              <h4 className="text-white font-medium">Transmitere ANAF</h4>
              <p className="text-blue-200 text-sm">Proces SPV și termene legale</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
