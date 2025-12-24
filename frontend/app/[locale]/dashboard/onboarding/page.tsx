'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Play,
  BookOpen,
  Settings,
  Users,
  FileText,
  CreditCard,
  Link2,
  Shield,
  Sparkles,
  Video,
  HelpCircle,
  Clock,
  Award,
  Target,
  Rocket,
} from 'lucide-react';

// Types
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'pending';
  time: string;
  link?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  completed: boolean;
  videoUrl?: string;
}

// Sample data
const onboardingSteps: OnboardingStep[] = [
  {
    id: 'step-1',
    title: 'Creare cont',
    description: 'Înregistrare și verificare email',
    icon: Users,
    status: 'completed',
    time: '2 min',
  },
  {
    id: 'step-2',
    title: 'Configurare companie',
    description: 'Date fiscale, CUI, adresă',
    icon: Settings,
    status: 'completed',
    time: '5 min',
  },
  {
    id: 'step-3',
    title: 'Conectare ANAF',
    description: 'Autorizare SPV pentru e-Factura',
    icon: Link2,
    status: 'completed',
    time: '10 min',
  },
  {
    id: 'step-4',
    title: 'Prima factură',
    description: 'Creează și trimite prima factură',
    icon: FileText,
    status: 'current',
    time: '3 min',
    link: '/dashboard/invoices/new',
  },
  {
    id: 'step-5',
    title: 'Adaugă clienți',
    description: 'Import sau creare manuală clienți',
    icon: Users,
    status: 'pending',
    time: '5 min',
  },
  {
    id: 'step-6',
    title: 'Configurare plăți',
    description: 'Conectare cont bancar sau Stripe',
    icon: CreditCard,
    status: 'pending',
    time: '5 min',
  },
  {
    id: 'step-7',
    title: 'Invită echipa',
    description: 'Adaugă colaboratori și setează permisiuni',
    icon: Users,
    status: 'pending',
    time: '3 min',
  },
  {
    id: 'step-8',
    title: 'Activare AI',
    description: 'Configurare asistent AI pentru automatizări',
    icon: Sparkles,
    status: 'pending',
    time: '2 min',
  },
];

const tutorials: Tutorial[] = [
  {
    id: 'tut-1',
    title: 'Cum să creezi prima factură',
    description: 'Ghid complet pentru emiterea facturilor',
    duration: '5:30',
    category: 'Facturare',
    completed: true,
    videoUrl: '#',
  },
  {
    id: 'tut-2',
    title: 'Conectare e-Factura ANAF',
    description: 'Pași pentru autorizare SPV',
    duration: '8:15',
    category: 'Integrări',
    completed: true,
    videoUrl: '#',
  },
  {
    id: 'tut-3',
    title: 'Import clienți din Excel',
    description: 'Migrare rapidă bază de date',
    duration: '4:00',
    category: 'Clienți',
    completed: false,
    videoUrl: '#',
  },
  {
    id: 'tut-4',
    title: 'Rapoarte TVA automate',
    description: 'Configurare deconturi TVA',
    duration: '6:45',
    category: 'Fiscalitate',
    completed: false,
    videoUrl: '#',
  },
  {
    id: 'tut-5',
    title: 'Utilizare AI Assistant',
    description: 'Automatizări și predicții',
    duration: '7:20',
    category: 'AI',
    completed: false,
    videoUrl: '#',
  },
  {
    id: 'tut-6',
    title: 'Gestionare echipă',
    description: 'Roluri și permisiuni utilizatori',
    duration: '5:00',
    category: 'Administrare',
    completed: false,
    videoUrl: '#',
  },
];

const quickActions = [
  { title: 'Emite factură', icon: FileText, link: '/dashboard/invoices/new', color: 'bg-blue-100 text-blue-600' },
  { title: 'Adaugă client', icon: Users, link: '/dashboard/crm/new', color: 'bg-green-100 text-green-600' },
  { title: 'Vezi rapoarte', icon: Target, link: '/dashboard/reports', color: 'bg-purple-100 text-purple-600' },
  { title: 'Setări cont', icon: Settings, link: '/dashboard/settings', color: 'bg-orange-100 text-orange-600' },
];

export default function OnboardingPage() {
  const completedSteps = onboardingSteps.filter((s) => s.status === 'completed').length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const completedTutorials = tutorials.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bine ai venit!</h1>
          <p className="text-muted-foreground">
            Completează pașii de mai jos pentru a configura complet contul
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progres onboarding</p>
            <p className="text-2xl font-bold">{progressPercent}%</p>
          </div>
          <div className="h-16 w-16">
            <svg className="transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${progressPercent}, 100`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Configurare cont</h2>
              <p className="text-muted-foreground">
                {completedSteps} din {totalSteps} pași completați
              </p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Onboarding Steps */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pași de configurare</CardTitle>
              <CardDescription>Completează toți pașii pentru a debloca toate funcționalitățile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 rounded-lg p-4 ${
                      step.status === 'current' ? 'bg-primary/5 border border-primary/20' : 'border'
                    }`}
                  >
                    <div className={`rounded-full p-2 ${
                      step.status === 'completed' ? 'bg-green-100' :
                      step.status === 'current' ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <step.icon className={`h-5 w-5 ${step.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium ${step.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.time}
                          </Badge>
                          {step.status === 'current' && (
                            <Button size="sm">
                              Începe
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          )}
                          {step.status === 'completed' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completat
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acțiuni rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    <div className={`rounded-lg p-2 ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs">{action.title}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Realizări
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Prima conectare</p>
                    <p className="text-xs text-muted-foreground">Ai creat contul</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">ANAF conectat</p>
                    <p className="text-xs text-muted-foreground">Integrare SPV activă</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Prima factură</p>
                    <p className="text-xs text-muted-foreground">În așteptare</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tutorials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Tutoriale video
              </CardTitle>
              <CardDescription>
                {completedTutorials} din {tutorials.length} vizionate
              </CardDescription>
            </div>
            <Button variant="outline">
              <Video className="mr-2 h-4 w-4" />
              Vezi toate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((tutorial) => (
              <Card key={tutorial.id} className={tutorial.completed ? 'opacity-60' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{tutorial.category}</Badge>
                    {tutorial.completed && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <h3 className="font-medium">{tutorial.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tutorial.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.duration}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      {tutorial.completed ? 'Revezi' : 'Vizionează'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Ai nevoie de ajutor?</h3>
                <p className="text-sm text-muted-foreground">
                  Echipa noastră de suport este disponibilă 24/7
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Documentație</Button>
              <Button>Contactează suport</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
